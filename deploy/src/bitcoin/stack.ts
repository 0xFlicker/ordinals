import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3asset from "aws-cdk-lib/aws-s3-assets";
import {
  Bitcoin,
  BitcoinExeStorage,
  BitcoinStorage,
  ElectrsExeStorage,
  NodeExeStorage,
} from "./bitcoin.js";
import path from "path";
import { fileURLToPath } from "url";
import { MariaDB } from "./mempool/mariadb.js";
import { IBucket } from "aws-cdk-lib/aws-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BitcoinExeStackProps extends cdk.StackProps {
  network: "testnet";
  localArchivePath: string;
}

export class BitcoinExeStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    { network, localArchivePath, ...props }: BitcoinExeStackProps,
  ) {
    super(scope, id, props);

    const bitcoinExeStorage = new BitcoinExeStorage(this, "BitcoinExeStorage", {
      localArchivePath,
    });

    new cdk.CfnOutput(this, "BitcoinExeBucket", {
      value: bitcoinExeStorage.bitcoinExeAsset.s3BucketName,
    });

    new cdk.CfnOutput(this, "BitcoinExeKey", {
      value: bitcoinExeStorage.bitcoinExeAsset.s3ObjectKey,
    });
  }
}

interface BitcoinProps extends cdk.StackProps {
  bucketName: string;
  network: "test" | "testnet4" | "mainnet";
}

export class BitcoinStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    { bucketName, network, ...props }: BitcoinProps,
  ) {
    super(scope, id, props);

    const bitcoinStorage = new BitcoinStorage(this, "BitcoinStorage");

    const bucket = s3.Bucket.fromBucketName(
      this,
      "BitcoinExeBucket",
      bucketName,
    );

    new Bitcoin(this, "Bitcoin", {
      executableBucket: bucket,
      blockchainDataBucket: bitcoinStorage.blockchainDataBucket,
      network,
      bitcoinKey: "bitcoin-core.tar.gz",
      electrsKey: "electrs",
      nodeKey: "node-v20.9.0-linux-arm64.tar.xz",
    });

    new cdk.CfnOutput(this, "BlockchainDataBucket", {
      value: bitcoinStorage.blockchainDataBucket.bucketName,
    });
  }
}

export class MariaDbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, { ...props }: {}) {
    super(scope, id, props);

    const bitcoinVpc =
      (process.env.BITCOIN_VPC_ID &&
        ec2.Vpc.fromLookup(this, "BitcoinVpc", {
          vpcId: process.env.BITCOIN_VPC_ID,
        })) ||
      new ec2.Vpc(this, "BitcoinVpc", {
        maxAzs: 2,
      });
    new MariaDB(this, "MariaDb", {
      bitcoinVpc: bitcoinVpc,
      initialLoad: process.env.INITIAL_LOAD === "true",
    });
  }
}
