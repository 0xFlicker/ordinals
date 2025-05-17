import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BitcoinNetwork } from "../utils/types.js";
import { BitcoinCore, BitcoinCoreProps } from "./core.js";
import { Electrs, ElectrsProps } from "./electrs.js";
import { networkToRpcPort, networkToP2pPort } from "../utils/transforms.js";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

export interface BitcoinProps extends cdk.StackProps {
  /** Bitcoin network to deploy */
  network: BitcoinNetwork;
  /** Optional existing VPC to deploy into */
  vpc?: ec2.IVpc;
}

export class BitcoinStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly btcServiceGroup: ec2.ISecurityGroup;
  public readonly btcClientGroup: ec2.ISecurityGroup;
  public readonly electrumNlb: elbv2.INetworkLoadBalancer;
  public readonly bitcoinRpcAlbs: elbv2.IApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: BitcoinProps) {
    const { network, vpc: existingVpc, ...rest } = props;
    super(scope, id, props);
    const bitcoinKey = "bitcoin-core.tar.gz";
    const electrsKey = "electrs";

    // Tag all resources for the Bitcoin stack
    Tags.of(this).add("Service", "bitcoin-data");
    Tags.of(this).add("Network", props.network);

    // Import the shared binaries bucket name from BuildStack
    // const exeBucketName = cdk.Fn.importValue("SharedBinaryBucketName");
    const bucket = s3.Bucket.fromBucketName(
      this,
      "BitcoinExeBucket",
      "build-sharedbinarybucket5ed2c620-a532o2rrxyls",
    );

    // SSM Session Manager documents for interactive sessions
    new cdk.aws_ssm.CfnDocument(this, "Session", {
      content: {
        schemaVersion: "1.0",
        description: `Bitcoin ${props.network}`,
        sessionType: "Standard_Stream",
        inputs: {
          runAsEnabled: true,
          runAsDefaultUser: "ec2-user",
          idleSessionTimeout: "20",
          shellProfile: {
            linux: "cd ~ && bash",
          },
        },
      },
      name: `bitcoin-${props.network}`,
      documentFormat: "JSON",
      documentType: "Session",
    });
    new cdk.aws_ssm.CfnDocument(this, "SessionRoot", {
      content: {
        schemaVersion: "1.0",
        description: `Root access`,
        sessionType: "Standard_Stream",
        inputs: {
          runAsEnabled: true,
          runAsDefaultUser: "root",
          idleSessionTimeout: "20",
          shellProfile: {
            linux: "bash",
          },
        },
      },
      name: `bitcoin-root-${props.network}`,
      documentFormat: "JSON",
      documentType: "Session",
    });

    const vpc =
      existingVpc ??
      new ec2.Vpc(this, `Vpc-${network}`, {
        maxAzs: 3,
        subnetConfiguration: [
          { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
          {
            name: "private",
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
        ],
      });
    this.vpc = vpc;
    // 1) Build Bitcoin Core infrastructure
    const core = new BitcoinCore(this, "Core", {
      executableBucket: bucket,
      network,
      bitcoinKey,
      vpc,
    });
    this.btcServiceGroup = core.serviceGroup;

    // 2) Build Electrs infrastructure
    const electrs = new Electrs(this, "Electrs", {
      vpc,
      network,
      executableBucket: bucket,
      electrsKey,
      rpcLoadBalancerDns: core.alb.loadBalancerDnsName,
      rpcPort: networkToRpcPort(props.network),
      p2pLoadBalancerDns: core.p2pNlb.loadBalancerDnsName,
      p2pPort: networkToP2pPort(props.network),
    });
    this.btcClientGroup = electrs.serviceGroup;

    // 3) Allow Electrs instances to connect to Bitcoin P2P NLB
    core.p2pSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(electrs.serviceGroup.securityGroupId),
      ec2.Port.tcp(networkToP2pPort(props.network)),
      "Allow P2P traffic from Electrs service",
    );

    this.electrumNlb = electrs.nlb;
    this.bitcoinRpcAlbs = core.alb;
  }
}
