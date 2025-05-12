import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SopsBuildStack } from "./sops.js";
import { OrdBuildStack } from "./ord.js";

interface CodeBuildStackProps extends cdk.StackProps {
  readonly binaryBucketName: string;
}

export class CodeBuildStack extends cdk.Stack {
  public readonly sopsBuildStack: SopsBuildStack;
  public readonly ordBuildStack: OrdBuildStack;

  constructor(scope: Construct, id: string, props: CodeBuildStackProps) {
    super(scope, id, props);

    this.sopsBuildStack = new SopsBuildStack(this, "Sops", {
      binaryBucketName: props.binaryBucketName,
      sopsVersion: "3.10.2",
    });

    this.ordBuildStack = new OrdBuildStack(this, "Ord", {
      binaryBucketName: props.binaryBucketName,
      ordVersion: "0.23.1",
    });
  }
}
