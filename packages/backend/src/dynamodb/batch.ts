import { BitcoinNetworkNames, TFundingStatus } from "@0xflick/ordinals-models";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const FUNDED: TFundingStatus = "funded";
const BATCHED: TFundingStatus = "batch";
const BATCH_REVEALED: TFundingStatus = "batch_revealed";
const FAILED: TFundingStatus = "failed";
const REVEALED: TFundingStatus = "revealed";
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

  public async createBatch({
    fundingIds,
    batchId,
    network,
  }: {
    fundingIds: string[];
    batchId: string;
    network: BitcoinNetworkNames;
  }): Promise<void> {
    const transactItems = fundingIds.map((id) => ({
      Update: {
        TableName: BatchDAO.TABLE_NAME,
        Key: { pk: id, sk: "funding" },
        ConditionExpression:
          "attribute_not_exists(batchId) AND fundingStatus = :fundingStatus",
        UpdateExpression: "SET batchId = :batchId, fundingStatus = :newStatus",
        ExpressionAttributeValues: {
          ":batchId": batchId,
          ":fundingStatus": FUNDED,
          ":newStatus": BATCHED,
        },
      },
    }));

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          ...transactItems,
          {
            Put: {
              TableName: BatchDAO.TABLE_NAME,
              Item: {
                pk: batchId,
                sk: "batch",
                network,
                createdAt: new Date().getTime(),
                numberOfFundings: fundingIds.length,
              },
            },
          },
        ],
      }),
    );
  }

  public async revokeBatch(batchId: string): Promise<void> {
    // use batchId-index to get all fundings for the batch
    const fundings = await this.client.send(
      new QueryCommand({
        TableName: BatchDAO.TABLE_NAME,
        IndexName: "batchId-index",
        KeyConditionExpression: "batchId = :batchId",
        ExpressionAttributeValues: {
          ":batchId": batchId,
        },
      }),
    );
    const fundingIds = fundings.Items?.map((item) => item.id);
    if (!fundingIds) {
      throw new Error("No fundings found for batch");
    }
    const transactItems = fundingIds.map((id) => ({
      Update: {
        TableName: BatchDAO.TABLE_NAME,
        Key: { pk: id, sk: "funding" },
        ConditionExpression:
          "fundingStatus = :fundingStatus AND attribute_exists(batchId)",
        UpdateExpression: "SET fundingStatus = :newStatus REMOVE batchId",
        ExpressionAttributeValues: {
          ":fundingStatus": BATCHED,
          ":newStatus": FUNDED,
        },
      },
    }));
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          ...transactItems,
          {
            Update: {
              TableName: BatchDAO.TABLE_NAME,
              Key: { pk: batchId, sk: "batch" },
              UpdateExpression: "SET fundingStatus = :newStatus",
              ExpressionAttributeValues: {
                ":newStatus": FAILED,
              },
            },
          },
        ],
      }),
    );
  }

  public async updateBatch(
    batchId: string,
    txid: string,
    fundingReveals: {
      id: string;
      batchTransactionOffset: number;
    }[],
  ): Promise<void> {
    // use batchId-index to get all fundings for the batch
    const fundings = await this.client.send(
      new QueryCommand({
        TableName: BatchDAO.TABLE_NAME,
        IndexName: "batchId-index",
        KeyConditionExpression: "batchId = :batchId",
        ExpressionAttributeValues: {
          ":batchId": batchId,
        },
      }),
    );
    const fundingIds = fundings.Items?.map((item) => item.id);
    if (!fundingIds) {
      throw new Error("No fundings found for batch");
    }
    // Match the fundings to the fundingReveals
    const fundingMap = new Map<
      string,
      {
        id: string;
        batchTransactionOffset: number;
      }
    >();
    for (const reveal of fundingReveals) {
      fundingMap.set(reveal.id, reveal);
    }
    const fundingIdsWithOffsets = fundingIds.map((id) => {
      const reveal = fundingMap.get(id);
      if (!reveal) {
        throw new Error("Funding reveal not found");
      }
      return { id, batchTransactionOffset: reveal.batchTransactionOffset };
    });
    const transactItems = fundingIdsWithOffsets.map(
      ({ id, batchTransactionOffset }) => ({
        Update: {
          TableName: BatchDAO.TABLE_NAME,
          Key: { pk: id, sk: "funding" },
          ConditionExpression: "fundingStatus = :fundingStatus",
          UpdateExpression:
            "SET batchId = :batchId, fundingStatus = :newStatus, revealTxid = :revealTxid, batchTransactionOffset = :batchTransactionOffset",
          ExpressionAttributeValues: {
            ":batchId": batchId,
            ":newStatus": REVEALED,
            ":fundingStatus": BATCHED,
            ":revealTxid": txid,
            ":batchTransactionOffset": batchTransactionOffset,
          },
        },
      }),
    );
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          ...transactItems,
          {
            Update: {
              TableName: BatchDAO.TABLE_NAME,
              Key: { pk: batchId, sk: "batch" },
              UpdateExpression: "SET txid = :txid, fundingStatus = :newStatus",
              ExpressionAttributeValues: {
                ":txid": txid,
                ":newStatus": BATCH_REVEALED,
              },
            },
          },
        ],
      }),
    );
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      }),
    );
  }
}
