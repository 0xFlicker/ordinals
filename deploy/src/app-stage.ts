import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { TerraformStateStack } from "./terraform.js";
import { SharedBinaryBucketStack } from "./shared-bucket.js";
import { CodeBuildStack } from "./codebuild/stack.js";
import { SopsLayerStack } from "./layers.js";
import { VpcStack } from "./vpc-stack.js";
import { BitcoinStack } from "./bitcoin/bitcoin.js";
import { BackendStack, FrameStack } from "./stack.js";
import { BeachheadStack } from "./beachhead.js";

/**
 * A single stage of the Ordinals application, grouping all AWS stacks.
 */
export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps) {
    super(scope, id, props);

    // Terraform remote state (for CDK-managed infra)
    new TerraformStateStack(this, "TerraformStateStack", {
      env: props.env,
      stackName: "TerraformStateStack",
    });

    // Shared S3 bucket for binaries
    const sharedBucketStack = new SharedBinaryBucketStack(
      this,
      "SharedBinaryBucket",
      {
        env: props.env,
        stackName: "shared-binary-bucket",
      },
    );
    const sharedBucketName = sharedBucketStack.bucket.bucketName;

    // CodeBuild projects to build SOPS and ord binaries
    const { sopsBuildStack, ordBuildStack } = new CodeBuildStack(
      this,
      "CodeBuild",
      {
        env: props.env,
        binaryBucketName: sharedBucketName,
        stackName: "codebuild",
      },
    );

    // Lambda layer for SOPS binary
    const sopsLayerStack = new SopsLayerStack(this, "SopsLayer", {
      env: props.env,
      binaryBucketName: sharedBucketName,
      sopsKey: sopsBuildStack.sopsKey,
      stackName: "sops-layer",
    });
    const sopsLayer = sopsLayerStack.sopsLayer;

    // VPC for application
    const vpcStack = new VpcStack(this, "AppVpc", {
      env: props.env,
      stackName: "app-vpc",
    });
    const vpc = vpcStack.vpc;

    // Bitcoin-node clusters
    const {
      electrumNlb: testnet4ElectrumNlb,
      bitcoinRpcAlbs: testnet4BitcoinRpcAlbs,
    } = new BitcoinStack(this, "Testnet4Cluster", {
      network: "testnet4",
      vpc,
      env: props.env,
    });
    const {
      electrumNlb: mainnetElectrumNlb,
      bitcoinRpcAlbs: mainnetBitcoinRpcAlbs,
    } = new BitcoinStack(this, "MainnetCluster", {
      network: "mainnet",
      vpc,
      env: props.env,
    });
    const electrumNlbs = {
      testnet4: testnet4ElectrumNlb,
      mainnet: mainnetElectrumNlb,
      regtest: undefined,
      testnet: undefined,
    };
    const bitcoinRpcAlbs = {
      testnet4: testnet4BitcoinRpcAlbs,
      mainnet: mainnetBitcoinRpcAlbs,
      regtest: undefined,
      testnet: undefined,
    };

    // Backend services and front-end frame
    new BackendStack(this, "Backend", {
      env: props.env,
      origin: process.env.ORIGIN || "https://bitflick.xyz",
      sopsLayer,
      vpc,
      networks: ["testnet4", "mainnet"],
      electrumNlbs,
      bitcoinRpcAlbs,
    });

    new BeachheadStack(this, "Beachhead", {
      vpc,
      rootVolumeSize: 200,
      dataVolumeSize: 250,
      env: props.env,
    });
  }
}
