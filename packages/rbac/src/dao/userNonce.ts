import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidV4 } from "uuid";
import { IUserNonce, UserAddressType } from "@0xflick/ordinals-rbac-models";

function toId(address: string, nonce: string) {
  return `ADDRESS#${address}NONCE#${nonce}`;
}

interface IUserDb {
  pk: string;
  sk: string;
  Address: string;
  AddressType: UserAddressType;
  Nonce: string;
  TTL: number;
  Domain: string;
  Uri: string;
  ExpiresAt: string;
  IssuedAt: string;
  Version?: string;
  ChainId?: number;
}

function toDb(input: IUserNonce): IUserDb {
  return {
    Address: input.address.address,
    AddressType: input.address.type,
    Nonce: input.nonce,
    Domain: input.domain,
    Uri: input.uri,
    ExpiresAt: input.expiresAt,
    IssuedAt: input.issuedAt,
    pk: toId(input.address.address, input.nonce),
    sk: input.address.address,
    TTL: Math.floor(Date.now() / 1000) + UserNonceDAO.TTL,
    ...(input.version && { Version: input.version }),
    ...(input.chainId && { ChainId: input.chainId }),
  };
}

function fromDb(input: IUserDb): IUserNonce {
  return {
    address: {
      address: input.Address,
      type: input.AddressType,
    },
    nonce: input.Nonce,
    domain: input.Domain,
    expiresAt: input.ExpiresAt,
    issuedAt: input.IssuedAt,
    uri: input.Uri,
    version: input.Version,
    chainId: input.ChainId,
  };
}

export class UserNonceDAO {
  public static TABLE_NAME = process.env.TABLE_NAME_USER_NONCE || "UserNonce";
  public static TTL = 60 * 60 * 24 * 2; // 2 days
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async createNonce({
    nonce,
    ...request
  }: Omit<IUserNonce, "nonce"> & { nonce?: string }): Promise<string> {
    nonce = nonce ?? uuidV4();
    await this.db.send(
      new PutCommand({
        TableName: UserNonceDAO.TABLE_NAME,
        Item: toDb({
          ...request,
          nonce,
        }),
      }),
    );
    return nonce;
  }

  public async getNonce(
    address: string,
    nonce: string,
  ): Promise<IUserNonce | null> {
    const response = await this.db.send(
      new GetCommand({
        TableName: UserNonceDAO.TABLE_NAME,
        Key: {
          pk: toId(address, nonce),
          sk: address,
        },
      }),
    );
    if (!response.Item) {
      return null;
    }
    return fromDb(response.Item as IUserDb);
  }

  public async validNonceForAddress(address: string, nonce: string) {
    const response = await this.db.send(
      new GetCommand({
        TableName: UserNonceDAO.TABLE_NAME,
        Key: {
          pk: toId(address, nonce),
          sk: address,
        },
      }),
    );
    if (!response.Item) {
      return false;
    }
    return true;
  }

  public async getAddressNonces(address: string): Promise<string[] | null> {
    const userRecord = await this.db.send(
      new QueryCommand({
        TableName: UserNonceDAO.TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "sk = :address",
        ExpressionAttributeValues: {
          ":address": address,
        },
      }),
    );
    if (!userRecord.Items) {
      return null;
    }
    return userRecord.Items.map((item) => item.Nonce);
  }
}
