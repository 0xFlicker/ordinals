import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as iam from "aws-cdk-lib/aws-iam";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3a from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as log from "aws-cdk-lib/aws-logs";
import {
  networkToElectrsPort,
  networkToElectrsNetwork,
} from "../utils/transforms.js";
import path from "path";
import { fileURLToPath } from "url";
import { BitcoinNetwork } from "../utils/types.js";
import { DataVolume } from "./data-volume.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Properties for the Electrs construct. Electrs is an Electrum server implementation
 * that connects to a Bitcoin Core node.
 */
export interface ElectrsProps {
  /**
   * The VPC in which Electrs instances will live.
   */
  readonly vpc: ec2.IVpc;

  /**
   * Network name, e.g., 'mainnet' or 'testnet'.
   */
  readonly network: BitcoinNetwork;

  /**
   * S3 bucket containing the Electrs binary.
   */
  readonly executableBucket: s3.IBucket;

  /**
   * S3 key for the Electrs binary.
   */
  readonly electrsKey: string;

  /**
   * DNS name of the Bitcoin Core RPC load balancer.
   */
  readonly rpcLoadBalancerDns: string;

  /**
   * Port number for Bitcoin Core RPC.
   */
  readonly rpcPort: number;

  /**
   * DNS name of the Bitcoin Core P2P load balancer.
   */
  readonly p2pLoadBalancerDns: string;

  /**
   * Port number for Bitcoin Core P2P.
   */
  readonly p2pPort: number;

  /**
   * Enable DLM policy for data volume.
   */
  readonly enableDlmPolicy?: boolean;
}

/**
 * Construct that deploys an Electrs server with the following components:
 * - Auto Scaling Group with spot instances
 * - Network Load Balancer for client access
 * - Persistent data volume for Electrs database
 * - CloudWatch logging
 * - Security groups for RPC and P2P access
 */
export class Electrs extends Construct {
  /**
   * The Auto Scaling Group that manages Electrs instances.
   */
  public readonly asg: autoscaling.AutoScalingGroup;

  /**
   * The Network Load Balancer that distributes client traffic.
   */
  public readonly nlb: elbv2.NetworkLoadBalancer;

  /**
   * The security group for Electrs instances.
   */
  public readonly serviceGroup: ec2.ISecurityGroup;

  /**
   * The data volume construct that manages persistent storage.
   */
  private readonly dataVolume: DataVolume;

