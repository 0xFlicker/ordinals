import { EC2Client, DescribeSnapshotsCommand } from "@aws-sdk/client-ec2";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";

interface EC2SnapshotEvent {
  detail: {
    [key: string]: any;
    ["snapshot-id"]?: string;
    snapshot_id?: string;
    state?: string;
  };
}

export const handler = async (event: EC2SnapshotEvent): Promise<void> => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const detail = event.detail;
  const snapshotId = detail["snapshot-id"] || detail.snapshot_id;
  if (!snapshotId || detail.state !== "completed") {
    console.log(
      "Event is not a completed snapshot or missing snapshot ID, skipping.",
    );
    return;
  }
  const ec2 = new EC2Client({});
  const desc = await ec2.send(
    new DescribeSnapshotsCommand({ SnapshotIds: [snapshotId] }),
  );
  const snapshot = desc.Snapshots && desc.Snapshots[0];
  if (!snapshot) {
    console.warn(`Snapshot ${snapshotId} not found`);
    return;
  }
  const tags = snapshot.Tags || [];
  // Only proceed for bitcoin-data service snapshots
  const isBitcoinData = tags.some(
    (t) => t.Key === "Service" && t.Value === "bitcoin-data",
  );
  if (!isBitcoinData) {
    console.log(
      `Snapshot ${snapshotId} is not tagged for bitcoin-data, skipping.`,
    );
    return;
  }
  // Only seed snapshots should update the parameter
  const isSeed = tags.some(
    (t) => t.Key === "SnapshotRole" && t.Value === "seed",
  );
  if (!isSeed) {
    console.log(`Snapshot ${snapshotId} is not a seed snapshot, skipping.`);
    return;
  }
  const paramName = process.env.PARAM_NAME;
  if (!paramName) {
    console.error("PARAM_NAME environment variable is not set");
    return;
  }
  const ssm = new SSMClient({});
  await ssm.send(
    new PutParameterCommand({
      Name: paramName,
      Value: snapshotId,
      Type: "String",
      Overwrite: true,
    }),
  );
  console.log(`Updated SSM parameter ${paramName} to ${snapshotId}`);
};
