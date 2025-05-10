#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "path";
import { fileURLToPath } from "url";
import { BackendStack, FrameStack } from "./stack.js";
import { VpcStack } from "./vpc-stack.js";
import { BitcoinStack, MariaDbStack } from "./bitcoin/stack.js";
import { BuildStack } from "./bitcoin/build-stack.js";
import { AuroraServerlessV2Stack } from "./bitcoin/aurora.js";
import { SopsLayerStack } from "./layers.js";
import { SharedBinaryBucketStack } from "./shared-bucket.js";
import { CodeBuildStack } from "./codebuild.js";
// Aspect to apply a 14-day retention policy to all CloudWatch Log Groups
import { Aspects, IAspect } from "aws-cdk-lib";
import { CfnLogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { IConstruct } from "constructs";

class LogRetentionAspect implements IAspect {
  constructor(private readonly retentionInDays: number) {}
  public visit(node: IConstruct): void {
    if (node instanceof CfnLogGroup && node.retentionInDays === undefined) {
      node.retentionInDays = this.retentionInDays;
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new cdk.App();

// Create a shared binary bucket in us-east-1 for ARM artifacts
const sharedBucketStack = new SharedBinaryBucketStack(
  app,
  "shared-binary-bucket",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
  },
);
const sharedBucketName = sharedBucketStack.bucket.bucketName;
// Build the SOPS ARM binary into the shared bucket
new CodeBuildStack(app, "sops-codebuild", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  binaryBucketName: sharedBucketName,
  sopsVersion: "3.10.2",
});
// Create SOPS layer stack using the shared bucket artifact
const { sopsLayer } = new SopsLayerStack(app, "sops-layer", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  binaryBucketName: sharedBucketName,
});

// Create (or import) a shared VPC for all Bitcoin and backend stacks
const vpcStack = new VpcStack(app, "app-vpc", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
const vpc = vpcStack.vpc;
// Deploy Bitcoin Testnet4 stack into the shared VPC
const { btcClientGroup } = new BitcoinStack(app, "bitcoin-testnet4", {
  network: "testnet4",
  vpc,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

new BackendStack(app, "ordinals", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  origin: process.env.ORIGIN || "https://bitflick.xyz",
  sopsLayer,
  vpc,
  btcClientGroup,
});

new FrameStack(app, "frame", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  origin: process.env.ORIGIN || "https://bitflick.xyz",
  sopsLayer,
  vpc,
  btcClientGroup,
});

new BitcoinStack(app, "bitcoin-mainnet", {
  network: "mainnet",
  // deploy Mainnet stack into the shared VPC
  vpc,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

// Build and upload Bitcoin and Electrs binaries using a shared S3 bucket
new BuildStack(app, "build", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-west-2",
  },
});

// new AuroraServerlessV2Stack(app, "aurora-mysql", {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: "us-west-2",
//   },
// });

new MariaDbStack(app, "mariadb", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-west-2",
  },
});

// Apply 14-day retention to all CloudWatch Log Groups
Aspects.of(app).add(new LogRetentionAspect(RetentionDays.TWO_WEEKS));
