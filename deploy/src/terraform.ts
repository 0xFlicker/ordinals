import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export interface TerraformStateStackProps extends cdk.StackProps {}

/**
 * Creates an S3 bucket and DynamoDB table for Terraform remote state and locking.
 * Exports:
 *  - TerraformStateBucketName
 *  - TerraformLockTableName
 */
export class TerraformStateStack extends cdk.Stack {
  public readonly stateBucket: s3.Bucket;
  public readonly lockTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: TerraformStateStackProps) {
    super(scope, id, props);

    // Bucket to store Terraform state
    this.stateBucket = new s3.Bucket(this, "TerraformStateBucket", {
      bucketName: `bitflick-terraform-state-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { noncurrentVersionExpiration: cdk.Duration.days(30) }
      ],
    });

    // Table for Terraform state locking
    this.lockTable = new dynamodb.Table(this, "TerraformLockTable", {
      partitionKey: { name: "LockID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Export names for backend configuration
    new cdk.CfnOutput(this, "StateBucketName", {
      exportName: "TerraformStateBucketName",
      value: this.stateBucket.bucketName,
    });
    new cdk.CfnOutput(this, "LockTableName", {
      exportName: "TerraformLockTableName",
      value: this.lockTable.tableName,
    });
  }
}