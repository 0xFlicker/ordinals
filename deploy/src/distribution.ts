import path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as apigw2 from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { fileURLToPath } from "url";
import { parse } from "dotenv";
import { Nextjs } from "cdk-nextjs-standalone";
import { textFromSecret } from "./utils/files.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface IProps {
  noCert?: boolean;
  domain: string | [string, string];
  graphqlApi: apigw2.IHttpApi;
}

export class Www extends Construct {
  constructor(scope: Construct, id: string, props: IProps) {
    const { noCert, domain, graphqlApi } = props;
    super(scope, id);

    const domains = domain instanceof Array ? domain : [domain];
    const domainName = domains.join(".");

    const environment = parse(
      textFromSecret(`${domainName.replace("www.", "")}/.env.www`),
    );
    const graphqlApiUrl = cdk.Fn.select(
      1,
      cdk.Fn.split("//", graphqlApi.apiEndpoint),
    );

    const fontBucket = s3.Bucket.fromBucketName(
      this,
      "FontBucket",
      "bitflick-fonts-abc123",
    );

    const apiCacheDisabled = new cloudfront.CachePolicy(
      this,
      "apiCacheDisabled",
      {
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Authorization",
          "Content-Type",
          "Accept",
        ),
      },
    );

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "WwwSiteCertificate",
      "arn:aws:acm:us-east-1:590183800463:certificate/2ed82da5-ae12-442b-a0fc-cb5c95456119",
    );
    const hostedZone = new route53.HostedZone(this, "HostedZone", {
      zoneName: domainName.replace("www.", ""),
    });
    const site = new Nextjs(this, "Web", {
      ...(!noCert
        ? {
            domainProps: {
              hostedZone,
              domainName,
              certificate,
            },
          }
        : {}),
      overrides: {
        nextjsDistribution: {
          distributionProps: {
            additionalBehaviors: {
              "api/graphql": {
                origin: new origins.HttpOrigin(graphqlApiUrl, {
                  originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
                  protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                }),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                cachePolicy: apiCacheDisabled,
                viewerProtocolPolicy:
                  cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
            },
          },
        },
      },
      nextjsPath: "../apps/www",
      environment: {
        ...environment,
        DEPLOYMENT: "aws",
        NEXT_PUBLIC_GRAPHQL_ENDPOINT: `https://${domainName}/api/graphql`,
        FONT_BUCKET: fontBucket.bucketName,
        NEXT_PUBLIC_BASE_URL: `https://${domainName}`,
      },
    });
    fontBucket.grantRead(site.serverFunction.lambdaFunction);

    new cdk.CfnOutput(this, "WebUrl", {
      value: site.url,
    });
  }
}
