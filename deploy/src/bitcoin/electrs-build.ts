import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cfn from "aws-cdk-lib/aws-cloudformation";

interface ElectrsBuilderProps {
  /** S3 bucket to store built electrs binaries */
  readonly bucket: s3.IBucket;
  /** Git reference (branch, tag, or commit) to checkout */
  readonly gitRef?: string;
  /** Git repository URL for electrs */
  readonly repoUrl?: string;
  /** VPC in which to run the build instance; a new VPC will be created if not provided */
  readonly vpc?: ec2.IVpc;
}

export class ElectrsBuilder extends Construct {
  constructor(scope: Construct, id: string, props: ElectrsBuilderProps) {
    super(scope, id);

    const bucket = props.bucket;
    // Determine Git reference and repository URL
    const gitRef = props.gitRef ?? "master";
    const repoUrl = props.repoUrl ?? "https://github.com/romanz/electrs.git";
    // Use provided VPC or create a new one
    const vpc = props.vpc ?? new ec2.Vpc(this, "VPC", { maxAzs: 2 });

    // Use shared S3 bucket to store the binary

    // Define the EC2 instance
    const userData = ec2.UserData.forLinux();
    const instance = new ec2.Instance(this, "ElectrsBuildInstance", {
      userData,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.M6G,
        ec2.InstanceSize.LARGE,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      vpc,
    });
    // Create a wait condition handle to signal completion of the build
    const waitHandle = new cfn.CfnWaitConditionHandle(this, "WaitHandle");
    const waitCondition = new cfn.CfnWaitCondition(this, "WaitCondition", {
      handle: waitHandle.ref,
      timeout: (10 * 60).toString(), // 10 minutes, in seconds, as a string
      count: 1,
    });
    // Ensure the wait condition does not proceed until the instance is created
    const cfnInstance = instance.node.defaultChild as ec2.CfnInstance;
    waitCondition.addDependency(cfnInstance);

    instance.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );

    // User data to setup the environment and build electrs
    instance.userData.addCommands(
      "sudo yum update -y",
      // Install build dependencies
      "sudo yum install -y git gcc gcc-c++ clang",
      // Install Rust toolchain
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      "source $HOME/.cargo/env",
      // Clone and checkout specified git reference
      `git clone ${repoUrl}`,
      "cd electrs",
      `git checkout ${gitRef}`,
      "cargo build --release",
      // Upload the binary to the S3 bucket
      `aws s3 cp ./target/release/electrs s3://${bucket.bucketName}/electrs-${gitRef}`,
      // Signal CloudFormation that the build has completed successfully
      `curl -X PUT --data-binary '{"Status":"SUCCESS","Reason":"Built electrs","UniqueId":"ElectrsBuild"}' '${waitHandle.ref}'`,
      // Terminate the instance after the upload and signal
      "sudo shutdown -h now",
    );

    // Add read/write permissions to the S3 bucket
    bucket.grantReadWrite(instance.role);

    // (Optional) expose the bucket name
    new cdk.CfnOutput(this, "ElectrsBinaryBucket", {
      value: `s3://${bucket.bucketName}/electrs-${gitRef}`,
    });
  }
}
