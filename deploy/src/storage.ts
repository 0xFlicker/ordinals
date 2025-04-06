import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
export interface IProps extends s3.BucketProps {
  name: string;
  localstack?: boolean;
}

export class Storage extends Construct {
  bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const { name, localstack, ...rest } = props;

    // Create the S3 buckets for inscriptions and axolotl inscriptions
    const bucket = new s3.Bucket(this, "LocalDevBucket", {
      ...rest,
      // 🔧 Allow public access — do this manually
      blockPublicAccess: localstack
        ? new s3.BlockPublicAccess({
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
          })
        : s3.BlockPublicAccess.BLOCK_ALL,
    });

    if (localstack) {
      bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["s3:PutObject"],
          resources: [`${bucket.bucketArn}/*`],
          principals: [new iam.AnyPrincipal()],
        }),
      );
    }
    this.bucket = bucket;
    new cdk.CfnOutput(this, `${name}BucketName`, {
      value: this.bucket.bucketName,
    });
  }
}
