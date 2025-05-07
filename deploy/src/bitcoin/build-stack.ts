import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { ElectrsBuilder } from "./electrs-build.js";
import { BitcoinBuilder } from "./bitcoin-build.js";

export interface BuildStackProps extends cdk.StackProps {
  /** Optional Git reference for electrs build (branch, tag, or commit) */
  readonly electrsGitRef?: string;
  /** Optional Git repository URL for electrs */
  readonly electrsRepoUrl?: string;
  /** Optional Git reference for Bitcoin Core build (branch, tag, or commit) */
  readonly bitcoinGitRef?: string;
  /** Optional Git repository URL for Bitcoin Core */
  readonly bitcoinRepoUrl?: string;
}

export class BuildStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: BuildStackProps) {
    super(scope, id, props);

    // Shared S3 bucket for binaries
    const bucket = new s3.Bucket(this, "SharedBinaryBucket", {
      versioned: true,
    });

    // Create a shared VPC for build instances
    const vpc = new ec2.Vpc(this, "BuildVPC", { maxAzs: 2 });
    // Build and upload Electrs
    new ElectrsBuilder(this, "ElectrsBuild", {
      bucket,
      vpc,
      gitRef: props?.electrsGitRef,
      repoUrl: props?.electrsRepoUrl,
    });

    // Build and upload Bitcoin Core
    new BitcoinBuilder(this, "BitcoinBuild", {
      bucket,
      vpc,
      gitRef: props?.bitcoinGitRef,
      repoUrl: props?.bitcoinRepoUrl,
    });

    // Expose bucket name
    new cdk.CfnOutput(this, "SharedBinaryBucketName", {
      value: bucket.bucketName,
    });
  }
}