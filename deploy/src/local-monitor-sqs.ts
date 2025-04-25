#!/usr/bin/env node
import {
  SQSClient,
  ListQueuesCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import cliProgress from "cli-progress";

// AWS config per instructions
const awsConfig = {
  accessKeyId: "test",
  endpoint: "http://localhost.localstack.cloud:4566",
  region: "us-east-1",
  secretAccessKey: "test",
};

const sqsClient = new SQSClient({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
  endpoint: awsConfig.endpoint,
});

// Store previous counts for change detection.
const previousCounts: Record<string, number> = {};

// List all SQS queues in the account.
async function listQueues() {
  const command = new ListQueuesCommand({});
  const response = await sqsClient.send(command);
  return response.QueueUrls || [];
}

// Get the approximate message count for a queue.
async function getQueueMessageCount(queueUrl: string): Promise<number> {
  const command = new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ["ApproximateNumberOfMessages"],
  });
  const response = await sqsClient.send(command);
  const count = response.Attributes?.ApproximateNumberOfMessages || "0";
  return parseInt(count, 10);
}

// Monitor and visualize queue activity with brief log messages appended.
async function monitorQueues() {
  const queueUrls = await listQueues();
  if (queueUrls.length === 0) {
    console.log("No SQS queues found.");
    process.exit(0);
  }

  // Configure a multi-progress bar with an extra {log} placeholder.
  const multiBar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: "{queue} |{bar}| {value} msgs {log}",
    },
    cliProgress.Presets.shades_classic,
  );

  // Find common prefix among queue names
  const queueNames = queueUrls.map((url) => url.split("/").pop() || url);
  let commonPrefix = "";
  if (queueNames.length > 0) {
    const firstQueue = queueNames[0];
    for (let i = 0; i < firstQueue.length; i++) {
      const char = firstQueue[i];
      if (queueNames.every((name) => name[i] === char)) {
        commonPrefix += char;
      } else {
        break;
      }
    }
  }

  // Create a progress bar for each queue.
  const bars: Record<string, cliProgress.SingleBar> = {};
  queueUrls.forEach((queueUrl) => {
    const queueName = queueUrl.split("/").pop() || queueUrl;
    const displayName = queueName.slice(commonPrefix.length);
    bars[queueUrl] = multiBar.create(10, 0, { queue: displayName, log: "" });
  });

  // Update each bar and include a brief delta log if the count changed.
  async function updateBars() {
    let maxCount = 0;
    // First pass to find max count
    for (const queueUrl of queueUrls) {
      try {
        const count = await getQueueMessageCount(queueUrl);
        maxCount = Math.max(maxCount, count);
      } catch (err) {
        console.error(`Error getting count for ${queueUrl}:`, err);
      }
    }

    // Second pass to update bars with normalized max
    const normalizedMax = Math.floor(maxCount * 1.2) + 1; // 20% higher than max, rounded down, plus 1
    for (const queueUrl of queueUrls) {
      try {
        const count = await getQueueMessageCount(queueUrl);
        const queueName = queueUrl.split("/").pop() || queueUrl;
        const displayName = queueName.slice(commonPrefix.length);

        let logMsg = "";
        if (
          previousCounts[queueUrl] !== undefined &&
          previousCounts[queueUrl] !== count
        ) {
          logMsg = `Δ:${previousCounts[queueUrl]}→${count}`;
        }
        previousCounts[queueUrl] = count;

        bars[queueUrl].setTotal(normalizedMax);
        bars[queueUrl].update(count, { queue: displayName, log: logMsg });
      } catch (err) {
        console.error(`Error updating ${queueUrl}:`, err);
      }
    }
    setTimeout(updateBars, 100);
  }
  updateBars();
}

monitorQueues().catch((err) => {
  console.error("Unhandled error:", err);
});
