import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Stack, StackProps } from "aws-cdk-lib";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";

export interface BeachheadProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly rootVolumeSize: number;
  readonly dataVolumeSize: number;
}

export class BeachheadStack extends Stack {
  constructor(scope: Construct, id: string, props: BeachheadProps) {
    const { vpc, rootVolumeSize, dataVolumeSize, ...rest } = props;
    super(scope, id, rest);

    const sg = new ec2.SecurityGroup(this, "BeachheadSG", {
      vpc,
      description: "Beachhead SG",
    });

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.SSH,
      "Allow SSH traffic from the internet",
    );

    sg.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTraffic(),
      "Allow all traffic to the internet",
    );

    const ud = ec2.UserData.forLinux({
      shebang: "#!/bin/bash",
    });

    ud.addCommands(
      "sudo yum update -y",
      "TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds:21600')",
      "# retrieve availability zone",
      'AZ=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)',
      'if [ -z "$AZ" ]; then echo "ERROR: AZ not found"; exit 1; fi',
      "echo 'try to get the latest seed snapshot'",
      `if ! SNAP_ID=$(aws ssm get-parameter --name /beachhead/latestSnapshot --query Parameter.Value --output text 2>/dev/null); then
      echo 'No seed snapshot, creating new volume',
      VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --size ${dataVolumeSize} --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=beachhead}]' --query VolumeId --output text)
      else
      echo "Restoring from snapshot $SNAP_ID"
      VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --snapshot-id $SNAP_ID --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=beachhead}]' --query VolumeId --output text)
      fi`,
      'echo "wait for volume to be available"',
      "aws ec2 wait volume-available --volume-ids $VOL_ID",
      'INSTANCE_ID=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)',
      "echo 'attach volume'",
      "aws ec2 attach-volume --volume-id $VOL_ID --device /dev/xvdb --instance-id $INSTANCE_ID",
      'echo "modify instance attribute"',
      'aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --block-device-mappings \'[{"DeviceName":"/dev/xvdb","Ebs":{"DeleteOnTermination":true}}]\'',
      "echo 'mount the data device'",
      "if [ -b /dev/xvdb ]; then DATA_DEVICE=/dev/xvdb; else DATA_DEVICE=/dev/nvme1n1; fi",
      `DATA_DIR=/home/ec2-user/data`,
      "while [ ! -b $DATA_DEVICE ]; do sleep 1; done",
      "if ! blkid $DATA_DEVICE; then mkfs.ext4 $DATA_DEVICE; fi",
      "mkdir -p $DATA_DIR",
      "mount $DATA_DEVICE $DATA_DIR",
      "chown -R ec2-user:ec2-user $DATA_DIR",
      "chmod 755 $DATA_DIR",
      "echo 'done'",
    );

    const role = new iam.Role(this, "BeachheadRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      inlinePolicies: {
        AllowEC2Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["ec2:Describe*"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ec2:CreateTags", "ec2:DeleteTags"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ec2:CreateVolume", "ec2:DeleteVolume"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ec2:AttachVolume", "ec2:DetachVolume"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ec2:CreateSnapshot", "ec2:DeleteSnapshot"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ec2:ModifyInstanceAttribute"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ssm:GetParameter"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    const lt = new ec2.LaunchTemplate(this, "BeachheadLaunchTemplate", {
      role,
      securityGroup: sg,
      userData: ud,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.COMPUTE6_INTEL,
        ec2.InstanceSize.LARGE,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
      }),
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        "BeachheadKeyPair",
        "vpn-test-key",
      ),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(rootVolumeSize),
        },
      ],
    });

    new autoscaling.AutoScalingGroup(this, "BeachheadIntel", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      mixedInstancesPolicy: {
        launchTemplate: lt,
        instancesDistribution: {
          spotAllocationStrategy:
            autoscaling.SpotAllocationStrategy.PRICE_CAPACITY_OPTIMIZED,
        },
      },
      minCapacity: 0,
      maxCapacity: 0,
      desiredCapacity: 0,
    });
  }
}
