import { Construct } from "constructs";
import path from "path";
import { fileURLToPath } from "url";

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { networkToRpcPort } from "./utils/transforms.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BitcoinNetwork = "mainnet" | "testnet" | "testnet4" | "regtest";

export interface BitcoinRpcFunctionProps {
  readonly domainName: string;
  readonly sopsLayer: lambda.LayerVersion;
  readonly vpc?: ec2.IVpc;
  readonly networks?: BitcoinNetwork[];
}

export class BitcoinRpcFunction extends Construct {
  public readonly sopsLayer: lambda.LayerVersion;
  public readonly rpcLambdas: Record<
    BitcoinNetwork,
    lambda.Function | undefined
  > = {
    mainnet: undefined,
    testnet: undefined,
    testnet4: undefined,
    regtest: undefined,
  };

  constructor(scope: Construct, id: string, props: BitcoinRpcFunctionProps) {
    super(scope, id);

    // Package the encrypted RPC secret file as a layer for direct access at /opt/.env.rpc
    const rpcSecretLayer = new lambda.LayerVersion(this, "RpcSecretLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../secrets/bitflick.xyz"),
        {
          exclude: ["*", "!.env.rpc"],
        },
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: "Layer containing the SOPS-encrypted RPC auth secret",
    });

    const onlyAlbSecurityGroup = props.vpc
      ? new ec2.SecurityGroup(this, "OnlyAlbSecurityGroup", {
          vpc: props.vpc,
          description: "Security group for only ALB",
          allowAllOutbound: true,
        })
      : undefined;

    for (const network of props.networks ?? []) {
      const rpcLambda = new lambdaNodejs.NodejsFunction(
        this,
        `JsonRpc-${network}`,
        {
          ...(props.vpc && onlyAlbSecurityGroup
            ? {
                vpc: props.vpc,
                vpcSubnets: {
                  subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups: [onlyAlbSecurityGroup],
              }
            : {}),
          runtime: lambda.Runtime.NODEJS_20_X,
          architecture: lambda.Architecture.ARM_64,
          timeout: cdk.Duration.seconds(5),
          memorySize: 256,
          handler: "handler",
          entry: path.join(
            __dirname,
            "../../apps/functions/src/lambdas/rpc/handler.ts",
          ),
          environment: {
            LOG_LEVEL: "debug",
            NODE_OPTIONS: "--enable-source-maps",
            BITCOIN_NETWORK: network,
            DEPLOYMENT: "aws",
          },
          // attach SOPS and secret layers
          layers: [props.sopsLayer, rpcSecretLayer],
          bundling: {
            externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
            sourceMap: true,
            minify: true,
            sourcesContent: true,
            inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
            format: lambdaNodejs.OutputFormat.ESM,
            target: "node20",
            platform: "node",
          },
        },
      );
      // Add KMS and STS policies to role
      rpcLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["kms:Decrypt"],
          resources: [
            "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
          ],
        }),
      );

      rpcLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
        }),
      );

      this.rpcLambdas[network] = rpcLambda;
    }
  }
}