  constructor(scope: Construct, id: string, props: ElectrsProps) {
    super(scope, id);
    const {
      vpc,
      network,
      executableBucket,
      electrsKey,
      rpcLoadBalancerDns,
      rpcPort,
      p2pLoadBalancerDns,
      p2pPort,
      enableDlmPolicy,
    } = props;

    const dataVolumeSize = network === "mainnet" ? 200 : 80;

    // Create the data volume construct for persistent storage
    this.dataVolume = new DataVolume(this, "DataVolume", {
      vpc,
      mountPath: "/home/ec2-user/.electrs",
      snapshotPathComponent: `electrs_${network}`,
      defaultVolumeSize: dataVolumeSize,
      enableDlmPolicy,
    });

    // Configure IAM role with necessary permissions
    const role = this.dataVolume.role;
    if (role instanceof iam.Role) {
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      );
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy",
        ),
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["kms:Decrypt"],
          resources: [
            "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
          ],
        }),
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
        }),
      );
    }

    // Load RPC credentials from S3
    const rpcAsset = new s3a.Asset(this, "RpcSecret", {
      path: path.join(__dirname, `../../../secrets/bitflick.xyz/.env.rpc`),
    });
    executableBucket.grantRead(role);
    rpcAsset.grantRead(role);

    // Create security group for Electrs instances
    const egSG = new ec2.SecurityGroup(this, "ServiceSG", {
      vpc,
      description: "electrs SG",
    });
    this.serviceGroup = egSG;

    // Create security group and NLB for client access
    const nlbSG = new ec2.SecurityGroup(this, "NlbSG", {
      vpc,
      description: "Electrs NLB Security Group",
    });
    nlbSG.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "Allow Electrs client traffic from VPC",
    );
    nlbSG.addEgressRule(
      ec2.Peer.securityGroupId(egSG.securityGroupId),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "Forward Electrs traffic to instances",
    );

    // Create internal NLB for client access
    this.nlb = new elbv2.NetworkLoadBalancer(this, "NLB", {
      vpc,
      internetFacing: false,
      securityGroups: [nlbSG],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    const listener = this.nlb.addListener("ElectrsListener", {
      port: networkToElectrsPort(network),
      protocol: elbv2.Protocol.TCP,
    });

    // Configure user data for instance initialization
    const ud = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    ud.addCommands(...this.dataVolume.getUserDataCommands());
    ud.addCommands(
      "yum update -y",
      "yum install -y amazon-cloudwatch-agent",
      "yum install -y https://github.com/getsops/sops/releases/download/v3.10.2/sops-3.10.2-1.aarch64.rpm",
      // CloudWatch agent config for electrs logs
      "cat << 'EOF' > /opt/amazon-cloudwatch-agent.json",
      "{",
      '  "agent": { "run_as_user": "root" },',
      '  "logs": {',
      '    "logs_collected": {',
      '      "files": {',
      '        "collect_list": [',
      `          { "file_path": "/home/ec2-user/electrs.log", "log_group_name": "electrs-${network}-stdout-log", "log_stream_name": "{instance_id}" }`,
      "        ]",
      "      }",
      "    }",
      "  }",
      "}",
      "EOF",
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/amazon-cloudwatch-agent.json",
      // Create and set permissions for electrs directories
      "mkdir -p /home/ec2-user/.electrs",
      "chown -R ec2-user:ec2-user /home/ec2-user/.electrs",
      // Download and set up RPC credentials
      `aws s3 cp s3://${rpcAsset.s3BucketName}/${rpcAsset.s3ObjectKey} /home/ec2-user/.env.rpc`,
      "chown ec2-user:ec2-user /home/ec2-user/.env.rpc.*",
      // Download Electrs binary
      `aws s3 cp s3://${executableBucket.bucketName}/${electrsKey} /usr/local/bin/electrs`,
      "chmod +x /usr/local/bin/electrs",
      // Set up electrs configuration
      `echo Creating electrs.conf`,
      `RPC_ENDPOINT=${rpcLoadBalancerDns}:${rpcPort}`,
      `RPC_USER=$(sops -d /home/ec2-user/.env.rpc | grep JSON_RPC_USER | cut -d '=' -f2-)`,
      `RPC_PASS=$(sops -d /home/ec2-user/.env.rpc | grep JSON_RPC_PASSWORD | cut -d '=' -f2-)`,
      "cat << EOF > /home/ec2-user/electrs.conf",
      `daemon_rpc_addr = "$RPC_ENDPOINT"`,
      `auth = "$RPC_USER:$RPC_PASS"`,
      `daemon_p2p_addr = "${p2pLoadBalancerDns}:${p2pPort}"`,
      `network = "${networkToElectrsNetwork(network)}"`,
      `electrum_rpc_addr = "0.0.0.0:${networkToElectrsPort(network)}"`,
      `db_dir = "/home/ec2-user/.electrs"`,
      `db_log_dir = "/home/ec2-user/logs"`,
      "EOF",
      "chown ec2-user:ec2-user /home/ec2-user/electrs.conf",
      // Wait for bitcoind to be responsive before proceeding
      "echo 'Waiting for bitcoind to be ready...'",
      `until curl -s --user "$RPC_USER:$RPC_PASS" -d '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}' http://$RPC_ENDPOINT > /dev/null 2>&1; do sleep 5; echo 'Still waiting for bitcoind...'; done`,
      // Run electrs as ec2-user
      "cat << 'EOF' > /home/ec2-user/run_electrs.sh",
      "#!/bin/bash",
      "while true; do",
      "  /usr/local/bin/electrs --conf /home/ec2-user/electrs.conf >> /home/ec2-user/electrs.log 2>&1",
      '  echo "Electrs exited with code $?, restarting in 5 seconds..." >> /home/ec2-user/electrs.log',
      "  sleep 5",
      "done",
      "EOF",
      "mkdir -p $HOME/logs",
      "chmod +x /home/ec2-user/run_electrs.sh",
      "chown ec2-user:ec2-user /home/ec2-user/run_electrs.sh",
      "runuser -l ec2-user -c 'nohup /home/ec2-user/run_electrs.sh &'",
      "echo 'Electrs node is ready to serve requests'",
    );

    // Create launch template and auto scaling group
    const lt = new ec2.LaunchTemplate(this, `LT-${network}`, {
      userData: ud,
      role,
      securityGroup: egSG,
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      blockDevices: [
        { deviceName: "/dev/xvda", volume: ec2.BlockDeviceVolume.ebs(20) },
      ],
    });
    this.asg = new autoscaling.AutoScalingGroup(this, "ASG", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      mixedInstancesPolicy: {
        launchTemplate: lt,
        instancesDistribution: {
          spotAllocationStrategy:
            autoscaling.SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED,
        },
        launchTemplateOverrides: [
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.T4G,
              ec2.InstanceSize.SMALL,
            ),
          },
        ],
      },
      minCapacity: 1,
      maxCapacity: 1,
    });
    listener.addTargets("Targets", {
      port: networkToElectrsPort(network),
      targets: [this.asg],
      protocol: elbv2.Protocol.TCP,
    });

    // Configure security group rules
    egSG.addEgressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(rpcPort),
      "to bitcoind RPC",
    );
    egSG.addEgressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(p2pPort),
      "to bitcoind P2P",
    );
    egSG.addIngressRule(
      ec2.Peer.securityGroupId(nlbSG.securityGroupId),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "Allow Electrs NLB to connect to service instances",
    );

    // Create CloudWatch log groups
    new log.LogGroup(this, "electrs-stdout", {
      retention: log.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new log.LogGroup(this, "electrs-stderr", {
      retention: log.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Export NLB DNS name
    new cdk.CfnOutput(this, "ElectrsNLB", {
      exportName: `ElectrsNLB-${network}`,
      value: this.nlb.loadBalancerDnsName,
    });
  }
}
