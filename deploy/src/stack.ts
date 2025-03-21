import * as cdk from "aws-cdk-lib";
import path from "path";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { fileURLToPath } from "url";

import { InscriptionsBus } from "./inscription-bus.js";
import { Storage } from "./storage.js";
import { DynamoDB } from "./dynamodb.js";
import { Www } from "./distribution.js";
import { Graphql } from "./graphql.js";
import { Frame } from "./frame.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface IProps extends cdk.StackProps {
  origin: string;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    const { origin, ...rest } = props;
    super(scope, id, rest);
    const { bucket: inscriptionBucket } = new Storage(this, "Storage", {
      name: "inscriptions",
    });
    const { bucket: uploadBucket } = new Storage(this, "UploadBucket", {
      name: "uploads",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedOrigins: ["http://localhost:3000", "https://www.bitflick.xyz"],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
        },
      ],
    });

    const {
      claimsTable,
      fundingTable,
      openEditionClaimsTable,
      rbacTable,
      userNonceTable,
      walletTable,
    } = new DynamoDB(this, "DynamoDB", {});
    // new InscriptionsBus(this, "NftMetadataBus", {
    //   lambdas: false,
    // });

    if (process.env.DEPLOYMENT !== "localstack") {
      const { api: graphqlApi } = new Graphql(this, "Graphql", {
        domainName: new URL(origin).host,
        claimsTable,
        fundingTable,
        openEditionClaimsTable,
        rbacTable,
        userNonceTable,
        walletTable,
        inscriptionBucket,
        uploadBucket,
      });
      const graphqlApiUrl = cdk.Fn.select(
        1,
        cdk.Fn.split("//", graphqlApi.apiEndpoint),
      );
      new cdk.CfnOutput(this, "GraphqlApiUrl", {
        value: graphqlApiUrl,
      });

      new Www(this, "Www", {
        // Adding cert manually because cloudflare
        // noCert: true,
        domain: `www.${new URL(origin).host}`,
        graphqlApi,
      });
    }
  }
}

export class FrameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);
    new Frame(this, "Frame", {
      imageDomainName: `frame.${new URL(props.origin).hostname}.bitflick.xyz`,
    });
  }
}
