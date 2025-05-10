import path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Fn } from "aws-cdk-lib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SopsLayerProps extends cdk.StackProps {
  binaryBucketName: string;
}

/**
 * Stack to publish a shared SOPS Lambda Layer (ARM64, Node20)
 */
export class SopsLayerStack extends cdk.Stack {
  public readonly sopsLayer: lambda.LayerVersion;

  constructor(scope: cdk.App, id: string, props: SopsLayerProps) {
    const { binaryBucketName, ...rest } = props;
    super(scope, id, rest);

    // Retrieve the SOPS build artifact from the shared S3 bucket
    const bucket = s3.Bucket.fromBucketName(
      this,
      "SharedBinaryBucket",
      binaryBucketName,
    );
    const sopsKey = Fn.importValue("SopsBinaryKey");
    this.sopsLayer = new lambda.LayerVersion(this, "SopsLayer", {
      code: lambda.Code.fromBucket(bucket, sopsKey),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: "Layer containing the SOPS binary (ARM64, Node20)",
    });

    // Export the layer ARN for cross-stack references
    new cdk.CfnOutput(this, "SopsLayerVersionArn", {
      value: this.sopsLayer.layerVersionArn,
      exportName: "SopsLayerVersionArn",
    });
  }
}
