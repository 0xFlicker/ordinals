#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import path from "path";
import { fileURLToPath } from "url";
import { AppStage } from "./app-stage.js";
// Aspect to apply a 14-day retention policy to all CloudWatch Log Groups
import { Aspects, IAspect } from "aws-cdk-lib";
import { CfnLogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { IConstruct } from "constructs";
import { PipelineStack } from "./pipeline-stack.js";

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


// Apply 14-day retention to all CloudWatch Log Groups
Aspects.of(app).add(new LogRetentionAspect(RetentionDays.TWO_WEEKS));

// Decide between AWS-native CodePipeline or manual CDK deploy via AppStage
const connectionArn = app.node.tryGetContext("codePipelineConnectionArn");
if (connectionArn) {
  new PipelineStack(app, "PipelineStack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    },
    connectionArn,
    repoOwner: "0xFlicker",
    repoName: "ordinals",
    branch: "main",
  });
} else {
  new AppStage(app, "Prod", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    },
  });
}
