import {
  type AttributeValue as DynamoDBAttributeValue,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { type AttributeValue as LambdaAttributeValue } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  IAddressInscriptionModel,
  toAddressInscriptionId,
  toCollectionId,
  TCollectionModel,
  toBitcoinNetworkName,
  ID_Collection,
  IPaginationOptions,
  IPaginatedResult,
  decodeCursor,
  encodeCursor,
  paginate,
  TFundingStatus,
  IPresaleModel,
  toPresaleId,
  TPresaleStatus,
  BitcoinNetworkNames,
} from "@0xflick/ordinals-models";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export type TFundingDb<T extends Record<string, any>> = {
  pk: string;
  id: string;
  address: string;
  network: string;
  collectionId?: string;
  fundedAt?: number;
  revealTxid?: string;
  fundingTxid?: string;
  fundingVout?: number;
  refundedTxid?: string;
  lastChecked?: number;
  createdAt: number;
  nextCheckAt?: number;
  timesChecked: number;
  fundingStatus: string;
  fundingAmountBtc: string;
  fundingAmountSat: number;
  destinationAddress: string;
  tipAmountSat?: number;
  tipAmountDestination?: string;
  batchId?: string;
  sizeEstimate: number;
} & T;

export type TFundingCollectionDb<T extends Record<string, any>> = {
  pk: string;
  collectionId: string;
  collectionName: string;
  pendingCount: number;
  maxSupply: number;
  totalCount: number;
} & T;

type TPresaleDb = Omit<
  TFundingDb<{
    sk: string;
    farcasterFid?: number;
    secKey: string;
  }>,
  "contentIds"
>;

type TFundingByStatus = {
  address: string;
  id: string;
  createdAt: Date;
  nextCheckAt: Date;
  fundingAmountSat: number;
  network: BitcoinNetworkNames;
};

type TFundedByStatus = {
  fundedAt: Date;
  sizeEstimate: number;
  fundingTxid: string;
  fundingVout: number;
} & Omit<TFundingByStatus, "nextCheckAt" | "createdAt">;

function excludePrimaryKeys<T extends Record<string, any>>(
  input: T,
): Record<string, any> {
  const { pk, sk, ...rest } = input;
  return rest;
}

function mapMetaKeys<T extends Record<string, any>>(
  meta: T,
): Record<string, any> {
  // Return a shallow copy of the meta object with all keys converted to `meta_<key>`
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [`meta_${key}`, value]),
  );
}

function unmapMetaKeys<T extends Record<string, any>>(
  meta: T,
): Record<string, any> {
  // Return a shallow copy of the meta object with all keys converted from `meta_<key>`
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key.startsWith("meta_") ? key.replace("meta_", "") : key,
      value,
    ]),
  );
}

export class FundingDao<
  ItemMeta extends Record<string, any> = {},
  CollectionMeta extends Record<string, any> = {},
