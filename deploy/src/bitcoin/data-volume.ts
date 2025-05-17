import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { Aws, Duration } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dlm from "aws-cdk-lib/aws-dlm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { BitcoinNetwork } from "../utils/types.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Properties for the DataVolume construct. This construct handles the creation and management
 * of persistent EBS volumes for Bitcoin services, including snapshot management and automated
 * backups.
 */
export interface DataVolumeProps {
  /**
   * The VPC in which EC2 instances will live.
   */
  readonly vpc: ec2.IVpc;

  /**
   * The mount path for the data volume.
   */
  readonly mountPath: string;

  /**
   * The path component to the snapshot for the data volume.
   */
  readonly snapshotPathComponent: string;

  /**
   * Optional IAM role for the EC2 instances that will attach/restore from this data volume.
   * If not provided, a new role will be created with the necessary permissions.
   */
  readonly role?: iam.IRole;

  /**
   * Optional size in GiB if no snapshot is found. Typically 1000 (for mainnet).
   */
  readonly defaultVolumeSize?: number;

  /**
   * By default, we'll create a DLM policy to snapshot volumes tagged with
   * SnapshotRole=seed. DLM can enforce daily or weekly retention. You can disable
   * if you prefer your own approach.
   */
  readonly enableDlmPolicy?: boolean;

  /**
   * If enableDlmPolicy is true, how many days to retain snapshots.
   */
  readonly snapshotRetentionDays?: number;
}

/**
 * Construct that encapsulates creating and managing persistent EBS volumes for Bitcoin services.
 * This includes:
 * - Volume creation/attachment logic
 * - Snapshot management and restoration
 * - Automated backups via DLM
 * - IAM role management
 * - User data configuration
 */
export class DataVolume extends Construct {
  /**
   * Lambda which updates the /bitcoin/<network>/latestSnapshot SSM parameter
   * with the latest snapshot ID for volume restoration.
   */
  public readonly updateSnapshotLambda: lambda.Function | undefined;

  /**
   * The life cycle policy for automated snapshots if enabled.
   */
  public readonly dlmPolicy: dlm.CfnLifecyclePolicy | undefined;

  /**
   * The IAM role that should be used by instances that will attach this volume.
   * This role will have the necessary permissions to create, attach, and manage volumes.
   */
  public readonly role: iam.IRole;

  /**
   * The Bitcoin network this volume is for (mainnet/testnet)
   */
  private readonly mountPath: string;

  /**
   * The path component to the snapshot for the data volume.
   */
  private readonly snapshotPathComponent: string;

  /**
   * The default volume size in GiB if no snapshot is found
   */
  private readonly defaultVolumeSize: number;

