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
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Aws, Tags } from "aws-cdk-lib";
import * as dlm from "aws-cdk-lib/aws-dlm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
// handlebars templating removed; configs inline
import path from "path";
import { fileURLToPath } from "url";
import { BitcoinNetwork } from "../utils/types.js";
import {
  networkToBitcoinFlags,
  networkToElectrsPort,
  networkToRpcPort,
} from "../utils/transforms.js";
import { networkToElectrsNetwork } from "../utils/transforms.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BitcoinProps {
  /** S3 bucket containing the Bitcoin/Electrs executables */
  executableBucket: s3.IBucket;
  /** Target Bitcoin network */
  network: BitcoinNetwork;
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
  network: BitcoinNetwork,
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
  return { vpc, btcServiceGroup };
}

function createBtcUserData({
  executableBucket,
  bitcoinKey,
  electrsKey,
  network,
  nodeKey,
  vpc,
}: {
  executableBucket: s3.IBucket;
  bitcoinKey: string;
  electrsKey: string;
  network: BitcoinNetwork;
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
  // Create or restore data volume and mount it
  const dataVolumeSize = network === "mainnet" ? 700 : 200;
  userData.addCommands(
    "# fetch IMDSv2 token",
    "TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds:21600')",
    "# retrieve availability zone",
    'AZ=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)',
    "if [ -z \"$AZ\" ]; then echo 'ERROR: AZ not found'; exit 1; fi",
    "# try to get the latest seed snapshot",
    `if ! SNAP_ID=$(aws ssm get-parameter --name /bitcoin/${network}/latestSnapshot --query Parameter.Value --output text 2>/dev/null); then
  echo 'No seed snapshot, creating new volume';
  VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --size ${dataVolumeSize} --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=bitcoin-data},{Key=Chain,Value=${network}}]' --query VolumeId --output text)
else
  echo 'Restoring from snapshot $SNAP_ID';
  VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --snapshot-id $SNAP_ID --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=bitcoin-data},{Key=Chain,Value=${network}}]' --query VolumeId --output text)
fi`,
    "aws ec2 wait volume-available --volume-ids $VOL_ID",
    'INSTANCE_ID=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)',
    "aws ec2 attach-volume --volume-id $VOL_ID --device /dev/xvdb --instance-id $INSTANCE_ID",
    // Ensure data volume is deleted when the instance terminates to avoid orphaned volumes
    `aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --block-device-mappings '[{"DeviceName":"/dev/xvdb","Ebs":{"DeleteOnTermination":true}}]'`,
    "# only seed role tags for DLM",
    'INSTANCE_LC=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-life-cycle 2>/dev/null || echo on-demand)',
    'if [ "$INSTANCE_LC" != "spot" ]; then',
    "  aws ec2 create-tags --resources $VOL_ID --tags Key=SnapshotRole,Value=seed",
    "fi",
    "# mount the data device",
    "if [ -b /dev/xvdb ]; then DATA_DEVICE=/dev/xvdb; else DATA_DEVICE=/dev/nvme1n1; fi",
    `DATA_DIR=${dataDir}`,
    "while [ ! -b $DATA_DEVICE ]; do sleep 1; done",
    "if ! blkid $DATA_DEVICE; then mkfs.ext4 $DATA_DEVICE; fi",
    "mount $DATA_DEVICE $DATA_DIR",
    "grep -q '$DATA_DEVICE' /etc/fstab || echo '$DATA_DEVICE $DATA_DIR ext4 defaults,nofail 0 2' >> /etc/fstab",
    "chown -R ec2-user:ec2-user $DATA_DIR",
    "mkdir -p $DATA_DIR/electrs",
    "chown -R ec2-user:ec2-user $DATA_DIR/electrs",
  );
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
    `db_dir = "${dataDir}/electrs"`,
    `network = "${networkToElectrsNetwork(network)}"`,
    `electrum_rpc_addr = "0.0.0.0:${networkToElectrsPort(network)}"`,
    `log_filters = "INFO"`,
  ];
  userData.addCommands(
    `cat << EOF > /home/ec2-user/electrs.conf`,
    ...electrsConf,
    `EOF`,
  );

  // Inline initialization for node binaries and blockchain data
  userData.addCommands(
    `NODE_ARCHIVE=${nodeArchivePath}`,
    `NODE_FOLDER=$(dirname "$NODE_ARCHIVE")`,
    `BITCOIN_ARCHIVE=${bitcoindArchive}`,
    `BITCOIN_FOLDER=$(dirname "$BITCOIN_ARCHIVE")`,
    "",
    "# extract node binaries",
    'cd "$NODE_FOLDER"',
    'tar -xJf "$NODE_ARCHIVE"',
    "mv node*/bin/* /usr/local/bin",
    "rm -rf node-*",
    "",
    "# extract bitcoin binaries",
    'cd "$BITCOIN_FOLDER"',
    'tar -xzf "$BITCOIN_ARCHIVE"',
    "mv bitcoind bitcoin-cli /usr/local/bin/",
    'rm -f "$BITCOIN_ARCHIVE"',
    "",
  );
  // Write bitcoin.conf with network section and RPC settings directly into dataDir
  const confLines = [
    network !== "mainnet" ? `[${network}]` : "",
    `txindex=1`,
    `prune=0`,
    `server=1`,
    `rpcallowip=${vpc.vpcCidrBlock}`,
    `rpcbind=0.0.0.0`,
    `debug=rpc`,
  ];
  userData.addCommands(
    // Write config into the mounted data directory so bitcoind loads it
    `cat << EOF > ${dataDir}/bitcoin.conf`,
    ...confLines,
    `EOF`,
    `chown ec2-user:ec2-user ${dataDir}/bitcoin.conf`,
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
  network: BitcoinNetwork;
}) {
  return new ec2.LaunchTemplate(context, "LaunchTemplate", {
    userData,
    role,
    machineImage: ec2.MachineImage.latestAmazonLinux2023({
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    }),
    // Only root volume is mapped; data volume will be created/attached via user-data
    blockDevices: [
      {
        deviceName: "/dev/xvda",
        volume: ec2.BlockDeviceVolume.ebs(20, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      },
    ],
    spotOptions,
    securityGroup,
    associatePublicIpAddress: true,
  });
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
      executableBucket,
      bitcoinKey,
      electrsKey,
      nodeKey,
      existingVpc,
    }: BitcoinProps,
  ) {
    super(scope, id);
    // Tag all resources for the Bitcoin stack
    Tags.of(this).add("Service", "bitcoin-data");
    Tags.of(this).add("Network", network);
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

    const role = new iam.Role(this, `Role`, {
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
    // Permissions for EBS volume operations and parameter retrieval in user-data
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:CreateVolume",
          "ec2:AttachVolume",
          "ec2:DescribeVolumes",
          "ec2:CreateTags",
          // Allow setting delete-on-termination for attached data volumes
          "ec2:ModifyInstanceAttribute",
          "ssm:GetParameter",
        ],
        resources: ["*"],
      }),
    );

    const { vpc, btcServiceGroup } = createPublicVpc(
      this,
      network,
      existingVpc,
    );
    this.vpc = vpc;
    this.btcServiceGroup = btcServiceGroup;

    // Create an Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(this, "ALB-SecurityGroup", {
      vpc,
      description: "Bitcoin ALB security group.",
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: albSecurityGroup,
      loadBalancerName: `bitcoin-${network}`,
    });

    const nlbSecurityGroup = new ec2.SecurityGroup(this, "NLB-SecurityGroup", {
      vpc,
      description: "Bitcoin NLB security group.",
    });

    // Allow VPC to connect to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(networkToRpcPort(network)),
      "allow RPC from VPC",
    );
    albSecurityGroup.addEgressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(networkToRpcPort(network)),
      "allow RPC to bitcoind",
    );
    // Allow VPC to connect to NLB
    nlbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "allow electrum from VPC",
    );
    nlbSecurityGroup.addEgressRule(
      ec2.Peer.securityGroupId(btcServiceGroup.securityGroupId),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "allow electrum to electrs",
    );

    // Allow ALB to connect to bitcoind
    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(networkToRpcPort(network)),
      "allow p2p vpc",
    );
    // Allow NLB to connect to electrs
    btcServiceGroup.addIngressRule(
      ec2.Peer.securityGroupId(nlbSecurityGroup.securityGroupId),
      ec2.Port.tcp(networkToElectrsPort(network)),
      "allow electrum vpc",
    );

    const nlb = new elbv2.NetworkLoadBalancer(this, "NLB", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [nlbSecurityGroup],
      loadBalancerName: `electrum-${network}`,
    });

    executableBucket.grantRead(role);

    // SOPS-encrypted RPC auth secret asset
    const secretAsset = new s3a.Asset(this, "Secret", {
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
      electrsKey,
      network,
      nodeKey,
      vpc,
    });

    // Add a listener to the ALB
    const rpcListener = alb.addListener("Listener", {
      port: networkToRpcPort(network),
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
    });

    const electrsListener = nlb.addListener("ElectrsListener", {
      port: networkToElectrsPort(network),
      protocol: elbv2.Protocol.TCP,
    });

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
      // TODO: Replace with cosign-verified SOPS binary install
      "yum install -y https://github.com/getsops/sops/releases/download/v3.10.2/sops-3.10.2-1.aarch64.rpm",
      // Fetch encrypted dotenv with RPC auth
      `aws s3 cp s3://${secretAsset.s3BucketName}/${secretAsset.s3ObjectKey} /home/ec2-user/.env.bitcoin`,
      // Start CloudWatch agent
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/amazon-cloudwatch-agent.json",
      `runuser -l ec2-user -c 'bitcoind -datadir=/home/ec2-user/.bitcoin_${network} ${networkToBitcoinFlags(
        network,
      )} -rpcauth=$(sops -d /home/ec2-user/.env.bitcoin | grep BITCOIN_RPC_AUTH | cut -d\'=\' -f2-) -debuglogfile=/home/ec2-user/bitcoin.log -daemonwait'`,
      // Give bitcoind time to initialize
      "sleep 60",
      // Launch electrs
      `runuser -l ec2-user -c '/usr/local/bin/electrs --conf /home/ec2-user/electrs.conf >> /home/ec2-user/electrs.log 2>&1 &'`,
    );
    // Lambda to update latest data snapshot on snapshot completion
    const updateLatestSnapshotFn = new lambdaNodejs.NodejsFunction(
      this,
      "UpdateLatestSnapshotFn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../../apps/functions/src/lambdas/updateLatestSnapshot.ts",
        ),
        handler: "handler",
        environment: {
          PARAM_NAME: `/bitcoin/${network}/latestSnapshot`, // SSM parameter to write latest snapshot ID
          NETWORK: network,
        },
      },
    );
    // Permissions to describe snapshots and update a single SSM parameter
    updateLatestSnapshotFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ec2:DescribeSnapshots", "ssm:PutParameter"],
        resources: [
          // Only the latestSnapshot parameter for this network
          `arn:aws:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/bitcoin/${network}/latestSnapshot`,
        ],
      }),
    );
    // Trigger on snapshot completion events
    const snapshotRule = new events.Rule(this, "SnapshotCompleteRule", {
      eventPattern: {
        source: ["aws.ec2"],
        detailType: ["EC2 Snapshot State-change Notification"],
        detail: { state: ["completed"] },
      },
    });
    snapshotRule.addTarget(new targets.LambdaFunction(updateLatestSnapshotFn));
    // IAM role and lifecycle policy: automated snapshots via DLM
    // IAM role for DLM (Data Lifecycle Manager)
    const dlmServiceRole = new iam.Role(this, "DlmServiceRole", {
      assumedBy: new iam.ServicePrincipal("dlm.amazonaws.com"),
    });
    // Inline policy granting necessary EC2 and tagging permissions for snapshot lifecycle
    dlmServiceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:CreateSnapshot",
          "ec2:DeleteSnapshot",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "ec2:DescribeSnapshots",
          "ec2:DescribeVolumes",
          "ec2:ModifySnapshotAttribute",
          "resourcegroupstaggingapi:GetResources",
          "resourcegroupstaggingapi:GetTagKeys",
          "resourcegroupstaggingapi:GetTagValues",
        ],
        resources: ["*"],
      }),
    );
    new dlm.CfnLifecyclePolicy(this, "SnapshotPolicy", {
      // Human-readable description is required by CFN
      description: `DLM policy for Bitcoin data ${network}`,
      executionRoleArn: dlmServiceRole.roleArn,
      state: "ENABLED",
      policyDetails: {
        resourceTypes: ["VOLUME"],
        targetTags: [
          { key: "Service", value: "bitcoin-data" },
          { key: "Chain", value: network },
          { key: "SnapshotRole", value: "seed" },
        ],
        schedules: [
          {
            name: "BitcoinDataSnapshotSchedule",
            createRule: { interval: 6, intervalUnit: "HOURS" },
            retainRule: { count: 24 },
            fastRestoreRule: {
              availabilityZones: vpc.publicSubnets.map(
                (s) => s.availabilityZone!,
              ),
              count: 1,
            },
            copyTags: true,
          },
        ],
      },
      tags: [
        { key: "Service", value: "bitcoin-data" },
        { key: "Chain", value: network },
      ],
    });

    // Health-check directly against bitcoind RPC (treat 200 or 401 as healthy)
    rpcListener.addTargets("target", {
      port: networkToRpcPort(network),
      targets: [asg],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        enabled: true,
        port: `${networkToRpcPort(network)}`,
        path: "/",
        healthyHttpCodes: "200,401,405",
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

    new cdk.CfnOutput(this, "BtcServiceGroup", {
      exportName: `BtcServiceGroup-${network}`,
      value: btcServiceGroup.securityGroupId,
    });
  }
}
