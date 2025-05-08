// src/dao/InscriptionDAO.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export interface Inscription {
  id: string;
  creatorId?: string;
  fundingId?: string;
  parents?: string[];
  children?: string[];
  metadataStr?: string;
  createdAt: string; // ISO timestamp
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string; // ISO timestamp
}

export class SocialsDAO {
  private client: DynamoDBDocumentClient;
  constructor(
    ddbClient: DynamoDBClient,
    private tableName: string,
  ) {
    this.client = DynamoDBDocumentClient.from(ddbClient);
  }

  async createInscription(ins: Inscription) {
    const item: Record<string, any> = {
      PK: `INSCRIPTION#${ins.id}`,
      SK: "METADATA",
      ...ins,
      // Fuel both feeds:
      GSI1PK: "INSCRIPTIONS",
      GSI1SK: ins.createdAt,
    };
    if (ins.creatorId) {
      item.GSI2PK = ins.creatorId;
      item.GSI2SK = ins.createdAt;
    }
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }),
    );
  }

  async getInscription(id: string): Promise<Inscription | null> {
    const res = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `INSCRIPTION#${id}`, SK: "METADATA" },
      }),
    );
    return (res.Item as Inscription) ?? null;
  }

  async getGlobalFeed(limit: number, lastKey?: Record<string, any>) {
    return this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GlobalFeedIndex",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "INSCRIPTIONS" },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }),
    );
  }

  async getPersonalFeed(
    creatorId: string,
    limit: number,
    lastKey?: Record<string, any>,
  ) {
    return this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "CreatorFeedIndex",
        KeyConditionExpression: "GSI2PK = :cid",
        ExpressionAttributeValues: { ":cid": creatorId },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }),
    );
  }

  async likeInscription(inscriptionId: string, userId: string) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `INSCRIPTION#${inscriptionId}`,
          SK: `LIKE#${userId}`,
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }

  async unlikeInscription(inscriptionId: string, userId: string) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `INSCRIPTION#${inscriptionId}`,
          SK: `LIKE#${userId}`,
        },
      }),
    );
  }

  async getLikes(inscriptionId: string): Promise<number> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `INSCRIPTION#${inscriptionId}`,
          ":prefix": "LIKE#",
        },
        Select: "COUNT",
      }),
    );
    return res.Count ?? 0;
  }

  async reshare(inscriptionId: string, userId: string) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `INSCRIPTION#${inscriptionId}`,
          SK: `RESHARE#${userId}`,
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }

  async getReshares(inscriptionId: string): Promise<number> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `INSCRIPTION#${inscriptionId}`,
          ":prefix": "RESHARE#",
        },
        Select: "COUNT",
      }),
    );
    return res.Count ?? 0;
  }

  async comment(inscriptionId: string, c: Comment) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `INSCRIPTION#${inscriptionId}`,
          SK: `COMMENT#${c.id}`,
          userId: c.userId,
          content: c.content,
          createdAt: c.createdAt,
        },
      }),
    );
  }

  async getComments(
    inscriptionId: string,
    limit: number,
    lastKey?: Record<string, any>,
  ) {
    return this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `INSCRIPTION#${inscriptionId}`,
          ":prefix": "COMMENT#",
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }),
    );
  }

  async likeComment(inscriptionId: string, commentId: string, userId: string) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `INSCRIPTION#${inscriptionId}`,
          SK: `COMMENT#${commentId}#LIKE#${userId}`,
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }

  async getCommentLikes(
    inscriptionId: string,
    commentId: string,
  ): Promise<number> {
    const prefix = `COMMENT#${commentId}#LIKE#`;
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
        ExpressionAttributeValues: {
          ":pk": `INSCRIPTION#${inscriptionId}`,
          ":pref": prefix,
        },
        Select: "COUNT",
      }),
    );
    return res.Count ?? 0;
  }
  /** Follow user B as A */
  async followUser(followerId: string, followeeId: string) {
    const now = new Date().toISOString();
    // A → B
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${followerId}`,
          SK: `FOLLOWING#${followeeId}`,
          createdAt: now,
        },
      }),
    );
    // B ← A
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${followeeId}`,
          SK: `FOLLOWER#${followerId}`,
          createdAt: now,
        },
      }),
    );
  }

  /** Unfollow: remove both directions */
  async unfollowUser(followerId: string, followeeId: string) {
    await Promise.all([
      this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: `USER#${followerId}`, SK: `FOLLOWING#${followeeId}` },
        }),
      ),
      this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: `USER#${followeeId}`, SK: `FOLLOWER#${followerId}` },
        }),
      ),
    ]);
  }

  /** Get list of user-ids that <userId> is following */
  async getFollowing(
    userId: string,
    limit: number,
    lastKey?: Record<string, any>,
  ) {
    return this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":pref": "FOLLOWING#",
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }),
    );
  }

  /** Get list of followers of <userId> */
  async getFollowers(
    userId: string,
    limit: number,
    lastKey?: Record<string, any>,
  ) {
    return this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":pref": "FOLLOWER#",
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }),
    );
  }
}
