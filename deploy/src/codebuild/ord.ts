import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export interface CodeBuildStackProps {
  /** The S3 bucket name where built binaries are stored */
  readonly binaryBucketName: string;
  /** The SOPS version to build, e.g. '3.10.2' */
  readonly ordVersion: string;
}

/**
 * Stack that sets up CodeBuild to compile ARM SOPS and upload to S3.
 */
export class OrdBuildStack extends Construct {
  public readonly project: codebuild.Project;
  public readonly ordKey: string;

  constructor(scope: Construct, id: string, props: CodeBuildStackProps) {
    super(scope, id);

    // Reference the shared binary bucket
    const bucket = s3.Bucket.fromBucketName(
      this,
      "BinaryBucket",
      props.binaryBucketName,
    );

    const gitRef = props.ordVersion;
    const repoUrl = "https://github.com/ordinals/ord.git";

    // Define the object key for the built SOPS artifact
    this.ordKey = `ord/ord-${props.ordVersion}-arm64.zip`;

    // CodeBuild project to build SOPS for ARM64
    this.project = new codebuild.Project(this, "BuildOrd", {
      projectName: "build-ord-arm64",
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
            VERSION: props.ordVersion,
            BUCKET: props.binaryBucketName,
            KEY: this.ordKey,
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
              "sudo yum update -y",
              // Install build dependencies
              "sudo yum install -y git gcc gcc-c++ clang",
              // Install Rust toolchain
              "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
              "source $HOME/.cargo/env",
              // Clone and checkout specified git reference
              `git clone ${repoUrl}`,
              "cd ord",
              `git checkout ${gitRef}`,
              "cargo build --release",
              // Prepare layer directory
              "mkdir -p layer/bin",
              // Copy SOPS binary into layer/bin
              "cp ./target/release/ord layer/bin/ord",
              // Package the layer: include bin/ folder into a zip in /tmp
              "cd layer && zip -r /tmp/ord.zip bin",
              // Upload to shared S3 bucket
              "aws s3 cp /tmp/ord.zip s3://$BUCKET/$KEY",
            ],
          },
        },
      }),
    });

    // Grant CodeBuild permission to write to the S3 bucket
    bucket.grantReadWrite(this.project.role!);

    // Export the SOPS object key for consumption by other stacks
    new cdk.CfnOutput(this, "OrdBinaryKey", {
      value: this.ordKey,
      exportName: "CodeBuild-OrdBinaryKey",
    });
  }
}
