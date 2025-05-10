import { Construct } from "constructs";
// readFileSync removed; inline configs now
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3a from "aws-cdk-lib/aws-s3-assets";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as log from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { buildSync } from "esbuild";
// handlebars templating removed; configs inline
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Network = "test" | "testnet4" | "mainnet";

export class BitcoinStorage extends Construct {
  readonly blockchainDataBucket: s3.IBucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.blockchainDataBucket = new s3.Bucket(this, "DataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}

interface BitcoinProps {
  /** S3 bucket containing the Bitcoin/Electrs executables */
  executableBucket: s3.IBucket;
  /** Target Bitcoin network */
  network: Network;
  /** S3 bucket for blockchain data storage */
  blockchainDataBucket: s3.IBucket;
  /** S3 key for Bitcoin Core archive */
  bitcoinKey: string;
  /** S3 key for Electrs binary */
  electrsKey: string;
  /** S3 key for Node binary archive */
  nodeKey: string;
  /** Optional existing VPC to adopt instead of creating a new one */
  existingVpc?: ec2.IVpc;
}

/**
 * Create (or adopt) a public VPC along with Bitcoin-specific security groups.
 * @param scope     the parent construct
 * @param network   the Bitcoin network identifier
 * @param existingVpc optional existing VPC to adopt; if provided, no new VPC is created
 */
function createPublicVpc(
  scope: Construct,
  network: Network,
  existingVpc?: ec2.IVpc,
) {
  // Use existing VPC if supplied, otherwise create a new one
  const vpc: ec2.IVpc =
    existingVpc ??
    new ec2.Vpc(scope, `BitcoinVPC-${network}`, {
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "asterisk",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

  const btcServiceGroup = new ec2.SecurityGroup(
    scope,
    `SecurityGroup-${network}`,
    {
      vpc,
      description: "Btc security group.",
    },
  );

  const btcClientGroup = new ec2.SecurityGroup(
    scope,
    `SecurityGroup-${network}-client`,
    {
      vpc,
      description: "Btc client security group.",
    },
  );
  if (network === "test") {
    btcServiceGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(18333),
      "allow p2p public",
    );
    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(btcClientGroup.securityGroupId),
      ec2.Port.tcp(60001),
      "allow electrum client",
    );
  } else if (network === "testnet4") {
    btcServiceGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(48333),
      "allow p2p public",
    );
    btcClientGroup.addIngressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(60002),
      "allow electrum client",
    );
  } else if (network === "mainnet") {
    btcServiceGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8333),
      "allow p2p public",
    );
    btcClientGroup.addIngressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(50001),
      "allow electrum client",
    );
  }
  return { vpc, btcServiceGroup, btcClientGroup };
}

