import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export interface CodeBuildStackProps extends cdk.StackProps {
  /** The S3 bucket name where built binaries are stored */
  readonly binaryBucketName: string;
  /** The SOPS version to build, e.g. '3.10.2' */
  readonly sopsVersion: string;
}

/**
 * Stack that sets up CodeBuild to compile ARM SOPS and upload to S3.
 */
export class CodeBuildStack extends cdk.Stack {
  public readonly project: codebuild.Project;
  public readonly sopsKey: string;

  constructor(scope: Construct, id: string, props: CodeBuildStackProps) {
    super(scope, id, props);

    // Reference the shared binary bucket
    const bucket = s3.Bucket.fromBucketName(
      this,
      "BinaryBucket",
      props.binaryBucketName,
    );

    // Define the object key for the built SOPS artifact
    this.sopsKey = `sops/sops-${props.sopsVersion}-arm64.zip`;

    // CodeBuild project to build SOPS for ARM64
    this.project = new codebuild.Project(this, "BuildSopsProject", {
      projectName: "BuildSopsArm64",
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        privileged: false,
      },
      role: new iam.Role(this, "CodeBuildRole", {
        assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      }),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        env: {
          variables: {
            VERSION: props.sopsVersion,
            BUCKET: props.binaryBucketName,
            KEY: this.sopsKey,
          },
        },
        phases: {
          install: {
            // Install zip and AWS CLI
            commands: ["yum install -y zip awscli"],
          },
          build: {
            // Install the ARM64 SOPS RPM directly
            commands: [
              "yum install -y https://github.com/getsops/sops/releases/download/v$VERSION/sops-$VERSION-1.aarch64.rpm",
              // Prepare layer directory
              "mkdir -p layer/bin",
              // Copy SOPS binary into layer/bin
              "cp /usr/bin/sops layer/bin/sops",
              // Package the layer: include bin/ folder into a zip in /tmp
              "cd layer && zip -r /tmp/sops.zip bin",
              // Upload to shared S3 bucket
              "aws s3 cp /tmp/sops.zip s3://$BUCKET/$KEY",
            ],
          },
        },
      }),
    });

    // Grant CodeBuild permission to write to the S3 bucket
    bucket.grantReadWrite(this.project.role!);

    // Export the SOPS object key for consumption by other stacks
    new cdk.CfnOutput(this, "SopsBinaryKey", {
      value: this.sopsKey,
      exportName: "SopsBinaryKey",
    });
  }
}
