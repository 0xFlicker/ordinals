import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3a from "aws-cdk-lib/aws-s3-assets";
import * as sns from "aws-cdk-lib/aws-sns";
import * as log from "aws-cdk-lib/aws-logs";
import {
  networkToRpcPort,
  networkToP2pPort,
  networkToBitcoinFlags,
} from "../utils/transforms.js";
import path from "path";
import { fileURLToPath } from "url";
import { BitcoinNetwork } from "../utils/types.js";
import { DataVolume } from "./data-volume.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BitcoinCoreProps {
  readonly executableBucket: s3.IBucket;
  readonly network: BitcoinNetwork;
  readonly bitcoinKey: string;
  readonly vpc: ec2.IVpc;
  readonly enableDlmPolicy?: boolean;
}

export class BitcoinCore extends Construct {
  public readonly serviceGroup: ec2.ISecurityGroup;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly p2pNlb: elbv2.NetworkLoadBalancer;
  public readonly asg: autoscaling.AutoScalingGroup;
  public readonly p2pSecurityGroup: ec2.ISecurityGroup;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: BitcoinCoreProps) {
    super(scope, id);
    const { executableBucket, network, bitcoinKey, vpc, enableDlmPolicy } =
      props;

    // Configure data volume for blockchain data and assign IAM role
    const dataDir = `/home/ec2-user/.bitcoin_${network}`;
    const dataVolumeSize = network === "mainnet" ? 1000 : 200;
    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    const dataVolume = new DataVolume(this, "DataVolume", {
      vpc,
      mountPath: dataDir,
      snapshotPathComponent: network,
      defaultVolumeSize: dataVolumeSize,
      enableDlmPolicy,
    });
    const role = (this.role = dataVolume.role);
    userData.addCommands(...dataVolume.getUserDataCommands());
    if (this.role instanceof iam.Role) {
      this.role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      );
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy",
        ),
      );
      role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["kms:Decrypt"],
          resources: [
            "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
          ],
        }),
      );
      role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
        }),
      );
    }

    const btcServiceGroup = new ec2.SecurityGroup(this, "BitcoinServiceSG", {
      vpc,
      description: "bitcoind SG",
    });
    this.serviceGroup = btcServiceGroup;

    const bitcoindArchive = userData.addS3DownloadCommand({
      bucket: executableBucket,
      bucketKey: bitcoinKey,
    });
    // generate CloudWatch agent config inline for log collection
    userData.addCommands(
      "cat << 'EOF' > /opt/amazon-cloudwatch-agent.json",
      "{",
      '  "agent": { "run_as_user": "root" },',
      '  "logs": {',
      '    "logs_collected": {',
      '      "files": {',
      '        "collect_list": [',
      `          { "file_path": "/home/ec2-user/bitcoin.log", "log_group_name": "bitcoin-${network}-stdout-log", "log_stream_name": "{instance_id}" }`,
      "        ]",
      "      }",
      "    }",
      "  }",
      "}",
      "EOF",
    );
    // Inline initialization for node binaries and blockchain data
    userData.addCommands(
      `BITCOIN_ARCHIVE=${bitcoindArchive}`,
      `BITCOIN_FOLDER=$(dirname "$BITCOIN_ARCHIVE")`,
      "# extract bitcoin binaries",
      'cd "$BITCOIN_FOLDER"',
      'tar -xzf "$BITCOIN_ARCHIVE"',
      "mv bitcoind bitcoin-cli /usr/local/bin/",
      'rm -f "$BITCOIN_ARCHIVE"',
    );
    // Write bitcoin.conf with network section and RPC settings
    const confLines = [
      network !== "mainnet" ? `[${network}]` : "",
      "txindex=1",
      "prune=0",
      "server=1",
      `rpcallowip=${vpc.vpcCidrBlock}`,
      "rpcbind=0.0.0.0",
    ];
    userData.addCommands(
      `cat << EOF > ${dataDir}/bitcoin.conf`,
      ...confLines,
      "EOF",
      `chown ec2-user:ec2-user ${dataDir}/bitcoin.conf`,
    );

    // 3) Application Load Balancer for RPC
    const albSG = new ec2.SecurityGroup(this, "ALB-SG", { vpc });
    albSG.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(networkToRpcPort(network)),
      "RPC from VPC",
    );
    albSG.addEgressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(networkToRpcPort(network)),
      "to bitcoind",
    );
    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: false,
      securityGroup: albSG,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    const rpcListener = this.alb.addListener("Listener", {
      port: networkToRpcPort(network),
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // 4) P2P Network Load Balancer
    const p2pPort = networkToP2pPort(network);
    // P2P Security Group
    const p2pSG = new ec2.SecurityGroup(this, "P2P-SG", {
      vpc,
      description: "P2P NLB SG",
    });
    // egress to Bitcoin nodes P2P port
    p2pSG.addEgressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(p2pPort),
      "to bitcoind p2p",
    );
    p2pSG.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8080),
      "to health check server",
    );
    this.p2pSecurityGroup = p2pSG;
    this.p2pNlb = new elbv2.NetworkLoadBalancer(this, "P2P-NLB", {
      vpc,
      internetFacing: false,
      securityGroups: [p2pSG],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    const p2pListener = this.p2pNlb.addListener("P2PListener", {
      port: p2pPort,
      protocol: elbv2.Protocol.TCP,
    });

    // 5) Secret Asset for bitcoind RPC auth
    const secretAsset = new s3a.Asset(this, "CoreSecret", {
      path: path.join(__dirname, "../../../secrets/bitflick.xyz/.env.bitcoin"),
    });
    secretAsset.grantRead(role);
    // Grant read access to executables as well
    executableBucket.grantRead(role);

    // Additional commands: install CloudWatch agent, SOPS, fetch RPC secret, start CloudWatch agent, health scripts, start bitcoind
    userData.addCommands(
      "yum update -y",
      "yum install -y amazon-cloudwatch-agent nc",
      // TODO: Replace with cosign-verified SOPS binary install
      "yum install -y https://github.com/getsops/sops/releases/download/v3.10.2/sops-3.10.2-1.aarch64.rpm",
      // Fetch encrypted dotenv with RPC auth
      `aws s3 cp s3://${secretAsset.s3BucketName}/${secretAsset.s3ObjectKey} /home/ec2-user/.env.bitcoin`,
      // Start CloudWatch agent
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/amazon-cloudwatch-agent.json",
      // Create a script that will check if bitcoind is ready
      "cat << 'EOF' > /home/ec2-user/check_bitcoin_ready.sh",
      "#!/bin/bash",
      `bitcoin-cli -datadir=/home/ec2-user/.bitcoin_${network} ${networkToBitcoinFlags(
        network,
      )} getblockchaininfo > /dev/null 2>&1`,
      "if [ $? -eq 0 ]; then",
      "  # Bitcoin is ready, return HTTP 200",
      '  echo -e "HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\nConnection: close\\r\\n\\r\\nBitcoin Ready"',
      "else",
      "  # Bitcoin is not ready, return HTTP 503",
      '  echo -e "HTTP/1.1 503 Service Unavailable\\r\\nContent-Type: text/plain\\r\\nConnection: close\\r\\n\\r\\nBitcoin Not Ready"',
      "fi",
      "EOF",
      "chmod +x /home/ec2-user/check_bitcoin_ready.sh",
      // Start a simple health check server on port 8080
      "cat << 'EOF' > /home/ec2-user/health_server.sh",
      "#!/bin/bash",
      "while true; do",
      "  echo 'Starting health check server on port 8080'",
      "  nc -l 8080 -c '/home/ec2-user/check_bitcoin_ready.sh'",
      "done",
      "EOF",
      "chmod +x /home/ec2-user/health_server.sh",
      "nohup /home/ec2-user/health_server.sh > /home/ec2-user/health_server.log 2>&1 &",
      // Start bitcoind
      `runuser -l ec2-user -c 'bitcoind -datadir=/home/ec2-user/.bitcoin_${network} ${networkToBitcoinFlags(
        network,
      )} -rpcauth=$(sops -d /home/ec2-user/.env.bitcoin | grep BITCOIN_RPC_AUTH | cut -d'=' -f2-) -debuglogfile=/home/ec2-user/bitcoin.log -daemonwait'`,
      // Wait for bitcoind to be responsive before proceeding
      "echo 'Waiting for bitcoind to be ready...'",
      `until runuser -l ec2-user -c 'bitcoin-cli -datadir=/home/ec2-user/.bitcoin_${network} ${networkToBitcoinFlags(
        network,
      )} getblockchaininfo' > /dev/null 2>&1; do sleep 5; echo 'Still waiting for bitcoind...'; done`,
      "echo 'Bitcoin node is ready to serve requests'",
    );
    const lt = new ec2.LaunchTemplate(this, `LT-${network}`, {
      userData,
      role,
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      blockDevices: [
        { deviceName: "/dev/xvda", volume: ec2.BlockDeviceVolume.ebs(20) },
      ],
      securityGroup: btcServiceGroup,
      associatePublicIpAddress: true,
    });

    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSG.securityGroupId),
      ec2.Port.tcp(networkToRpcPort(network)),
      "RPC from VPC",
    );

    btcServiceGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(networkToP2pPort(network)),
      "P2P from World",
    );

    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSG.securityGroupId),
      ec2.Port.tcp(8080),
      "to ALB health check server",
    );

    // 7) Bitcoin ASG
    this.asg = new autoscaling.AutoScalingGroup(this, "Asg", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      mixedInstancesPolicy: {
        launchTemplate: lt,
        instancesDistribution: {
          onDemandBaseCapacity: 1,
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
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.T4G,
              ec2.InstanceSize.MEDIUM,
            ),
          },
        ],
      },
      minCapacity: 1,
      maxCapacity: 1,
      healthChecks: autoscaling.HealthChecks.ec2({
        gracePeriod: cdk.Duration.minutes(30),
      }),
      notifications: [
        {
          topic: new sns.Topic(this, "AsgTerminationTopic"),
          scalingEvents: autoscaling.ScalingEvents.TERMINATION_EVENTS,
        },
      ],
    });

    rpcListener.addTargets("RPC-TG", {
      port: networkToRpcPort(network),
      targets: [this.asg],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        enabled: true,
        path: "/",
        port: "8080",
        healthyHttpCodes: "200",
        interval: cdk.Duration.seconds(60),
      },
    });

    p2pListener.addTargets("P2P-TG", {
      port: p2pPort,
      targets: [this.asg],
      protocol: elbv2.Protocol.TCP,
      healthCheck: {
        enabled: true,
        protocol: elbv2.Protocol.TCP,
        port: `${p2pPort}`,
        interval: cdk.Duration.seconds(30),
      },
    });

    // 8) CloudWatch log groups for Bitcoin Core
    new log.LogGroup(this, "stdout", {
      retention: log.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new log.LogGroup(this, "stderr", {
      retention: log.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 9) Outputs
    new cdk.CfnOutput(this, "BitcoinALB", {
      exportName: `BitcoinALB-${network}`,
      value: this.alb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "BitcoinP2PNLB", {
      exportName: `BitcoinP2PNLB-${network}`,
      value: this.p2pNlb.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, "BtcServiceGroup", {
      exportName: `BtcServiceGroup-${network}`,
      value: this.serviceGroup.securityGroupId,
    });
  }
}
