import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface IProps extends s3.BucketProps {
  name: string;
}

export class Storage extends Construct {
  bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const { name, ...rest } = props;

    // Create the S3 buckets for inscriptions and axolotl inscriptions
    const bucket = new s3.Bucket(this, name, {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      ...rest,
    });
    this.bucket = bucket;
    new cdk.CfnOutput(this, `${name}BucketName`, {
      value: this.bucket.bucketName,
    });
  }
}
