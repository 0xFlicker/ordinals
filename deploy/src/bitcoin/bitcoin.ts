import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BitcoinNetwork } from "../utils/types.js";
import { BitcoinCore, BitcoinCoreProps } from "./core.js";
import { Electrs, ElectrsProps } from "./electrs.js";
import { networkToRpcPort, networkToP2pPort } from "../utils/transforms.js";

export interface BitcoinProps {
  /** S3 key for Electrs binary */
  electrsKey: string;
  /** Path to RPC secret (e.g. .env.rpc.${network}) */
  rpcSecretPath: string;
  /** Existing VPC to use */
  existingVpc?: ec2.IVpc;
  /** Bitcoin network */
  network: BitcoinNetwork;
  /** S3 bucket for executables */
  executableBucket: s3.IBucket;
  /** Bitcoin key */
  bitcoinKey: string;
  /** Node key */
  nodeKey: string;
}

export class Bitcoin extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly btcServiceGroup: ec2.ISecurityGroup;
  public readonly btcClientGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: BitcoinProps) {
    super(scope, id);

    // Tag all resources for the Bitcoin stack
    Tags.of(this).add("Service", "bitcoin-data");
    Tags.of(this).add("Network", props.network);

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
      props.existingVpc ??
      new ec2.Vpc(this, `Vpc-${props.network}`, {
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
      executableBucket: props.executableBucket,
      network: props.network,
      bitcoinKey: props.bitcoinKey,
      nodeKey: props.nodeKey,
      vpc,
    });
    this.btcServiceGroup = core.serviceGroup;

    // 2) Build Electrs infrastructure
    const electrs = new Electrs(this, "Electrs", {
      vpc,
      network: props.network,
      executableBucket: props.executableBucket,
      electrsKey: props.electrsKey,
      rpcSecretPath: props.rpcSecretPath,
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
  }
}
