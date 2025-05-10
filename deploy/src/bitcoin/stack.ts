import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3asset from "aws-cdk-lib/aws-s3-assets";
import { Bitcoin, BitcoinStorage } from "./bitcoin.js";
import path from "path";
import { fileURLToPath } from "url";
import { MariaDB } from "./mempool/mariadb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BitcoinExeStackProps extends cdk.StackProps {
  network: "testnet";
  localArchivePath: string;
}

/**
 * Properties for BitcoinStack.
 */
/**
 * Properties for BitcoinStack.
 */
interface BitcoinProps extends cdk.StackProps {
  /** Bitcoin network to deploy */
  network: "test" | "testnet4" | "mainnet";
  /** Optional existing VPC to deploy into */
  vpc?: ec2.IVpc;
}

export class BitcoinStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly btcServiceGroup: ec2.ISecurityGroup;
  public readonly btcClientGroup: ec2.ISecurityGroup;
  constructor(
    scope: Construct,
    id: string,
    { network, vpc: existingVpc, ...props }: BitcoinProps,
  ) {
    super(scope, id, props);

    const bitcoinStorage = new BitcoinStorage(this, "BitcoinStorage");

    // Import the shared binaries bucket name from BuildStack
    // const exeBucketName = cdk.Fn.importValue("SharedBinaryBucketName");
    const bucket = s3.Bucket.fromBucketName(
      this,
      "BitcoinExeBucket",
      "build-sharedbinarybucket5ed2c620-a532o2rrxyls",
    );

    // Use provided VPC or create a new one in the Bitcoin construct
    const { vpc, btcServiceGroup, btcClientGroup } = new Bitcoin(
      this,
      "Bitcoin",
      {
        executableBucket: bucket,
        blockchainDataBucket: bitcoinStorage.blockchainDataBucket,
        network,
        bitcoinKey: "bitcoin-core.tar.gz",
        electrsKey: "electrs",
        nodeKey: "node-v20.9.0-linux-arm64.tar.xz",
        existingVpc,
      },
    );

    this.vpc = vpc;
    this.btcServiceGroup = btcServiceGroup;
    this.btcClientGroup = btcClientGroup;

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
