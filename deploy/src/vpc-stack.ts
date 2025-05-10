import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * VpcStack creates a shared VPC for the application with public and private subnets.
 */
export class VpcStack extends cdk.Stack {
  /** The shared VPC */
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, "AppVpc", {
      maxAzs: 3,
      subnetConfiguration: [
        { cidrMask: 24, name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { cidrMask: 24, name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    // Export the VPC ID
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: `${this.stackName}-VpcId`,
    });
  }
}