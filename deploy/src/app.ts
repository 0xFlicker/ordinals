#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import path from "path";
import { fileURLToPath } from "url";
import { BackendStack, FrameStack } from "./stack.js";
import {
  BitcoinExeStack,
  BitcoinStack,
  MariaDbStack,
} from "./bitcoin/stack.js";
import { BuildStack } from "./bitcoin/build-stack.js";
import { AuroraServerlessV2Stack } from "./bitcoin/aurora.js";
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

new BackendStack(app, "ordinals", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  origin: process.env.ORIGIN || "https://bitflick.xyz",
});

new FrameStack(app, "frame", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  origin: process.env.ORIGIN || "https://bitflick.xyz",
});

new BitcoinExeStack(app, "bitcoin-exe", {
  network: "testnet",
  localArchivePath: path.join(
    __dirname,
    "../bitcoin/bitcoin-26.0-aarch64-linux-gnu.tar.gz",
  ),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-west-2",
  },
});

new BitcoinStack(app, "bitcoin-testnet4", {
  bucketName: process.env.BITCOIN_EXE_BUCKET || "",
  network: "testnet4",
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
