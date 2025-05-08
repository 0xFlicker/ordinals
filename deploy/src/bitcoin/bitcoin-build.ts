import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cfn from "aws-cdk-lib/aws-cloudformation";

interface BitcoinBuilderProps {
  /** S3 bucket to store built Bitcoin Core binaries */
  readonly bucket: s3.IBucket;
  /** Git reference (branch, tag, or commit) to checkout */
  readonly gitRef?: string;
  /** Git repository URL for Bitcoin Core */
  readonly repoUrl?: string;
  /** VPC in which to run the build instance; a new VPC will be created if not provided */
  readonly vpc?: ec2.IVpc;
}

export class BitcoinBuilder extends Construct {
  constructor(scope: Construct, id: string, props: BitcoinBuilderProps) {
    super(scope, id);

    const bucket = props.bucket;
    // Determine Git reference and repository URL
    const gitRef = props.gitRef ?? "master";
    const repoUrl = props.repoUrl ?? "https://github.com/bitcoin/bitcoin.git";
    // Use provided VPC or create a new one
    const vpc = props.vpc ?? new ec2.Vpc(this, "VPC", { maxAzs: 2 });

    // Use shared S3 bucket to store the binary

    // Define the EC2 instance
    const userData = ec2.UserData.forLinux();
    const instance = new ec2.Instance(this, "BitcoinBuildInstance", {
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

    // Attach IAM policy to allow SSM if needed
    instance.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );

    // User data to setup the environment and build Bitcoin Core
    instance.userData.addCommands(
      "sudo yum update -y",
      // Install build dependencies
      "sudo yum install -y git gcc gcc-c++ make cmake autoconf automake libtool pkgconfig python3 python3-devel openssl-devel libevent-devel boost-devel libsqlite3-dev systemtap-sdt-dev curl",
      // Clone and checkout specified git reference
      `git clone ${repoUrl}`,
      "cd bitcoin",
      `git checkout ${gitRef}`,
      "cmake -B build",
      "cmake --build build -j$(nproc)",
      // Package the binaries
      "tar czf bitcoin-core.tar.gz -C build/bin bitcoind bitcoin-cli",
      // Upload the tarball to the S3 bucket
      `aws s3 cp bitcoin-core.tar.gz s3://${bucket.bucketName}/bitcoin-core.tar.gz`,
      // Signal CloudFormation that the build has completed successfully
      `curl -X PUT --data-binary '{"Status":"SUCCESS","Reason":"Built Bitcoin Core","UniqueId":"BitcoinBuild"}' '${waitHandle.ref}'`,
      // Terminate the instance after the upload and signal
      "sudo shutdown -h now",
    );

    // Grant the instance read/write permissions to the S3 bucket
    bucket.grantReadWrite(instance.role);

    // (Optional) expose the bucket name
    new cdk.CfnOutput(this, "BitcoinBinaryBucket", {
      value: `s3://${bucket.bucketName}/bitcoin-core.tar.gz`,
    });
  }
}
