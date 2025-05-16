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
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ElectrsProps {
  readonly vpc: ec2.IVpc;
  readonly network: BitcoinNetwork;
  readonly executableBucket: s3.IBucket;
  readonly electrsKey: string;
  readonly rpcSecretPath: string; // local path to .env.rpc.${network}
  readonly rpcLoadBalancerDns: string; // from core.alb.loadBalancerDnsName
  readonly rpcPort: number; // networkToRpcPort(network)
  readonly p2pLoadBalancerDns: string; // from core.p2pNlb.loadBalancerDnsName
  readonly p2pPort: number; // networkToP2pPort(network)
}

export class Electrs extends Construct {
  public readonly asg: autoscaling.AutoScalingGroup;
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly serviceGroup: ec2.ISecurityGroup;
  constructor(scope: Construct, id: string, props: ElectrsProps) {
    super(scope, id);
    const {
      vpc,
      network,
      executableBucket,
      electrsKey,
      rpcSecretPath,
      rpcLoadBalancerDns,
      rpcPort,
      p2pLoadBalancerDns,
      p2pPort,
    } = props;

    // 1) IAM Role
    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
    );
    const rpcAsset = new s3a.Asset(this, "RpcSecret", {
      path: path.join(__dirname, rpcSecretPath),
    });
    executableBucket.grantRead(role);
    rpcAsset.grantRead(role);
    role.addToPolicy(
      new iam.PolicyStatement({ actions: ["kms:Decrypt"], resources: ["*"] }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::*:role/sopsAdmin"],
      }),
    );

    // 2) Electrs SG
    const egSG = new ec2.SecurityGroup(this, "ServiceSG", {
      vpc,
      description: "electrs SG",
    });
    this.serviceGroup = egSG;
    // allow electrum NLB traffic once it exists
    // we’ll attach below

    // 3) Electrs NLB
    this.nlb = new elbv2.NetworkLoadBalancer(this, "NLB", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    const listener = this.nlb.addListener("ElectrsListener", {
      port: networkToElectrsPort(network),
      protocol: elbv2.Protocol.TCP,
    });

    // 4) UserData
    const ud = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    // … install sops/jq, aws s3 cp rpcAsset, build electrs.conf using rpcLoadBalancerDns:rpcPort, p2pLoadBalancerDns:p2pPort …
    ud.addCommands(
      "yum update -y",
      "yum install -y amazon-cloudwatch-agent",
      "yum install -y https://github.com/getsops/sops/releases/download/v3.10.2/sops-3.10.2-1.aarch64.rpm",
      "yum install -y jq",
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
      `aws s3 cp s3://${rpcAsset.s3BucketName}/${rpcAsset.s3ObjectKey} /home/ec2-user/.env.rpc.${network}`,
      // Download Electrs binary
      `aws s3 cp s3://${executableBucket.bucketName}/${electrsKey} /usr/local/bin/electrs`,
      `RPC_ENDPOINT=${rpcLoadBalancerDns}:${rpcPort}`,
      `RPC_USER=$(sops -d /home/ec2-user/.env.rpc.${network} | jq -r .JSON_RPC_USER)`,
      `RPC_PASS=$(sops -d /home/ec2-user/.env.rpc.${network} | jq -r .JSON_RPC_PASSWORD)`,
      "cat << EOF > /home/ec2-user/electrs.conf",
      `rpc_addr = "$RPC_ENDPOINT"`,
      `rpc_user = "$RPC_USER"`,
      `rpc_pass = "$RPC_PASS"`,
      `daemon_p2p_addr = "${p2pLoadBalancerDns}:${p2pPort}"`,
      `network = "${networkToElectrsNetwork(network)}"`,
      `electrum_rpc_addr = "0.0.0.0:${networkToElectrsPort(network)}"`,
      `db_dir = "/home/ec2-user/.electrs"`,
      "EOF",
      "chmod +x /usr/local/bin/electrs",
      "nohup /usr/local/bin/electrs --conf /home/ec2-user/electrs.conf >> /home/ec2-user/electrs.log 2>&1 &",
    );

    // 5) Launch & ASG
    const lt = new ec2.LaunchTemplate(this, `LT-${network}`, {
      userData: ud,
      role,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
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
              ec2.InstanceSize.NANO,
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

    // 6) Wire SGs
    // allow electrs SG -> bitcoind RPC
    egSG.addEgressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(rpcPort),
      "to bitcoind RPC",
    );
    // allow electrs SG -> bitcoind p2p
    egSG.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(p2pPort),
      "from P2P NLB",
    );

    // 7) CloudWatch log groups for Electrs
    new log.LogGroup(this, "electrs-stdout", {
      retention: log.RetentionDays.TWO_WEEKS,
      logGroupName: `electrs-${network}-stdout-log`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new log.LogGroup(this, "electrs-stderr", {
      retention: log.RetentionDays.TWO_WEEKS,
      logGroupName: `electrs-${network}-stderr-log`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "ElectrsNLB", {
      exportName: `ElectrsNLB-${network}`,
      value: this.nlb.loadBalancerDnsName,
    });
  }
}
