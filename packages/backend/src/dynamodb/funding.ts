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
  fundingTxid?: string;
  fundingVout?: number;
  revealTxids?: string[];
  genesisTxid?: string;
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

  public async getAllFundingsByStatus({
    id,
    fundingStatus,
  }: {
    id?: ID_Collection;
    fundingStatus?: TFundingStatus;
  }) {
    const results: {
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }[] = [];
    for await (const item of this.listAllFundingsByStatus({
      id,
      fundingStatus,
    })) {
      results.push(item);
    }
    return results;
  }

  public listAllFundingsByStatus(opts: {
    id?: ID_Collection;
    fundingStatus?: TFundingStatus;
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
      this.listAllFundingByStatusPaginated({ ...opts, ...options }),
    );
  }

  public async listAllFundingByStatusPaginated({
    id,
    fundingStatus,
    cursor,
    limit,
  }: {
    id?: ID_Collection;
    fundingStatus?: TFundingStatus;
  } & IPaginationOptions): Promise<
    IPaginatedResult<{
      address: string;
      id: string;
      lastChecked: Date;
      timesChecked: number;
      fundingAmountSat: number;
    }>
  > {
    if (!id && !fundingStatus) {
      throw new Error("Must provide either id or fundingStatus");
    }
    let keyConditionExpression: string;
    let expressionAttributeValues: Record<string, any>;
    if (id && fundingStatus) {
      keyConditionExpression =
        "collectionId = :collectionId AND fundingStatus = :sk";
      expressionAttributeValues = {
        ":collectionId": toCollectionId(id),
        ":sk": fundingStatus,
      };
    } else if (id) {
      keyConditionExpression = "collectionId = :collectionId";
      expressionAttributeValues = {
        ":collectionId": toCollectionId(id),
      };
    } else {
      keyConditionExpression = "fundingStatus = :sk";
      expressionAttributeValues = {
        ":sk": fundingStatus,
      };
    }
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: FundingDao.TABLE_NAME,
        IndexName: "collectionId-index",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
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
  }): AsyncGenerator<
    {
      address: string;
      id: string;
      createdAt: Date;
      nextCheckAt: Date;
      fundingAmountSat: number;
      network: BitcoinNetworkNames;
    },
    any,
    unknown
  > {
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
  } & IPaginationOptions): Promise<
    IPaginatedResult<{
      address: string;
      id: string;
      createdAt: Date;
      nextCheckAt: Date;
      fundingAmountSat: number;
      network: BitcoinNetworkNames;
    }>
  > {
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
          "SET fundingTxid = :fundingTxid, fundingVout = :fundingVout, fundingStatus = :fundingStatus",
        ExpressionAttributeValues: {
          ":fundingTxid": fundingTxid,
          ":fundingVout": fundingVout,
          ":fundingStatus": "funded",
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

  public async genesisFunded({
    genesisTxid,
    id,
  }: {
    id: string;
    genesisTxid: string;
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
          "SET genesisTxid = :genesisTxid, fundingStatus = :fundingStatus, revealTxids = :revealTxids",
        ExpressionAttributeValues: {
          ":genesisTxid": genesisTxid,
          ":fundingStatus": "genesis",
          ":revealTxids": [],
        },
      }),
    );
  }

  public async revealsFunded({
    id,
    revealTxids,
  }: {
    id: string;
    revealTxids: string[];
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
          "SET revealTxids = :revealTxids, fundingStatus = :fundingStatus",
        ExpressionAttributeValues: {
          ":revealTxids": revealTxids,
          ":fundingStatus": "revealed",
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
          "SET revealTxids = list_append(revealTxids, :revealTxid)",
        ExpressionAttributeValues: {
          ":revealTxid": [revealTxid],
        },
      }),
    );
    // Update state if and only if contentIds.length === revealTxids.length
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: FundingDao.TABLE_NAME,
          Key: {
            pk: id,
            sk: "funding",
          },
          ConditionExpression:
            "attribute_exists(pk) AND size(revealTxids) >= size(contentIds)",
          UpdateExpression: "SET fundingStatus = :fundingStatus",
          ExpressionAttributeValues: {
            ":fundingStatus": "revealed",
          },
        }),
      );
    } catch (error) {
      // ignore
    }
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
    fundingTxid,
    fundingVout,
    lastChecked,
    nextCheckAt,
    createdAt,
    tipAmountDestination,
    tipAmountSat,
    farcasterFid,
    secKey,
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
      ...(fundingTxid && { fundingTxid }),
      ...(fundingVout && { fundingVout }),
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
    fundingTxid,
    fundingVout,
    genesisTxid,
    revealTxids,
    meta,
    lastChecked,
    nextCheckAt,
    createdAt,
    timesChecked,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
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
      createdAt: createdAt.getTime(),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: lastChecked.getTime(),
      }),
      ...(typeof nextCheckAt !== "undefined" && {
        nextCheckAt: nextCheckAt.getTime(),
      }),
      ...(typeof tipAmountSat !== "undefined" && { tipAmountSat }),
      ...(typeof tipAmountDestination !== "undefined" && {
        tipAmountDestination,
      }),
      ...(typeof fundingTxid !== "undefined" && { fundingTxid }),
      ...(typeof fundingVout !== "undefined" && { fundingVout }),
      ...(typeof genesisTxid !== "undefined" && { genesisTxid }),
      ...(typeof revealTxids !== "undefined" && { revealTxids }),
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
    ...meta
  }: TFundingCollectionDb<T>): TCollectionModel<T> {
    return {
      id: toCollectionId(collectionId),
      maxSupply: maxSupply,
      name: collectionName,
      totalCount: totalCount,
      pendingCount: pendingCount,
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
    fundingTxid,
    fundingVout,
    timesChecked,
    lastChecked,
    nextCheckAt,
    createdAt,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
    farcasterFid,
    secKey,
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
      createdAt: new Date(createdAt),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: new Date(lastChecked),
      }),
      ...(typeof nextCheckAt !== "undefined" && {
        nextCheckAt: new Date(nextCheckAt),
      }),
      ...(typeof fundingTxid !== "undefined" && { fundingTxid }),
      ...(typeof fundingVout !== "undefined" && { fundingVout }),
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
    fundingTxid,
    fundingVout,
    genesisTxid,
    revealTxids,
    timesChecked,
    lastChecked,
    nextCheckAt,
    createdAt,
    fundingAmountBtc,
    fundingAmountSat,
    tipAmountDestination,
    tipAmountSat,
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
      type: "address-inscription",
      createdAt: new Date(createdAt),
      ...(typeof lastChecked !== "undefined" && {
        lastChecked: new Date(lastChecked),
      }),
      ...(typeof nextCheckAt !== "undefined" && {
        nextCheckAt: new Date(nextCheckAt),
      }),
      ...(typeof fundingTxid !== "undefined" && { fundingTxid }),
      ...(typeof fundingVout !== "undefined" && { fundingVout }),
      ...(typeof genesisTxid !== "undefined" && { genesisTxid }),
      ...(typeof revealTxids !== "undefined" && { revealTxids }),
      ...(typeof collectionId !== "undefined"
        ? { collectionId: toCollectionId(collectionId) }
        : {}),
      ...(typeof tipAmountSat !== "undefined" && { tipAmountSat }),
      ...(typeof tipAmountDestination !== "undefined" && {
        tipAmountDestination,
      }),
      meta: unmapMetaKeys(excludePrimaryKeys(meta)) as T,
    };
  }

  public static recordToModel<T extends Record<string, any>>(record: {
    [key: string]: DynamoDBAttributeValue | LambdaAttributeValue;
  }): IAddressInscriptionModel<T> | TCollectionModel<T> {
    const dbRecord = unmarshall(record as unknown as DynamoDBAttributeValue);
    const isCollection = dbRecord.sk === "collection";
    return isCollection
      ? FundingDao.fromCollectionDb(dbRecord as TFundingCollectionDb<T>)
      : FundingDao.fromFundingDb(dbRecord as TFundingDb<T>);
  }
}