function createBtcUserData({
  executableBucket,
  bitcoinKey,
  blockchainDataBucket,
  electrsKey,
  network,
  nodeKey,
  vpc,
}: {
  executableBucket: s3.IBucket;
  bitcoinKey: string;
  blockchainDataBucket: s3.IBucket;
  electrsKey: string;
  network: Network;
  nodeKey: string;
  vpc: ec2.IVpc;
}) {
  const userData = ec2.UserData.forLinux({
    shebang: "#!/bin/bash",
  });
  const nodeArchivePath = userData.addS3DownloadCommand({
    bucket: executableBucket,
    bucketKey: nodeKey,
  });

  // Prepare data directory for blockchain
  const dataDir = `/home/ec2-user/.bitcoin_${network}`;
  userData.addCommands(`mkdir -p ${dataDir}`);
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
    `          { "file_path": "/home/ec2-user/bitcoin.log", "log_group_name": "bitcoin-${network}-stdout-log", "log_stream_name": "{instance_id}" },`,
    `          { "file_path": "/home/ec2-user/electrs.log", "log_group_name": "electrs-${network}-stdout-log", "log_stream_name": "{instance_id}" }`,
    "        ]",
    "      }",
    "    }",
    "  }",
    "}",
    "EOF",
  );

  userData.addS3DownloadCommand({
    bucket: executableBucket,
    bucketKey: electrsKey,
    localFile: "/usr/local/bin/electrs",
  });
  userData.addCommands("chmod +x /usr/local/bin/electrs");

  const electrsConf = [
    `cookie_file = "/home/ec2-user/.bitcoin_${network}/${network}/.cookie"`,
    `db_dir = "/home/ec2-user/db"`,
    `network = "${networkToElectrsNetwork(network)}"`,
    `electrum_rpc_addr = "0.0.0.0:${networkToElectrsPort(network)}"`,
    `log_filters = "INFO"`,
  ];
  userData.addCommands(
    `cat << EOF > /home/ec2-user/electrs.conf`,
    ...electrsConf,
    `EOF`,
  );

  // Inline initialization for node binaries, blockchain, and electrs data
  const dataDirS3 = `s3://${blockchainDataBucket.bucketName}/${network}.tar.gz`;
  const electrsDataDir = "/home/ec2-user/db";
  const electrsDataS3 = `s3://${blockchainDataBucket.bucketName}/electrs-${network}.tar.gz`;
  userData.addCommands(
    `NODE_ARCHIVE=${nodeArchivePath}`,
    `NODE_FOLDER=$(dirname "$NODE_ARCHIVE")`,
    `BITCOIN_ARCHIVE=${bitcoindArchive}`,
    `BITCOIN_FOLDER=$(dirname "$BITCOIN_ARCHIVE")`,
    `DATA_DIR_S3=${dataDirS3}`,
    `DATA_DIR=${dataDir}`,
    `ELECTRS_INDEX_DATA_S3=${electrsDataS3}`,
    `ELECTRS_INDEX_DATA=${electrsDataDir}`,
    "",
    "# extract node binaries",
    'cd "$NODE_FOLDER"',
    'tar -xJf "$NODE_ARCHIVE"',
    "mv node*/bin/* /usr/local/bin",
    "rm -rf node-*",
    "",
    "# extract electrs index data",
    'mkdir -p "$ELECTRS_INDEX_DATA"',
    'cd "$ELECTRS_INDEX_DATA"',
    'aws s3 cp "$ELECTRS_INDEX_DATA_S3" - | tar -xzf -',
    "",
    "# extract bitcoin binaries",
    'cd "$BITCOIN_FOLDER"',
    'tar -xzf "$BITCOIN_ARCHIVE"',
    "mv bitcoind bitcoin-cli /usr/local/bin/",
    'rm -f "$BITCOIN_ARCHIVE"',
    "",
    "# extract blockchain data",
    `mkdir -p /home/ec2-user/.bitcoin`,
    `mkdir -p "${dataDir}"`,
    `cd "${dataDir}"`,
    'aws s3 cp "$DATA_DIR_S3" - | tar -xzf -',
    "",
    "# assign ownership",
    `chown -R ec2-user:ec2-user /home/ec2-user/.bitcoin`,
    `chown -R ec2-user:ec2-user "${dataDir}"`,
    `chown -R ec2-user:ec2-user "${electrsDataDir}"`,
  );
  // Write bitcoin.conf with network and RPC settings
  const confLines = [
    `[${network}]`,
    `datadir=${dataDir}`,
    `txindex=1`,
    `prune=0`,
    `server=1`,
    `rpcallowip=${vpc.vpcCidrBlock}`,
    `rpcbind=0.0.0.0`,
    `debug=rpc`,
  ];
  userData.addCommands(
    `cat << EOF > /home/ec2-user/.bitcoin/bitcoin.conf`,
    ...confLines,
    `EOF`,
    `chown ec2-user:ec2-user /home/ec2-user/.bitcoin/bitcoin.conf`,
  );

  // ensure cron is installed for backup scheduling
  userData.addCommands("yum install -y cronie");

  // Create backup script and cron job for periodic S3 backups
  userData.addCommands(
    "cat << 'EOF' > /home/ec2-user/backup.sh",
    "#!/bin/bash",
    `AWS_BUCKET=${blockchainDataBucket.bucketName}`,
    `DATA_DIR=/home/ec2-user/.bitcoin_${network}`,
    `ELECTRS_DIR=/home/ec2-user/db`,
    "",
    "set -e",
    "pkill electrs || true",
    "bitcoin-cli stop",
    "sleep 10",
    "# backup blockchain data via streaming tar",
    `tar cz -C $DATA_DIR . | aws s3 cp - s3://$AWS_BUCKET/${network}.tar.gz`,
    "# backup electrs index data via streaming tar",
    `tar cz -C $ELECTRS_DIR . | aws s3 cp - s3://$AWS_BUCKET/electrs-${network}.tar.gz`,
    "# restart services",
    `runuser -l ec2-user -c 'bitcoind ${networkToBitcoinFlags(
      network,
    )} -rpcauth=$(sops -d /home/ec2-user/.env.bitcoin | grep BITCOIN_RPC_AUTH | cut -d= -f2) -debuglogfile=/home/ec2-user/bitcoin.log -daemonwait'`,
    "sleep 10",
    `runuser -l ec2-user -c '/usr/local/bin/electrs --conf /home/ec2-user/electrs.conf >> /home/ec2-user/electrs.log 2>&1 &'`,
    "EOF",
    "chmod +x /home/ec2-user/backup.sh",
    `echo "0 3 * * * /home/ec2-user/backup.sh >> /home/ec2-user/backup.log 2>&1" | crontab -u ec2-user -`,
  );

  return userData;
}

