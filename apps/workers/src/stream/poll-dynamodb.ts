import {
  DynamoDBStreamsClient,
  GetShardIteratorCommand,
  GetRecordsCommand,
  DescribeStreamCommand,
} from "@aws-sdk/client-dynamodb-streams";
import { fundingStreamArn, fundingStreamRegion } from "../config.js";
import { handleDynamoDBRecord } from "./handler.js";

const client = new DynamoDBStreamsClient({
  endpoint: "http://localhost:4566",
  region: fundingStreamRegion,
});

export async function start() {
  try {
    // Get stream details
    const describeStream = await client.send(
      new DescribeStreamCommand({ StreamArn: fundingStreamArn }),
    );
    const shards = describeStream.StreamDescription.Shards;

    for (const shard of shards) {
      const shardIteratorResponse = await client.send(
        new GetShardIteratorCommand({
          StreamArn: fundingStreamArn,
          ShardId: shard.ShardId,
          ShardIteratorType: "LATEST",
        }),
      );

      let shardIterator = shardIteratorResponse.ShardIterator;

      while (shardIterator) {
        const recordsResponse = await client.send(
          new GetRecordsCommand({ ShardIterator: shardIterator }),
        );

        for (const record of recordsResponse.Records) {
          await handleDynamoDBRecord(record as any);
        }

        shardIterator = recordsResponse.NextShardIterator;

        // Wait to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (err) {
    console.error("Error reading stream:", err);
  }
}