  constructor(scope: Construct, id: string, props: DataVolumeProps) {
    super(scope, id);

    const {
      vpc,
      mountPath,
      role: existingRole,
      defaultVolumeSize = 100,
      enableDlmPolicy = true,
      snapshotRetentionDays = 7,
      snapshotPathComponent,
    } = props;

    this.mountPath = mountPath;
    this.defaultVolumeSize = defaultVolumeSize;
    this.snapshotPathComponent = snapshotPathComponent;
    // Create or use existing role
    if (existingRole) {
      this.role = existingRole;
    } else {
      const newRole = new iam.Role(this, "DataVolumeRole", {
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      });

      // Add necessary permissions to the role
      newRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "ec2:CreateVolume",
            "ec2:AttachVolume",
            "ec2:DescribeVolumes",
            "ec2:CreateTags",
            "ec2:ModifyInstanceAttribute",
            "ssm:GetParameter",
          ],
          resources: ["*"],
        }),
      );

      this.role = newRole;
    }

    // Create DLM policy for automated snapshots if enabled
    if (enableDlmPolicy) {
      this.dlmPolicy = new dlm.CfnLifecyclePolicy(this, "DataVolumeDlmPolicy", {
        executionRoleArn: `arn:aws:iam::${Aws.ACCOUNT_ID}:role/AWSDataLifecycleManagerDefaultRole`,
        description: `DataVolume DLM policy for ${this.snapshotPathComponent}`,
        policyDetails: {
          resourceTypes: ["VOLUME"],
          targetTags: [
            {
              key: "SnapshotRole",
              value: "seed",
            },
          ],
          schedules: [
            {
              name: `DailyDataVolumeSnapshots-${this.snapshotPathComponent}`,
              tagsToAdd: [{ key: "CreatedBy", value: "DLM" }],
              copyTags: true,
              createRule: {
                interval: 24,
                intervalUnit: "HOURS",
              },
              retainRule: {
                count: snapshotRetentionDays,
              },
            },
          ],
        },
        state: "ENABLED",
      });
    }

    // Create Lambda to update latest snapshot parameter
    // Snapshot update Lambda on EC2 snapshot completion and DLM policy for automated backups
    this.updateSnapshotLambda = new lambdaNodejs.NodejsFunction(
      this,
      "UpdateLatestSnapshotFn",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          "../../../apps/functions/src/lambdas/updateLatestSnapshot.ts",
        ),
        handler: "handler",
        environment: {
          PARAM_NAME: `/bitcoin/${this.snapshotPathComponent}/latestSnapshot`,
        },
      },
    );

    // Grant needed EC2 and SSM actions to the lambda
    this.updateSnapshotLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:CreateSnapshot",
          "ec2:DescribeVolumes",
          "ec2:DescribeSnapshots",
          "ec2:CreateTags",
          "ssm:PutParameter",
        ],
        resources: ["*"],
      }),
    );

    // Schedule the Lambda to run daily at midnight
    const rule = new events.Rule(this, "UpdateSeedSnapshotSchedule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "0" }),
    });
    rule.addTarget(new targets.LambdaFunction(this.updateSnapshotLambda));

    const snapshotCompleteRule = new events.Rule(this, "OnEc2SnapshotComplete", {
      eventPattern: {
        source: ["aws.ec2"],
        detailType: ["EC2 Snapshot State-change Notification"],
        detail: { state: ["completed"] },
      },
    });
    snapshotCompleteRule.addTarget(
      new targets.LambdaFunction(this.updateSnapshotLambda),
    );
  }

  /**
   * Returns the user data commands needed to attach and configure the data volume.
   * This can be used in your ASG or LaunchTemplate configuration.
   */
  public getUserDataCommands(): string[] {
    return [
      "# fetch IMDSv2 token",
      "TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds:21600')",
      "# retrieve availability zone",
      'AZ=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)',
      'if [ -z "$AZ" ]; then echo "ERROR: AZ not found"; exit 1; fi',
      "# try to get the latest seed snapshot",
      `if ! SNAP_ID=$(aws ssm get-parameter --name /bitcoin/${this.snapshotPathComponent}/latestSnapshot --query Parameter.Value --output text 2>/dev/null); then
  echo 'No seed snapshot, creating new volume';
  VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --size ${this.defaultVolumeSize} --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=bitcoin-data},{Key=App,Value=${this.snapshotPathComponent}}]' --query VolumeId --output text)
else
  echo "Restoring from snapshot $SNAP_ID";
  VOL_ID=$(aws ec2 create-volume --availability-zone $AZ --snapshot-id $SNAP_ID --volume-type gp3 --tag-specifications 'ResourceType=volume,Tags=[{Key=Service,Value=bitcoin-data},{Key=App,Value=${this.snapshotPathComponent}}]' --query VolumeId --output text)
fi`,
      "aws ec2 wait volume-available --volume-ids $VOL_ID",
      'INSTANCE_ID=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)',
      "aws ec2 attach-volume --volume-id $VOL_ID --device /dev/xvdb --instance-id $INSTANCE_ID",
      'aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --block-device-mappings \'[{"DeviceName":"/dev/xvdb","Ebs":{"DeleteOnTermination":true}}]\'',
      "# only seed role tags for DLM",
      'INSTANCE_LC=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-life-cycle 2>/dev/null || echo on-demand)',
      'if [ "$INSTANCE_LC" != "spot" ]; then',
      "  aws ec2 create-tags --resources $VOL_ID --tags Key=SnapshotRole,Value=seed",
      "fi",
      "# mount the data device",
      "if [ -b /dev/xvdb ]; then DATA_DEVICE=/dev/xvdb; else DATA_DEVICE=/dev/nvme1n1; fi",
      `DATA_DIR=${this.mountPath}`,
      "while [ ! -b $DATA_DEVICE ]; do sleep 1; done",
      "if ! blkid $DATA_DEVICE; then mkfs.ext4 $DATA_DEVICE; fi",
      "# Create mount directory if it doesn't exist",
      "mkdir -p $DATA_DIR",
      "mount $DATA_DEVICE $DATA_DIR",
      "grep -q '$DATA_DEVICE' /etc/fstab || echo '$DATA_DEVICE $DATA_DIR ext4 defaults,nofail 0 2' >> /etc/fstab",
      "# Ensure proper ownership of the mounted volume",
      "chown -R ec2-user:ec2-user $DATA_DIR",
      "chmod 755 $DATA_DIR",
    ];
  }

  /**
   * Returns a UserData object that can be used directly in a LaunchTemplate or ASG.
   */
  public getUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    userData.addCommands(...this.getUserDataCommands());
    return userData;
  }
}