> {
  public static TABLE_NAME = "Funding";

  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBClient) {
    this.client = client;
  }

  public async getAllFundingByAddressCollection(opts: {
    collectionId?: ID_Collection;
    address?: string;
  }): Promise<IAddressInscriptionModel<ItemMeta>[]> {
    const results: IAddressInscriptionModel<ItemMeta>[] = [];
    for await (const item of this.listAllFundingByAddressCollection(opts)) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingByAddressCollection(
    opts: {
      collectionId?: ID_Collection;
      address?: string;
    } & IPaginationOptions,
  ): AsyncGenerator<IAddressInscriptionModel<ItemMeta>, any, unknown> {
    return paginate((options) =>
      this.listAllFundingByAddressCollectionPaginated({
        ...opts,
        ...options,
      }),
    );
  }

  public async listAllFundingByAddressCollectionPaginated({
    collectionId,
    address,
    cursor,
    limit,
  }: {
    collectionId?: ID_Collection;
    address?: string;
  } & IPaginationOptions): Promise<
    IPaginatedResult<IAddressInscriptionModel<ItemMeta>>
  > {
    const pagination = decodeCursor(cursor);
    const keyConditionExpression =
      collectionId && address
        ? "destinationAddress = :address AND collectionId = :collectionId"
        : collectionId
        ? "collectionId = :collectionId"
        : address
        ? "destinationAddress = :address"
        : undefined;
    const result = await this.client.send(
      new ScanCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "destination-address-collection-index",
        FilterExpression: keyConditionExpression,
        ExpressionAttributeValues: {
          ...(address && {
            ":address": address,
          }),
          ...(collectionId && {
            ":collectionId": toCollectionId(collectionId),
          }),
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items:
        result.Items?.map((item) =>
          FundingDao.fromFundingDb(item as TFundingDb<ItemMeta>),
        ) ?? [],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async getAllFundingsByStatusAndCollection({
    id,
    fundingStatus,
  }: {
    id: ID_Collection;
    fundingStatus: TFundingStatus;
  }) {
    const results: {
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }[] = [];
    for await (const item of this.listAllFundingsByStatusAndCollection({
      id,
      fundingStatus,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingsByStatusAndCollection(opts: {
    id: ID_Collection;
    fundingStatus: TFundingStatus;
  }): AsyncGenerator<
    {
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    },
    any,
    unknown
  > {
    return paginate((options) =>
      this.listAllFundingByStatusAndCollectionPaginated({
        ...opts,
        ...options,
      }),
    );
  }

  public async listAllFundingByStatusAndCollectionPaginated({
    id,
    fundingStatus,
    cursor,
    limit,
  }: {
    id: ID_Collection;
    fundingStatus: TFundingStatus;
  } & IPaginationOptions): Promise<
    IPaginatedResult<{
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }>
  > {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "collectionId-index",
        KeyConditionExpression:
          "collectionId = :collectionId AND fundingStatus = :sk",
        ExpressionAttributeValues: {
          ":collectionId": toCollectionId(id),
          ":sk": fundingStatus,
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: result.Items?.map((item) => ({
        address: item.address,
        id: item.id,
        lastChecked: item.lastChecked
          ? new Date(item.lastChecked)
          : new Date(0),
        timesChecked: item.timesChecked,
        fundingAmountSat: item.fundingAmountSat,
      })) as {
        address: string;
        id: string;
        lastChecked: Date;
        timesChecked: number;
        fundingAmountSat: number;
      }[],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async getAllFundingsByStatus({
    fundingStatus,
  }: {
    fundingStatus: TFundingStatus;
  }) {
    const results: {
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }[] = [];
    for await (const item of this.listAllFundingsByStatus({
      fundingStatus,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingsByStatus(opts: {
    fundingStatus: TFundingStatus;
  }): AsyncGenerator<
    {
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    },
    any,
    unknown
  > {
    return paginate((options) =>
      this.listAllFundingByStatusPaginated({
        ...opts,
        ...options,
      }),
    );
  }

  public async listAllFundingByStatusPaginated({
    fundingStatus,
    cursor,
    limit,
  }: {
    fundingStatus: TFundingStatus;
  } & IPaginationOptions): Promise<
    IPaginatedResult<{
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }>
  > {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "statusFundedAtIndex",
        KeyConditionExpression: "fundingStatus = :sk",
        ExpressionAttributeValues: {
          ":sk": fundingStatus,
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: result.Items?.map((item) => ({
        address: item.address,
        id: item.id,
        lastChecked: item.lastChecked
          ? new Date(item.lastChecked)
          : new Date(0),
        timesChecked: item.timesChecked,
        fundingAmountSat: item.fundingAmountSat,
      })) as {
        address: string;
        id: string;
        lastChecked: Date;
        timesChecked: number;
        fundingAmountSat: number;
      }[],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async getAllFundingsByStatusNextCheckAt({
    fundingStatus,
    nextCheckAt,
  }: {
    fundingStatus: TFundingStatus;
    nextCheckAt: Date;
  }) {
    const results: {
      address: string;
      id: string;
      nextCheckAt: Date;
      fundingAmountSat: number;
      network: BitcoinNetworkNames;
    }[] = [];
    for await (const item of this.listAllFundingsByStatusNextCheckAt({
      fundingStatus,
      nextCheckAt,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingsByStatusNextCheckAt({
    fundingStatus,
    nextCheckAt,
  }: {
    fundingStatus: TFundingStatus;
    nextCheckAt: Date;
  }): AsyncGenerator<TFundingByStatus, any, unknown> {
    return paginate((options) =>
      this.listAllFundingsByStatusNextCheckAtPaginated({
        fundingStatus,
        nextCheckAt,
        ...options,
      }),
    );
  }

  public async listAllFundingsByStatusNextCheckAtPaginated({
    fundingStatus,
    nextCheckAt,
    cursor,
    limit,
  }: {
    fundingStatus: TFundingStatus;
    nextCheckAt: Date;
  } & IPaginationOptions): Promise<IPaginatedResult<TFundingByStatus>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "statusNextCheckAtIndex",
        KeyConditionExpression:
          "fundingStatus = :fundingStatus AND nextCheckAt < :now",
        ExpressionAttributeValues: {
          ":fundingStatus": fundingStatus,
          ":now": nextCheckAt.getTime(),
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items:
        result.Items?.map((item) => ({
          address: item.address,
          id: item.id,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(0),
          nextCheckAt: item.nextCheckAt
            ? new Date(item.nextCheckAt)
            : new Date(0),
          fundingAmountSat: item.fundingAmountSat,
          network: toBitcoinNetworkName(item.network),
        })) ?? [],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async getAllFundingsByStatusFundedAt({
    fundingStatus,
    fundedAt,
  }: {
    fundingStatus: TFundingStatus;
    fundedAt: Date;
  }) {
    const results: {
      address: string;
      id: string;
      fundingAmountSat: number;
      network: BitcoinNetworkNames;
      fundedAt: Date;
      sizeEstimate: number;
      fundingTxid: string;
      fundingVout: number;
    }[] = [];
    for await (const item of this.listAllFundingsByStatusFundedAt({
      fundingStatus,
      fundedAt,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingsByStatusFundedAt({
    fundingStatus,
    fundedAt,
  }: {
    fundingStatus: TFundingStatus;
    fundedAt: Date;
  }): AsyncGenerator<TFundedByStatus, any, unknown> {
    return paginate((options) =>
      this.listAllFundingsByStatusFundedAtPaginated({
        fundingStatus,
        fundedAt,
        ...options,
      }),
    );
  }

  public async listAllFundingsByStatusFundedAtPaginated({
    fundingStatus,
    fundedAt,
    cursor,
    limit,
  }: {
    fundingStatus: TFundingStatus;
    fundedAt: Date;
  } & IPaginationOptions): Promise<IPaginatedResult<TFundedByStatus>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "statusFundedAtIndex",
        KeyConditionExpression:
          "fundingStatus = :fundingStatus AND fundedAt < :fundedAt",
        ExpressionAttributeValues: {
          ":fundingStatus": fundingStatus,
          ":fundedAt": fundedAt.getTime(),
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items:
        result.Items?.map((item) => ({
          address: item.address,
          id: item.id,
          fundingAmountSat: item.fundingAmountSat,
          network: toBitcoinNetworkName(item.network),
          fundedAt: item.fundedAt ? new Date(item.fundedAt) : new Date(0),
          sizeEstimate: item.sizeEstimate,
          fundingTxid: item.fundingTxid,
          fundingVout: item.fundingVout,
        })) ?? [],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async getAllPresalesByFarcasterFid({
    farcasterFid,
  }: {
    farcasterFid: string;
  }) {
    const results: IPresaleModel[] = [];
    for await (const item of this.listAllPresalesByFarcasterFid({
      farcasterFid,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllPresalesByFarcasterFid({
    farcasterFid,
  }: {
    farcasterFid: string;
  }): AsyncGenerator<IPresaleModel, any, unknown> {
    return paginate((options) =>
      this.listAllPresalesByFarcasterFidPaginated({
        farcasterFid,
        ...options,
      }),
    );
  }

  public async listAllPresalesByFarcasterFidPaginated({
    farcasterFid,
    cursor,
    limit,
  }: {
    farcasterFid: string;
  } & IPaginationOptions): Promise<IPaginatedResult<IPresaleModel>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "farcasterFid-index",
        KeyConditionExpression: "farcasterFid = :farcasterFid",
        ExpressionAttributeValues: {
          ":farcasterFid": farcasterFid,
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length || 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items:
        result.Items?.map((item) =>
          this.fromFundingDbToPresale(item as TPresaleDb),
        ) ?? [],
      cursor: encodeCursor({
        page,
        count,
        lastEvaluatedKey,
      }),
      page,
      count,
      size,
    };
  }

  public async createPresale(item: IPresaleModel) {
    const db = this.toFundingDbFromPresale(item);
    await this.client.send(
      new PutCommand({
        TableName: FundingDao.TABLE_NAME,
        Item: db,
        ReturnValues: "NONE",
      }),
    );
  }

  public async getPresale(id: string) {
    const db = await this.client.send(
      new GetCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
      }),
    );
    return this.fromFundingDbToPresale(db.Item as TPresaleDb);
  }

  public async createFunding(item: IAddressInscriptionModel<ItemMeta>) {
    const db = this.toFundingDb(item);
    await this.client.send(
      new PutCommand({
        TableName: FundingDao.TABLE_NAME,
        Item: db,
        ReturnValues: "NONE",
      }),
    );
  }

  public async getFunding(id: string) {
    const db = await this.client.send(
      new GetCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
      }),
    );
    return FundingDao.fromFundingDb(db.Item as TFundingDb<ItemMeta>);
  }

  public async deleteFunding(id: string) {
    await this.client.send(
      new DeleteCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
      }),
    );
  }

  // public async pendingCountByCollection(id: ID_Collection) {
  //   const db = await this.client.send(
  //     new GetCommand({
  //       TableName: FundingDao.TABLE_NAME,
  //       Key: {
  //         pk: id,
  //         sk: "collection",
  //       },
  //     }),
  //   );
  //   if (!db.Item) {
  //     throw new Error("Collection not found");
  //   }
  //   let pendingCount = (db.Item as TFundingCollectionDb<CollectionMeta>)
  //     .pendingCount;
  //   if (typeof pendingCount === "undefined") {
  //     // backfill
  //     const fundings = await this.listAllFundingsByStatus({
  //       id,
  //       fundingStatus: ""
  //     });
  //   }
  // }

  public async updatePendingCount(
    id: ID_Collection,
    pendingCount: number,
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "ADD pendingCount :pendingCount",
        ExpressionAttributeValues: {
          ":pendingCount": pendingCount,
        },
      }),
    );
  }

  public async updateFundingNextCheckAt({
    id,
    nextCheckAt,
  }: {
    id: string;
    nextCheckAt: Date;
  }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET nextCheckAt = :nextCheckAt",
        ExpressionAttributeValues: {
          ":nextCheckAt": nextCheckAt.getTime(),
        },
      }),
    );
  }

  public async updateFundingLastChecked({
    id,
    lastChecked,
    resetTimesChecked,
  }: {
    id: string;
    lastChecked: Date;
    resetTimesChecked?: boolean;
  }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: resetTimesChecked
          ? "SET lastChecked = :lastChecked, timesChecked = :timesChecked"
          : "SET lastChecked = :lastChecked, timesChecked = timesChecked + :one",
        ExpressionAttributeValues: resetTimesChecked
          ? {
              ":lastChecked": lastChecked.getTime(),
              ":timesChecked": 0,
            }
          : {
              ":lastChecked": lastChecked.getTime(),
              ":one": 1,
            },
      }),
    );
  }

  public async addressFunded({
    id,
    fundingTxid,
    fundingVout,
  }: {
    id: string;
    fundingTxid: string;
    fundingVout: number;
  }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression:
          "SET fundingTxid = :fundingTxid, fundingVout = :fundingVout, fundingStatus = :fundingStatus, fundedAt = :fundedAt",
        ExpressionAttributeValues: {
          ":fundingTxid": fundingTxid,
          ":fundingVout": fundingVout,
          ":fundingStatus": "funded",
          ":fundedAt": new Date().getTime(),
        },
      }),
    );
  }

  public async expire({ id }: { id: string }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET fundingStatus = :fundingStatus",
        ExpressionAttributeValues: {
          ":fundingStatus": "expired",
        },
      }),
    );
  }

  public async revealFunded({
    id,
    revealTxid,
  }: {
    id: string;
    revealTxid: string;
  }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "funding",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression:
          "SET revealTxid = :revealTxid, fundingStatus = :fundingStatus",
        ExpressionAttributeValues: {
          ":revealTxid": revealTxid,
          ":fundingStatus": "revealed" as TFundingStatus,
        },
      }),
    );
  }

  public async updateBatchId({
    id,
    batchId,
    type,
  }: {
    id: string;
    batchId: string;
    type: "funding" | "genesis" | "revealed";
  }) {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: type,
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET batchId = :batchId",
        ExpressionAttributeValues: {
          ":batchId": batchId,
        },
      }),
    );
  }

  public async createCollection(item: TCollectionModel<CollectionMeta>) {
    const db = FundingDao.toCollectionDb(item);
    await this.client.send(
      new PutCommand({
        TableName: FundingDao.TABLE_NAME,
        Item: db,
        ReturnValues: "NONE",
      }),
    );
  }

  public async getCollection(id: ID_Collection) {
    const db = await this.client.send(
      new GetCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
      }),
    );
    if (!db.Item) {
      return null;
    }
    return FundingDao.fromCollectionDb(
      db.Item as TFundingCollectionDb<CollectionMeta>,
    );
  }

  public async getCollectionByName(name: string) {
    const db = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "collectionByName",
        KeyConditionExpression: "collectionName = :collectionName",
        ExpressionAttributeValues: {
          ":collectionName": name,
        },
      }),
    );
    if (db.Items == null) {
      return [];
    }
    return db.Items.map((item) =>
      FundingDao.fromCollectionDb(item as TFundingCollectionDb<CollectionMeta>),
    );
  }

  public async deleteCollection(id: ID_Collection) {
    await this.client.send(
      new DeleteCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
      }),
    );
  }

  public async incrementCollectionTotalCount(
    id: ID_Collection,
  ): Promise<number> {
    const response = await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
        ConditionExpression: "attribute_exists(pk) AND totalCount < maxSupply",
        UpdateExpression: "ADD totalCount :one",
        ExpressionAttributeValues: {
          ":one": 1,
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    if (!response.Attributes) {
      throw new Error("Collection not found");
    }
    return (response.Attributes?.totalCount as number) ?? 0;
  }

  public async updateMaxSupply(
    id: ID_Collection,
    maxSupply: number,
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET maxSupply = :maxSupply",
        ExpressionAttributeValues: {
          ":maxSupply": maxSupply,
        },
      }),
    );
  }

  public async getAllCollections(): Promise<
    TCollectionModel<CollectionMeta>[]
  > {
    const models: TCollectionModel<CollectionMeta>[] = [];
    for await (const model of this.getAllCollectionIterator()) {
      models.push(model);
    }
    return models;
  }

  public getAllCollectionIterator() {
    return paginate((options) => this.getAllCollectionPaginated(options));
  }

  public async getAllCollectionPaginated(
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<TCollectionModel<CollectionMeta>>> {
    const pagination = decodeCursor(options?.cursor);
    const result = await this.client.send(
      new ScanCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "GSI1",
        ...(pagination
          ? {
              ExclusiveStartKey: pagination.lastEvaluatedKey,
            }
          : {}),
        ...(options?.limit
          ? {
              Limit: options.limit,
            }
          : {}),
        FilterExpression: "sk = :sk",
        ExpressionAttributeValues: {
          ":sk": "collection",
        },
      }),
    );

    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;
    const cursor = encodeCursor({ lastEvaluatedKey, page, count });
    return {
      items:
        result.Items?.map((item) =>
          FundingDao.fromCollectionDb(
            item as TFundingCollectionDb<CollectionMeta>,
          ),
        ) ?? [],
      cursor,
      page,
      count,
      size,
    };
  }

  async updateCollectionMeta(id: ID_Collection, meta: CollectionMeta) {
    let updateExpression = `SET ${Object.keys(meta).reduce((acc, key) => {
      return `${acc.length > 0 ? `${acc},` : ""} #${key} = :${key}`;
    }, "")}`;
    const expressionAttributeValues = Object.keys(meta).reduce(
      (acc, key) => ({
        ...acc,
        [`:${key}`]: meta[key],
      }),
      {} as Record<string, any>,
    );
    const expressionAttributeNames = Object.keys(meta).reduce(
      (acc, key) => ({
        ...acc,
        [`#${key}`]: key,
      }),
      {} as Record<string, string>,
    );
    const response = await this.client.send(
      new UpdateCommand({
        TableName: FundingDao.TABLE_NAME,
        Key: {
          pk: id,
          sk: "collection",
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: "ALL_NEW",
      }),
    );
    if (!response.Attributes) {
      throw new Error("Collection not found");
    }
    return FundingDao.fromCollectionDb(
      response.Attributes as TFundingCollectionDb<CollectionMeta>,
    );
  }

  private toFundingDbFromPresale({
    address,
    collectionId,
    destinationAddress,
    fundingAmountBtc,
    fundingAmountSat,
    fundingStatus,
    id,
    network,
    timesChecked,
    fundedAt,
    lastChecked,
    nextCheckAt,
    createdAt,
    tipAmountDestination,
    tipAmountSat,
    farcasterFid,
    secKey,
    sizeEstimate,
  }: IPresaleModel): TPresaleDb {
    return {
      pk: id,
      sk: "funding",
      id,
      address,
      collectionId,
      destinationAddress,
      fundingAmountBtc,
      fundingAmountSat,
      fundingStatus,
      network,
      secKey,
      timesChecked,
      sizeEstimate,
      ...(fundedAt && { fundedAt: fundedAt.getTime() }),
      ...(lastChecked && { lastChecked: lastChecked.getTime() }),
      ...(nextCheckAt && { nextCheckAt: nextCheckAt.getTime() }),
      ...(tipAmountDestination && { tipAmountDestination }),
      ...(tipAmountSat && { tipAmountSat }),
      ...(farcasterFid && { farcasterFid }),
      ...(createdAt && { createdAt: createdAt.getTime() }),
    };
  }

  private toFundingDb<T extends Record<string, any>>({
    address,
    collectionId,
    destinationAddress,
    id,
    network,
    fundingStatus,
    fundedAt,
    revealTxid,
    fundingTxid,
    fundingVout,
    refundedTxid,
    creatorUserId,
    meta,
    lastChecked,
    nextCheckAt,
    createdAt,
    timesChecked,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
    batchId,
    sizeEstimate,
  }: IAddressInscriptionModel<T>): TFundingDb<T> {
    return {
      pk: id,
      sk: "funding",
      id,
      address,
      collectionId,
      network,
      fundingStatus,
      timesChecked,
      fundingAmountBtc,
      fundingAmountSat,
      destinationAddress,
      sizeEstimate,
      createdAt: createdAt.getTime(),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: lastChecked.getTime(),
      }),
      ...(typeof nextCheckAt !== "undefined"
        ? {
            nextCheckAt: nextCheckAt.getTime(),
          }
        : {
            nextCheckAt: new Date().getTime(),
          }),
      ...(typeof creatorUserId !== "undefined" && { creatorUserId }),
      ...(typeof tipAmountSat !== "undefined" && { tipAmountSat }),
      ...(typeof tipAmountDestination !== "undefined" && {
        tipAmountDestination,
      }),
      ...(typeof fundedAt !== "undefined" && { fundedAt: fundedAt.getTime() }),
      ...(typeof revealTxid !== "undefined" && { revealTxid }),
      ...(typeof fundingTxid !== "undefined" && { fundingTxid }),
      ...(typeof fundingVout !== "undefined" && { fundingVout }),
      ...(typeof refundedTxid !== "undefined" && { refundedTxid }),
      ...(typeof batchId !== "undefined" && { batchId }),
      ...(typeof meta !== "undefined"
        ? // remove undefined values
          (mapMetaKeys<T>(
            Array.from(Object.entries(meta)).reduce((memo, [key, value]) => {
              if (typeof value !== "undefined") {
                (memo[key] as any) = value;
              }
              return memo;
            }, {} as T),
          ) as T)
        : ({} as T)),
    };
  }

  private static toCollectionDb<T extends Record<string, any>>({
    id,
    maxSupply,
    pendingCount,
    totalCount,
    creatorUserId,
    name,
    meta,
  }: TCollectionModel<T>): TFundingCollectionDb<T> {
    return {
      pk: id,
      sk: "collection",
      collectionId: id,
      collectionName: name,
      maxSupply: maxSupply ?? 1,
      pendingCount,
      totalCount,
      ...(typeof creatorUserId !== "undefined" && { creatorUserId }),
      ...(meta
        ? // remove undefined values
          (mapMetaKeys(
            Array.from(Object.entries(meta)).reduce((memo, [key, value]) => {
              if (typeof value !== "undefined") {
                (memo[key] as any) = value;
              }
              return memo;
            }, {} as T),
          ) as T)
        : ({} as T)),
    };
  }

  private static fromCollectionDb<T extends Record<string, any>>({
    collectionId,
    maxSupply,
    collectionName,
    totalCount,
    pendingCount,
    creatorUserId,
    ...meta
  }: TFundingCollectionDb<T>): TCollectionModel<T> {
    return {
      id: toCollectionId(collectionId),
      ...(typeof maxSupply !== "undefined" && { maxSupply }),
      name: collectionName,
      totalCount: totalCount,
      pendingCount: pendingCount,
      ...(typeof creatorUserId !== "undefined" && { creatorUserId }),
      meta: unmapMetaKeys(excludePrimaryKeys(meta)) as T,
      type: "collection",
    };
  }

  private fromFundingDbToPresale({
    id,
    address,
    collectionId,
    destinationAddress,
    network,
    fundingStatus,
    timesChecked,
    lastChecked,
    nextCheckAt,
    createdAt,
    fundedAt,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
    farcasterFid,
    secKey,
    sizeEstimate,
  }: TPresaleDb): IPresaleModel {
    return {
      address,
      ...(typeof collectionId !== "undefined"
        ? { collectionId: toCollectionId(collectionId) }
        : {
            collectionId: toCollectionId(""),
          }),
      id: toPresaleId(id),
      network: toBitcoinNetworkName(network),
      fundingStatus: fundingStatus as TPresaleStatus,
      timesChecked,
      fundingAmountBtc,
      fundingAmountSat,
      destinationAddress,
      secKey,
      sizeEstimate,
      createdAt: new Date(createdAt),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: new Date(lastChecked),
      }),
      ...(typeof nextCheckAt !== "undefined" && {
        nextCheckAt: new Date(nextCheckAt),
      }),
      ...(typeof fundedAt !== "undefined" && { fundedAt: new Date(fundedAt) }),
      ...(typeof tipAmountSat !== "undefined" && { tipAmountSat }),
      ...(typeof tipAmountDestination !== "undefined" && {
        tipAmountDestination,
      }),
      ...(typeof farcasterFid !== "undefined" && { farcasterFid }),
    };
  }

  private static fromFundingDb<T extends Record<string, any>>({
    id,
    address,
    collectionId,
    destinationAddress,
    network,
    fundingStatus,
    revealTxid,
    fundingTxid,
    fundingVout,
    refundedTxid,
    timesChecked,
    lastChecked,
    nextCheckAt,
    createdAt,
    creatorUserId,
    fundedAt,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
    batchId,
    sizeEstimate,
    ...meta
  }: TFundingDb<T>): IAddressInscriptionModel<T> {
    return {
      address,
      id: toAddressInscriptionId(id),
      network: toBitcoinNetworkName(network),
      fundingStatus: fundingStatus as TFundingStatus,
      timesChecked,
      fundingAmountBtc,
      fundingAmountSat,
      destinationAddress,
      sizeEstimate,
      type: "address-inscription",
      createdAt: new Date(createdAt),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: new Date(lastChecked),
      }),
      ...(typeof nextCheckAt !== "undefined" && {
        nextCheckAt: new Date(nextCheckAt),
      }),
      ...(typeof creatorUserId !== "undefined" && { creatorUserId }),
      ...(typeof fundedAt !== "undefined" && { fundedAt: new Date(fundedAt) }),
      ...(typeof revealTxid !== "undefined" && { revealTxid }),
      ...(typeof fundingTxid !== "undefined" && { fundingTxid }),
      ...(typeof fundingVout !== "undefined" && { fundingVout }),
      ...(typeof refundedTxid !== "undefined" && { refundedTxid }),
      ...(typeof collectionId !== "undefined"
        ? { collectionId: toCollectionId(collectionId) }
        : {}),
      ...(typeof tipAmountSat !== "undefined" && { tipAmountSat }),
      ...(typeof tipAmountDestination !== "undefined" && {
        tipAmountDestination,
      }),
      ...(typeof batchId !== "undefined" && { batchId }),
      meta: unmapMetaKeys(excludePrimaryKeys(meta)) as T,
    };
  }

  public static recordToModel<T extends Record<string, any>>(record: {
    [key: string]: DynamoDBAttributeValue | LambdaAttributeValue;
  }): IAddressInscriptionModel<T> | TCollectionModel<T> | null {
    const dbRecord = unmarshall(record as unknown as DynamoDBAttributeValue);
    const isCollection = dbRecord.sk === "collection";
    const isFunding = dbRecord.sk === "funding";
    return isCollection
      ? FundingDao.fromCollectionDb(dbRecord as TFundingCollectionDb<T>)
      : isFunding
      ? FundingDao.fromFundingDb(dbRecord as TFundingDb<T>)
      : null;
  }
}
