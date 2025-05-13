import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface SopsLayerStackProps extends cdk.StackProps {
  /** The S3 bucket name containing the SOPS binary */
  binaryBucketName: string;
  /** The object key of the SOPS binary zip in the bucket */
  sopsKey: string;
}

/**
 * Stack to publish a shared SOPS Lambda Layer (ARM64, Node20)
 */
export class SopsLayerStack extends cdk.Stack {
  public readonly sopsLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: SopsLayerStackProps) {
    super(scope, id, props);

    // Retrieve the SOPS build artifact from the shared S3 bucket
    const bucket = s3.Bucket.fromBucketName(
      this,
      'SharedBinaryBucket',
      props.binaryBucketName,
    );
    this.sopsLayer = new lambda.LayerVersion(this, 'SopsLayer', {
      code: lambda.Code.fromBucket(bucket, props.sopsKey),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: 'Layer containing the SOPS binary (ARM64, Node20)',
    });

    // Export the layer ARN for cross-stack references
    new cdk.CfnOutput(this, 'SopsLayerVersionArn', {
      value: this.sopsLayer.layerVersionArn,
      exportName: 'SopsLayerVersionArn',
    });
  }
}
