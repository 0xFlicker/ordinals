import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

import { Storage } from "./storage.js";
import { DynamoDB } from "./dynamodb.js";
import { Www } from "./distribution.js";
import { Graphql } from "./graphql.js";
import { Frame } from "./frame.js";
import { Envelope } from "./envelope.js";
import { InscriptionFunding } from "./inscription-funding.js";
import { BitcoinRpcFunction } from "./rpc.js";

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
      localstack: process.env.DEPLOYMENT === "localstack",
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
    const { bucket: transactionBucket } = new Storage(
      this,
      "TransactionBucket",
      {
        name: "transactions",
        localstack: process.env.DEPLOYMENT === "localstack",
        encryption: s3.BucketEncryption.S3_MANAGED,
      },
    );

    const {
      claimsTable,
      fundingTable,
      batchTable,
      openEditionClaimsTable,
      rbacTable,
      userNonceTable,
      walletTable,
      uploadsTable,
    } = new DynamoDB(this, "DynamoDB", {
      domainName: new URL(origin).host,
    });

    const rpcStack = new BitcoinRpcFunction(this, "RpcStack", {
      domainName: new URL(origin).host,
    });

    // new InscriptionsBus(this, "NftMetadataBus", {
    //   lambdas: false,
    // });

    const parentInscriptionSecKeyEnvelope = new Envelope(
      this,
      "ParentInscriptionSecKeyEnvelope",
      {
        description: "Key for envelope encryption of bitcoin taproot secKeys",
      },
    );

    const fundingSecKeyEnvelope = new Envelope(this, "FundingSecKeyEnvelope", {
      description: "Key for envelope encryption of bitcoin taproot secKeys",
    });

    // Always deploy the InscriptionFunding construct
    new InscriptionFunding(this, "TxWorker", {
      domainName: new URL(origin).host,
      fundingTable,
      rbacTable,
      userNonceTable,
      claimsTable,
      openEditionClaimsTable,
      batchTable,
      parentInscriptionSecKeyEnvelope,
      inscriptionBucket,
      rpcLambda: rpcStack.rpcLambda,
      transactionBucket,
      batchRevealTimeMinutes: process.env.DEPLOYMENT === "localstack" ? 1 : 15,
    });

    if (process.env.DEPLOYMENT !== "localstack") {
      const { httpApi: graphqlApi } = new Graphql(this, "Graphql", {
        domainName: new URL(origin).host,
        claimsTable,
        fundingTable,
        openEditionClaimsTable,
        rbacTable,
        userNonceTable,
        walletTable,
        inscriptionBucket,
        uploadBucket,
        fundingSecKeyEnvelope,
        parentInscriptionSecKeyEnvelope,
        uploadsTable,
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
