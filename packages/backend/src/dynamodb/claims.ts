import {
  IObservedClaim,
  IPaginatedResult,
  IPaginationOptions,
  decodeCursor,
  encodeCursor,
  paginate,
} from "@0xflick/ordinals-models";
import {
  DynamoDBClient,
  PutRequest,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { handleBatchWrite } from "../utils/retryUnprocessedBatchWrite.js";

export interface IDBObservedClaim {
  pk: string;
  sk: string;
  ContractAddress: `0x${string}`;
  CollectionId: string;
  ChainId: number;
  ClaimedAddress: string;
  DestinationAddress: string;
  Index: number;
  ObservedBlockHeight: number;
  FundingId?: string;
  ClaimedAddressCollection: string;
}

function toPk({
  claimedAddress,
  contractAddress,
  chainId,
  destinationAddress,
  collectionId,
  index,
}: {
  claimedAddress: string;
  contractAddress: string;
  chainId: number;
  destinationAddress: string;
  collectionId: string;
  index: number;
}) {
  return `${collectionId}#${claimedAddress}#${contractAddress}#${chainId}#${destinationAddress}#${index}`;
}

function toSk({
  contractAddress,
  chainId,
  collectionId,
}: {
  contractAddress: string;
  chainId: number;
  collectionId: string;
}) {
  return `CLAIM#${contractAddress}#${chainId}#${collectionId}`;
}

function toClaimsByCollectionAddressPk({
  collectionId,
  claimedAddress,
}: {
  collectionId: string;
  claimedAddress: string;
}) {
  return `${collectionId}#${claimedAddress}`;
}

function toDB(input: IObservedClaim): IDBObservedClaim {
  return {
    pk: toPk(input),
    sk: toSk(input),
    ContractAddress: input.contractAddress,
    ChainId: input.chainId,
    ClaimedAddress: input.claimedAddress,
    DestinationAddress: input.destinationAddress,
    Index: input.index,
    ObservedBlockHeight: input.observedBlockHeight,
    CollectionId: input.collectionId,
    ClaimedAddressCollection: toClaimsByCollectionAddressPk(input),
    ...(input.fundingId && { FundingId: input.fundingId }),
  };
}

function toModel(input: IDBObservedClaim): IObservedClaim {
  return {
    contractAddress: input.ContractAddress as `0x${string}`,
    chainId: input.ChainId,
    claimedAddress: input.ClaimedAddress as `0x${string}`,
    destinationAddress: input.DestinationAddress,
    index: input.Index,
    observedBlockHeight: input.ObservedBlockHeight,
    fundingId: input.FundingId,
    collectionId: input.CollectionId,
  };
}

export class ClaimsDao {
  public static TABLE_NAME = "ObservedClaims";

  private client: DynamoDBClient;

  constructor(client: DynamoDBClient) {
    this.client = client;
  }

  public async get({
    contractAddress,
    chainId,
    claimedAddress,
    destinationAddress,
    index,
    collectionId,
  }: {
    contractAddress: `0x${string}`;
    chainId: number;
    claimedAddress: `0x${string}`;
    destinationAddress: string;
    index: number;
    collectionId: string;
  }) {
    const response = await this.client.send(
      new GetCommand({
        TableName: ClaimsDao.TABLE_NAME,
        Key: {
          pk: toPk({
            claimedAddress,
            contractAddress,
            chainId,
            destinationAddress,
            index,
            collectionId,
          }),
          sk: toSk({ contractAddress, chainId, collectionId }),
        },
      }),
    );
    return response.Item ? toModel(response.Item as IDBObservedClaim) : null;
  }

  public async put(input: IObservedClaim) {
    await this.client.send(
      new PutCommand({
        TableName: ClaimsDao.TABLE_NAME,
        Item: toDB(input),
      }),
    );
  }

  public async getClaimedEventsForBlockHeight({
    blockHeightBegin,
    blockHeightEnd,
  }: {
    blockHeightBegin: number;
    blockHeightEnd: number;
  }) {
    const claims: IObservedClaim[] = [];
    for await (const item of this.listClaimedEventsForBlockHeight({
      blockHeightBegin,
      blockHeightEnd,
    })) {
      claims.push(item);
    }
  }

  public listClaimedEventsForBlockHeight({
    blockHeightBegin,
    blockHeightEnd,
  }: {
    blockHeightBegin: number;
    blockHeightEnd: number;
  }) {
    return paginate((options) =>
      this.listClaimedEventsForBlockHeightPaginated({
        blockHeightBegin,
        blockHeightEnd,
        ...options,
      }),
    );
  }

  public async listClaimedEventsForBlockHeightPaginated({
    blockHeightBegin,
    blockHeightEnd,
    cursor,
    limit,
  }: {
    blockHeightBegin: number;
    blockHeightEnd: number;
  } & IPaginationOptions): Promise<IPaginatedResult<IObservedClaim>> {
    const pagination = decodeCursor(cursor);
    const response = await this.client.send(
      new QueryCommand({
        TableName: ClaimsDao.TABLE_NAME,
        IndexName: "ObservedBlockHeight-index",
        KeyConditionExpression: "ObservedBlockHeight BETWEEN :begin AND :end",
        ExpressionAttributeValues: {
          ":begin": blockHeightBegin,
          ":end": blockHeightEnd,
        },
        ...(pagination && {
          ExclusiveStartKey: pagination.lastEvaluatedKey,
        }),
        ...(limit && {
          Limit: limit,
        }),
      }),
    );
    const lastEvaluatedKey = response.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = response.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: response.Items?.map((m) => toModel(m as IDBObservedClaim)) ?? [],
      cursor: encodeCursor({
        page,
        lastEvaluatedKey,
        count,
      }),
      page,
      count,
      size,
    };
  }

  public async getLastObservedBlockHeight({
    contractAddress,
    chainId,
    collectionId,
  }: {
    contractAddress: string;
    chainId: number;
    collectionId: string;
  }) {
    const response = await this.client.send(
      new GetCommand({
        TableName: ClaimsDao.TABLE_NAME,
        Key: {
          pk: toSk({ contractAddress, chainId, collectionId }),
          sk: "LAST_OBSERVED_BLOCK_HEIGHT",
        },
        AttributesToGet: ["ObservedBlockHeight"],
      }),
    );
    if (!response.Item) {
      return null;
    }
    return (response.Item as IDBObservedClaim).ObservedBlockHeight;
  }

  public async batchGetLastObservedBlockHeight({
    observedContracts,
  }: {
    observedContracts: {
      contractAddress: string;
      chainId: number;
      collectionId: string;
    }[];
  }) {
    if (!observedContracts.length) {
      return [];
    }
    const response = await this.client.send(
      new BatchGetCommand({
        RequestItems: {
          [ClaimsDao.TABLE_NAME]: {
            Keys: observedContracts.map((oc) => ({
              pk: toSk(oc),
              sk: "LAST_OBSERVED_BLOCK_HEIGHT",
            })),
            ProjectionExpression:
              "ObservedBlockHeight, ChainId, ContractAddress, CollectionId",
          },
        },
      }),
    );
    const items = response.Responses?.[ClaimsDao.TABLE_NAME];
    if (!items) {
      return [];
    }
    return (items as IDBObservedClaim[]).map(
      ({
        ContractAddress: contractAddress,
        ChainId: chainId,
        ObservedBlockHeight: observedBlockHeight,
        CollectionId: collectionId,
      }: IDBObservedClaim) => ({
        contractAddress,
        chainId,
        observedBlockHeight,
        collectionId,
      }),
    );
  }

  public async batchUpdateObservedClaims({
    observedClaims,
  }: {
    observedClaims: IObservedClaim[];
  }) {
    const observedContracts = new Map<
      string,
      {
        contractAddress: `0x${string}`;
        chainId: number;
        collectionId: string;
        maxBlockHeight: number;
      }
    >();
    for (const oc of observedClaims) {
      const key = toSk(oc);
      if (!observedContracts.has(key)) {
        observedContracts.set(key, {
          contractAddress: oc.contractAddress,
          chainId: oc.chainId,
          maxBlockHeight: oc.observedBlockHeight, // Use observedBlockHeight here initially
          collectionId: oc.collectionId,
        });
      } else {
        const observedContract = observedContracts.get(key);
        if (observedContract) {
          observedContract.maxBlockHeight = Math.max(
            observedContract.maxBlockHeight,
            oc.observedBlockHeight,
          );
        }
      }
    }
    await handleBatchWrite(this.client, {
      RequestItems: {
        [ClaimsDao.TABLE_NAME]: [
          ...observedClaims.map((oc) => ({
            PutRequest: {
              Item: toDB(oc),
            },
          })),
          ...Array.from(observedContracts.values()).map((oc) => ({
            PutRequest: {
              Item: {
                pk: toSk(oc),
                sk: "LAST_OBSERVED_BLOCK_HEIGHT",
                ContractAddress: oc.contractAddress,
                ChainId: oc.chainId,
                ObservedBlockHeight: oc.maxBlockHeight,
              },
            },
          })),
        ],
      },
    });
  }

  public async updateLastObserved({
    contractAddress,
    chainId,
    observedBlockHeight,
    collectionId,
  }: {
    contractAddress: string;
    chainId: number;
    observedBlockHeight: number;
    collectionId: string;
  }) {
    await this.client.send(
      new PutCommand({
        TableName: ClaimsDao.TABLE_NAME,
        Item: {
          pk: toSk({
            contractAddress,
            chainId,
            collectionId,
          }),
          sk: "LAST_OBSERVED_BLOCK_HEIGHT",
          ContractAddress: contractAddress,
          ChainId: chainId,
          ObservedBlockHeight: observedBlockHeight,
        },
        ReturnValues: "NONE",
      }),
    );
  }

  async getAllClaimsForCollectionAddress({
    collectionId,
    claimedAddress,
    contractAddress,
    chainId,
  }: {
    collectionId: string;
    claimedAddress: string;
    contractAddress?: `0x${string}`;
    chainId?: number;
  }) {
    const claims: IObservedClaim[] = [];
    for await (const claim of this.listAllClaimsForCollectionAddress({
      collectionId,
      claimedAddress,
      contractAddress,
      chainId,
    })) {
      claims.push(claim);
    }
    return claims;
  }

  listAllClaimsForCollectionAddress({
    collectionId,
    claimedAddress,
    contractAddress,
    chainId,
  }: {
    collectionId: string;
    claimedAddress: string;
    contractAddress?: `0x${string}`;
    chainId?: number;
  }) {
    return paginate((options) =>
      this.listAllClaimsForCollectionAddressPaginated({
        ...options,
        claimedAddress,
        collectionId,
        contractAddress,
        chainId,
      }),
    );
  }

  async listAllClaimsForCollectionAddressPaginated({
    collectionId,
    claimedAddress,
    chainId,
    contractAddress,
    limit,
    cursor,
  }: {
    collectionId: string;
    claimedAddress: string;
    contractAddress?: `0x${string}`;
    chainId?: number;
  } & IPaginationOptions): Promise<IPaginatedResult<IObservedClaim>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: ClaimsDao.TABLE_NAME,
        IndexName: "ClaimsByCollectionAddress",
        KeyConditionExpression: `ClaimedAddressCollection = :key${
          contractAddress && chainId ? " AND sk = :sk" : ""
        }`,
        ExpressionAttributeValues: {
          ":key": toClaimsByCollectionAddressPk({
            collectionId,
            claimedAddress,
          }),
          ...(contractAddress && chainId
            ? { ":sk": toSk({ contractAddress, chainId, collectionId }) }
            : {}),
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: result.Items?.map((m) => toModel(m as IDBObservedClaim)) ?? [],
      cursor: encodeCursor({
        lastEvaluatedKey,
        page,
        count,
      }),
      page,
      count,
      size,
    };
  }

  async getAllClaimsForCollection({ collectionId }: { collectionId: string }) {
    const claims: IObservedClaim[] = [];
    for await (const claim of this.listAllClaimsForCollection({
      collectionId,
    })) {
      claims.push(claim);
    }
    return claims;
  }

  listAllClaimsForCollection({ collectionId }: { collectionId: string }) {
    return paginate((options) =>
      this.listAllClaimsForCollectionPaginated({
        ...options,
        collectionId,
      }),
    );
  }

  async listAllClaimsForCollectionPaginated({
    collectionId,
    limit,
    cursor,
  }: {
    collectionId: string;
  } & IPaginationOptions): Promise<IPaginatedResult<IObservedClaim>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: ClaimsDao.TABLE_NAME,
        IndexName: "ClaimsByCollection",
        KeyConditionExpression: "CollectionId = :collectionId",
        ExpressionAttributeValues: {
          ":collectionId": collectionId,
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: result.Items?.map((m) => toModel(m as IDBObservedClaim)) ?? [],
      cursor: encodeCursor({
        lastEvaluatedKey,
        page,
        count,
      }),
      page,
      count,
      size,
    };
  }

  async getAllClaims({ address }: { address: `0x${string}` }) {
    const claims: IObservedClaim[] = [];
    for await (const claim of this.listAllClaims({
      address,
    })) {
      claims.push(claim);
    }
    return claims;
  }

  listAllClaims({ address }: { address: `0x${string}` }) {
    return paginate((options) =>
      this.listAllClaimsPaginated({
        ...options,
        address,
      }),
    );
  }

  async listAllClaimsPaginated({
    address,
    limit,
    cursor,
  }: {
    address: `0x${string}`;
  } & IPaginationOptions): Promise<IPaginatedResult<IObservedClaim>> {
    const pagination = decodeCursor(cursor);
    const result = await this.client.send(
      new QueryCommand({
        TableName: ClaimsDao.TABLE_NAME,
        IndexName: "ClaimsByAddress",
        KeyConditionExpression: "ClaimedAddress = :address",
        ExpressionAttributeValues: {
          ":address": address,
        },
        ...(pagination && { ExclusiveStartKey: pagination.lastEvaluatedKey }),
        ...(limit && { Limit: limit }),
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;

    return {
      items: result.Items?.map((m) => toModel(m as IDBObservedClaim)) ?? [],
      cursor: encodeCursor({
        lastEvaluatedKey,
        page,
        count,
      }),
      page,
      count,
      size,
    };
  }

  async batchUpdateFundingIds({
    observedClaimsWithFundingIds,
  }: {
    observedClaimsWithFundingIds: (Omit<IObservedClaim, "fundingId"> & {
      fundingId: string;
    })[];
  }) {
    // iterate through each item and update only the fundingId
    for (const oc of observedClaimsWithFundingIds) {
      await this.client.send(
        new UpdateCommand({
          TableName: ClaimsDao.TABLE_NAME,
          Key: {
            pk: toPk(oc),
            sk: toSk(oc),
          },
          UpdateExpression: "SET FundingId = :fundingId",
          ExpressionAttributeValues: {
            ":fundingId": oc.fundingId,
          },
        }),
      );
    }
  }
}