function createLaunchTemplate({
  context,
  userData,
  role,
  securityGroup,
  spotOptions,
  network,
}: {
  context: Construct;
  userData: ec2.UserData;
  role: iam.IRole;
  securityGroup: ec2.ISecurityGroup;
  spotOptions?: cdk.aws_ec2.LaunchTemplateSpotOptions;
  network: Network;
}) {
  // Determine data volume size based on network
  const dataVolumeSize =
    network === "mainnet" ? 600 : network === "testnet4" ? 200 : 50;
  return new ec2.LaunchTemplate(context, "LaunchTemplate", {
    userData,
    role,
    machineImage: ec2.MachineImage.latestAmazonLinux2023({
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    }),
    blockDevices: [
      {
        deviceName: "/dev/xvda",
        volume: ec2.BlockDeviceVolume.ebs(dataVolumeSize, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      },
    ],
    spotOptions,
    securityGroup,
    associatePublicIpAddress: true,
  });
}

function networkToBitcoinFlags(network: Network) {
  switch (network) {
    case "test":
      return "-testnet";
    case "testnet4":
      return "-testnet4";
    case "mainnet":
      return "";
  }
}

function networkToElectrsNetwork(network: Network) {
  switch (network) {
    case "test":
      return "testnet";
    default:
      return network;
  }
}

function networkToElectrsPort(network: Network) {
  switch (network) {
    case "test":
      return 60001;
    case "testnet4":
      return 60002;
    case "mainnet":
      return 50001;
  }
}
export class Bitcoin extends Construct {
  readonly vpc: ec2.IVpc;
  readonly btcServiceGroup: ec2.ISecurityGroup;
  readonly btcClientGroup: ec2.ISecurityGroup;
  constructor(
    scope: Construct,
    id: string,
    {
      network,
      blockchainDataBucket,
      executableBucket,
      bitcoinKey,
      electrsKey,
      nodeKey,
      existingVpc,
    }: BitcoinProps,
  ) {
    super(scope, id);
    // Simplified health-check: rely on ALB HTTP health-check against bitcoind RPC (200 or 401)
    new cdk.aws_ssm.CfnDocument(this, "Session", {
      content: {
        schemaVersion: "1.0",
        description: `Bitcoin ${network}`,
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
      name: `bitcoin-${network}`,
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
      name: `bitcoin-root-${network}`,
      documentFormat: "JSON",
      documentType: "Session",
    });

    const role = new iam.Role(this, `ec2Role-${network}`, {
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

    const { vpc, btcServiceGroup, btcClientGroup } = createPublicVpc(
      this,
      network,
      existingVpc,
    );
    this.vpc = vpc;
    this.btcServiceGroup = btcServiceGroup;
    this.btcClientGroup = btcClientGroup;

    // Create an Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(
      this,
      `BitcoinALBSecurityGroup-${network}`,
      {
        vpc,
        description: "Bitcoin ALB security group.",
      },
    );
    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      `BitcoinALB-${network}`,
      {
        vpc,
        internetFacing: false,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      },
    );
    alb.addSecurityGroup(albSecurityGroup);

    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(8080),
      "allow health check",
    );
    // allow bitcoind RPC from the ALB
    const rpcPort =
      network === "test" ? 18332 : network === "testnet4" ? 48332 : 8332;
    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(rpcPort),
      "allow RPC from ALB",
    );

    const nlb = new elbv2.NetworkLoadBalancer(this, "NLB", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    // allow electrs TCP traffic from VPC (NLB preserves client IP)
    btcServiceGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "allow electrs from VPC subnets",
    );

    executableBucket.grantRead(role);
    blockchainDataBucket.grantReadWrite(role);

    // SOPS-encrypted RPC auth secret asset
    const secretAsset = new s3a.Asset(this, "BitcoinRpcSecret", {
      path: path.join(__dirname, "../../../secrets/bitflick.xyz/.env.bitcoin"),
    });
    secretAsset.grantRead(role);
    // Allow decrypting the SOPS file via KMS
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: [
          "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
        ],
      }),
    );
    // Allow SOPS process to assume sopsAdmin role for KMS master key access
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
      }),
    );

    const userData = createBtcUserData({
      executableBucket,
      bitcoinKey,
      blockchainDataBucket,
      electrsKey,
      network,
      nodeKey,
      vpc,
    });

    // Add a listener to the ALB
    const rpcListener = alb.addListener(`Listener-${network}`, {
      port: network === "test" ? 18332 : network === "testnet4" ? 48332 : 8332,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
    });

    const electrsListener = nlb.addListener("ElectrsListener", {
      port: networkToElectrsPort(network),
      protocol: elbv2.Protocol.TCP,
    });

    // const electrumListener = alb.addListener("Listener-electrum", {
    //   port: network === "testnet" ? 60001 : 50001,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   open: true,
    // });

    // const electrumSslListener = alb.addListener("Listener-electrum", {
    //   port: network === "testnet" ? 60002 : 50002,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   sslPolicy: elbv2.SslPolicy.RECOMMENDED,
    //   open: true,
    // });

    // Define an EC2 Auto Scaling Group with Spot Instances
    const asg = new autoscaling.AutoScalingGroup(this, "Asg", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      // Use ELB health check with extended grace period to allow initial syncing
      healthCheck: autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(15),
      }),
      mixedInstancesPolicy: {
        launchTemplate: createLaunchTemplate({
          context: this,
          userData,
          role,
          securityGroup: btcServiceGroup,
          network,
        }),
        instancesDistribution: {
          // Ensure one on-demand instance for reliable priming
          onDemandBaseCapacity: 1,
          onDemandPercentageAboveBaseCapacity: 0,
          onDemandAllocationStrategy:
            autoscaling.OnDemandAllocationStrategy.LOWEST_PRICE,
          spotAllocationStrategy:
            autoscaling.SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED,
        },
        launchTemplateOverrides: [
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.M7G,
              ec2.InstanceSize.LARGE,
            ),
          },
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.M6G,
              ec2.InstanceSize.LARGE,
            ),
          },
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.T4G,
              ec2.InstanceSize.LARGE,
            ),
          },
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.M7G,
              ec2.InstanceSize.MEDIUM,
            ),
          },
          {
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.M6G,
              ec2.InstanceSize.MEDIUM,
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
      minCapacity: 2,
    });

    // Pre-launch: install SOPS, decrypt secrets, start services
    asg.addUserData(
      "yum update -y",
      "yum install -y amazon-cloudwatch-agent",
      // Install SOPS for decrypting secrets
      "yum install -y https://github.com/getsops/sops/releases/download/v3.10.2/sops-3.10.2-1.aarch64.rpm",
      // Fetch encrypted dotenv with RPC auth
      `aws s3 cp s3://${secretAsset.s3BucketName}/${secretAsset.s3ObjectKey} /home/ec2-user/.env.bitcoin`,
      // Start CloudWatch agent
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/amazon-cloudwatch-agent.json",
      `runuser -l ec2-user -c 'bitcoind ${networkToBitcoinFlags(
        network,
      )} -rpcauth=$(sops -d /home/ec2-user/.env.bitcoin | grep BITCOIN_RPC_AUTH | cut -d'=' -f2-) -debuglogfile=/home/ec2-user/bitcoin.log -daemonwait'`,
      // Give bitcoind time to initialize
      "sleep 60",
      // Launch electrs
      `runuser -l ec2-user -c '/usr/local/bin/electrs --conf /home/ec2-user/electrs.conf >> /home/ec2-user/electrs.log 2>&1 &'`,
    );

    // Health-check directly against bitcoind RPC (treat 200 or 401 as healthy)
    rpcListener.addTargets(`BitcoinTarget-${network}`, {
      port: network === "test" ? 18332 : network === "testnet4" ? 48332 : 8332,
      targets: [asg],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        enabled: true,
        port: `${
          network === "test" ? 18332 : network === "testnet4" ? 48332 : 8332
        }`,
        path: "/",
        healthyHttpCodes: "200,401",
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 2,
      },
    });

    electrsListener.addTargets("ElectrsTargets", {
      port: networkToElectrsPort(network),
      protocol: elbv2.Protocol.TCP,
      targets: [asg],
    });

    new log.LogGroup(this, "stdout", {
      retention: log.RetentionDays.TWO_WEEKS,
      logGroupName: `bitcoin-${network}-stdout-log`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new log.LogGroup(this, "stderr", {
      retention: log.RetentionDays.TWO_WEEKS,
      logGroupName: `bitcoin-${network}-stderr-log`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
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

    new cdk.CfnOutput(this, "BitcoinALB", {
      exportName: `BitcoinALB-${network}`,
      value: alb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "BitcoinNLB", {
      exportName: `BitcoinNLB-${network}`,
      value: nlb.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, "BtcClientGroup", {
      exportName: `BtcClientGroup-${network}`,
      value: btcClientGroup.securityGroupId,
    });
    new cdk.CfnOutput(this, "BtcServiceGroup", {
      exportName: `BtcServiceGroup-${network}`,
      value: btcServiceGroup.securityGroupId,
    });
  }
}
