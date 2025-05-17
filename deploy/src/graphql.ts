import { Construct } from "constructs";
import { parse } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigw2 from "aws-cdk-lib/aws-apigatewayv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Envelope } from "./envelope.js";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { Duration } from "aws-cdk-lib";
import { CorsHttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { BitcoinNetwork } from "./utils/types.js";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TableNames {
  readonly rbac: string;
  readonly userNonce: string;
  readonly funding: string;
  readonly claims: string;
  readonly openEditionClaims: string;
  readonly user: string;
  readonly uploads: string;
  readonly wallet: string;
}

interface ConfigEnv {
  INSCRIPTION_BUCKET: string;
  UPLOAD_BUCKET: string;
  FUNDING_TABLE_STREAM_ARN: string;
  FUNDING_STREAM_REGION: string;
  PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID: string;
  FUNDING_SEC_KEY_ENVELOPE_KEY_ID: string;
}

export interface GraphqlProps {
  readonly rbacTable: dynamodb.Table;
  readonly userNonceTable: dynamodb.Table;
  readonly fundingTable: dynamodb.Table;
  readonly claimsTable: dynamodb.Table;
  readonly openEditionClaimsTable: dynamodb.Table;
  readonly inscriptionBucket: s3.Bucket;
  readonly uploadBucket: s3.Bucket;
  readonly walletTable: dynamodb.Table;
  readonly uploadsTable: dynamodb.Table;
  readonly usersTable: dynamodb.Table;
  readonly fundingSecKeyEnvelope: Envelope;
  readonly parentInscriptionSecKeyEnvelope: Envelope;
  readonly rpcLambdas: Record<BitcoinNetwork, lambda.Function | undefined>;
  readonly domainName: URL;
  readonly sopsLayer: lambda.LayerVersion;
  readonly vpc?: ec2.IVpc;
  readonly btcClientGroups?: ec2.ISecurityGroup[];
  readonly electrumNlbs: Record<
    BitcoinNetwork,
    elbv2.INetworkLoadBalancer | undefined
  >;
}

export class Graphql extends Construct {
  public readonly graphqlLambda: lambda.Function;
  public readonly s3CollectionMetaUpdateLambda: lambda.Function;
  public readonly httpApi: apigw2.HttpApi;

  constructor(
    scope: Construct,
    id: string,
    {
      rbacTable,
      userNonceTable,
      fundingTable,
      claimsTable,
      openEditionClaimsTable,
      inscriptionBucket,
      uploadBucket,
      walletTable,
      uploadsTable,
      usersTable,
      fundingSecKeyEnvelope,
      parentInscriptionSecKeyEnvelope,
      domainName,
      sopsLayer,
      rpcLambdas,
      vpc,
      btcClientGroups,
      electrumNlbs,
    }: GraphqlProps,
  ) {
    super(scope, id);

    // GraphQL schema is packaged with the Lambda and loaded at runtime

    // Create layers for GraphQL: SOPS binary and encrypted env file
    const secretsDir = path.join(
      __dirname,
      "../../secrets",
      new URL(domainName).host,
    );
    // Secret asset for .env.graphql
    const graphqlSecretLayer = new lambda.LayerVersion(
      this,
      "GraphqlSecretLayer",
      {
        code: lambda.Code.fromAsset(secretsDir, {
          exclude: ["*", "!.env.graphql"],
        }),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        description: "Layer containing the encrypted .env.graphql file",
      },
    );
    // Create a NodejsFunction for the GraphQL lambda
    const graphqlLambda = new lambdaNodejs.NodejsFunction(
      this,
      "GraphqlHandler",
      {
        entry: path.join(
          __dirname,
          "../../apps/functions/src/lambdas/graphql/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        ...(vpc && {
          vpc,
          vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
          securityGroups: btcClientGroups,
        }),
        bundling: {
          externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
          sourceMap: true,
          inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
          format: lambdaNodejs.OutputFormat.ESM,
          target: "node20",
          platform: "node",
          commandHooks: {
            beforeInstall: () => [],
            beforeBundling: () => [],
            afterBundling(inputDir, outputDir) {
              // Copy the root-level schema.graphql into the bundle
              return [
                `cp ${inputDir}/../packages/graphql/schema.graphql ${outputDir}/schema.graphql`,
              ];
            },
          },
        },
        environment: {
          NODE_ENV: "production",
          LOG_LEVEL: "debug",
          NODE_OPTIONS: "--enable-source-maps",
          TABLE_NAMES: JSON.stringify({
            rbac: rbacTable.tableName,
            userNonce: userNonceTable.tableName,
            funding: fundingTable.tableName,
            claims: claimsTable.tableName,
            openEditionClaims: openEditionClaimsTable.tableName,
            wallet: walletTable.tableName,
            uploads: uploadsTable.tableName,
            users: usersTable.tableName,
          }),
          INSCRIPTION_BUCKET: inscriptionBucket.bucketName,
          UPLOAD_BUCKET: uploadBucket.bucketName,
          FUNDING_TABLE_STREAM_ARN: fundingTable.tableStreamArn ?? "null",
          FUNDING_STREAM_REGION: "us-east-1",
          PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID:
            parentInscriptionSecKeyEnvelope.key.keyId,
          FUNDING_SEC_KEY_ENVELOPE_KEY_ID: fundingSecKeyEnvelope.key.keyId,
          ...Object.fromEntries(
            Object.entries(rpcLambdas)
              .filter(([, lambda]) => lambda !== undefined)
              .map(([network, lambda]) => [
                `${network.toUpperCase()}_RPC_LAMBDA_ARN`,
                lambda?.functionArn,
              ]),
          ),
          ...Object.fromEntries(
            Object.entries(electrumNlbs)
              .filter(([, nlb]) => nlb !== undefined)
              .map(([network, nlb]) => [
                `${network.toUpperCase()}_ELECTRUM_HOSTNAME`,
                nlb?.loadBalancerDnsName ?? "",
              ]),
          ),
        },
        // attach SOPS binary layer and GraphQL secret layer
        layers: [sopsLayer, graphqlSecretLayer],
      },
    );

    this.graphqlLambda = graphqlLambda;

    // Grant permissions to the GraphQL lambda
    rbacTable.grantReadWriteData(graphqlLambda);
    userNonceTable.grantReadWriteData(graphqlLambda);
    fundingTable.grantReadWriteData(graphqlLambda);
    claimsTable.grantReadWriteData(graphqlLambda);
    openEditionClaimsTable.grantReadWriteData(graphqlLambda);
    walletTable.grantReadWriteData(graphqlLambda);
    usersTable.grantReadWriteData(graphqlLambda);
    uploadsTable.grantReadWriteData(graphqlLambda);

    inscriptionBucket.grantReadWrite(graphqlLambda);
    uploadBucket.grantReadWrite(graphqlLambda);

    parentInscriptionSecKeyEnvelope.key.grantEncryptDecrypt(graphqlLambda);
    fundingSecKeyEnvelope.key.grantEncryptDecrypt(graphqlLambda);

    graphqlLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: [
          "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
        ],
      }),
    );

    graphqlLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
      }),
    );

    for (const network of Object.keys(rpcLambdas)) {
      rpcLambdas[network as BitcoinNetwork]?.grantInvoke(graphqlLambda);
    }

    const routeDomain = domainName.hostname;
    const allowedOrigins = [
      "http://localhost:3000", // for local dev
      `https://www.${domainName.hostname}`, // your production frontend
      "https://localhost:3000", // for local dev
    ];

    const httpApi = new HttpApi(this, "GraphqlApi", {
      corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.POST,
          CorsHttpMethod.GET,
        ],
        allowHeaders: ["Content-Type", "Authorization", "Cookie"],
        allowCredentials: true,
        maxAge: Duration.days(1),
      },
    });

    this.httpApi = httpApi;

    // Add the GraphQL lambda as a target for the HTTP API
    const graphqlIntegration = new HttpLambdaIntegration(
      "GraphqlIntegration",
      graphqlLambda,
    );

    httpApi.addRoutes({
      path: "/graphql",
      methods: [apigw2.HttpMethod.POST, apigw2.HttpMethod.GET],
      integration: graphqlIntegration,
    });

    // Add a health check route
    httpApi.addRoutes({
      path: "/health",
      methods: [apigw2.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "HealthIntegration",
        new lambda.Function(this, "HealthHandler", {
          runtime: lambda.Runtime.NODEJS_20_X,
          handler: "index.handler",
          code: lambda.Code.fromInline(`
            exports.handler = async () => {
              return {
                statusCode: 200,
                body: JSON.stringify({ status: "ok" }),
              };
            };
          `),
        }),
      ),
    });

    // Output the HTTP API URL
    new cdk.CfnOutput(this, "GraphqlApiUrl", {
      exportName: "GraphqlApiUrl",
      value: httpApi.url ?? "null",
    });
    // Create a DNS record for the GraphQL API under the api.<domain> subdomain
    const hostedZone = route53.HostedZone.fromLookup(
      this,
      "GraphqlHostedZone",
      {
        domainName: routeDomain,
      },
    );
    // extract the API Gateway host from the URL token at synth time using FnSplit/FnSelect
    const apiHost = cdk.Fn.select(
      0,
      cdk.Fn.split("/", cdk.Fn.select(1, cdk.Fn.split("://", httpApi.url!))),
    );
    new route53.CnameRecord(this, "GraphqlApiRecord", {
      zone: hostedZone,
      recordName: "api",
      domainName: apiHost,
    });

    // Create ACM certificate for custom domain api.<bitflick.xyz>
    const cert = new acm.Certificate(this, "ApiCertificate", {
      domainName: `api.${routeDomain}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Attach custom domain to HTTP API and map the default stage
    const apiDomain = new apigw2.DomainName(this, "ApiCustomDomain", {
      domainName: `api.${routeDomain}`,
      certificate: cert,
      endpointType: apigw2.EndpointType.REGIONAL,
    });
    new apigw2.ApiMapping(this, "GraphqlApiMapping", {
      api: httpApi,
      domainName: apiDomain,
      // Map the default stage of the HTTP API
      stage: httpApi.defaultStage,
    });

    new cdk.CfnOutput(this, "ApiGatewayCustomDomainTarget", {
      description:
        "Target domain name to configure in Cloudflare CNAME for api.bitflick.xyz",
      value: apiDomain.regionalDomainName,
    });
  }
}
