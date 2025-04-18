import { TFundingStatus } from "@0xflick/ordinals-models";
// batch-dao.ts
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const FUNDED: TFundingStatus = "funded";
const BATCHED: TFundingStatus = "batch";
/**
 * BatchDAO is responsible for marking fundings as batched.
 * It performs a DynamoDB transaction to update each funding record,
 * ensuring idempotence by only updating records that are still in "funding" state
 * and that have not yet been assigned a batchId.
 */
export class BatchDAO {
  public static TABLE_NAME = "Funding";

  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBDocumentClient) {
    this.client = client;
  }

  public async createBatch(
    fundingIds: string[],
    batchId: string,
  ): Promise<void> {
    const transactItems = fundingIds.map((id) => ({
      Update: {
        TableName: BatchDAO.TABLE_NAME,
        Key: { pk: id, sk: "funding" },
        ConditionExpression:
          "fundingStatus = :fundingStatus AND attribute_not_exists(batchId)",
        UpdateExpression: "SET batchId = :batchId, fundingStatus = :newStatus",
        ExpressionAttributeValues: {
          ":batchId": batchId,
          ":fundingStatus": FUNDED,
          ":newStatus": BATCHED,
        },
      },
    }));
    await this.client.send(
      new TransactWriteCommand({ TransactItems: transactItems }),
    );
  }

  public async updateBatch(batchId: string, txid: string): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: BatchDAO.TABLE_NAME,
        Key: { pk: batchId, sk: "batch" },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET txid = :txid, TTL = :ttl",
        ExpressionAttributeValues: {
          ":txid": txid,
          ":ttl": Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
        },
      }),
    );
  }
}
