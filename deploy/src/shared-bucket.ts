import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

/**
 * Stack that creates a shared S3 bucket for binary artifacts in us-east-1.
 */
export class SharedBinaryBucketStack extends cdk.Stack {
  /**
   * The shared S3 bucket for binary artifacts.
   */
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a versioned bucket to store built binaries
    this.bucket = new s3.Bucket(this, 'SharedBinaryBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Export the bucket name for consumption in other stacks
    new cdk.CfnOutput(this, 'SharedBinaryBucketName', {
      value: this.bucket.bucketName,
      exportName: 'SharedBinaryBucketName',
    });
  }
}