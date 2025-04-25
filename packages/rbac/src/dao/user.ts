import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidV4 } from "uuid";
import {
  UserModel,
  IUser,
  UserWithRolesModel,
  INonceRequest,
  EActions,
  EResource,
  UserAddressType,
  IUserAddress,
  roleIdsToAddresses,
} from "@0xflick/ordinals-rbac-models";
import { RolePermissionsDAO } from "./rolePermissions.js";
import { UserRolesDAO } from "./userRoles.js";
import { RolesDAO } from "./roles.js";

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
  UserId?: string;
}

function toDb(input: INonceRequest): IUserDb {
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
    TTL: Math.floor(Date.now() / 1000) + UserDAO.TTL,
    ...(input.version && { Version: input.version }),
    ...(input.chainId && { ChainId: input.chainId }),
    ...(input.userId && { UserId: input.userId }),
  };
}

function fromDb(input: IUserDb): INonceRequest {
  return {
    address: {
      address: input.Address,
      type: input.AddressType,
    },
    userId: input.UserId,
    nonce: input.Nonce,
    domain: input.Domain,
    expiresAt: input.ExpiresAt,
    issuedAt: input.IssuedAt,
    uri: input.Uri,
    version: input.Version,
    chainId: input.ChainId,
  };
}

export class UserDAO {
  public static TABLE_NAME = process.env.TABLE_NAME_USER_NONCE || "UserNonce";
  public static TTL = 60 * 60 * 24 * 2; // 2 days
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async create({
    nonce,
    ...request
  }: Omit<INonceRequest, "nonce"> & { nonce?: string }): Promise<string> {
    nonce = nonce ?? uuidV4();
    await this.db.send(
      new PutCommand({
        TableName: UserDAO.TABLE_NAME,
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
  ): Promise<INonceRequest | null> {
    const response = await this.db.send(
      new GetCommand({
        TableName: UserDAO.TABLE_NAME,
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
        TableName: UserDAO.TABLE_NAME,
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
        TableName: UserDAO.TABLE_NAME,
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

  public async getUserWithRoles(
    userRolesDao: UserRolesDAO,
    userId: string,
  ): Promise<UserWithRolesModel> {
    // Fetch all roles
    const roleIds = await userRolesDao.getAllRoleIds(userId);

    return new UserWithRolesModel({
      userId,
      roleIds,
      addresses: roleIdsToAddresses(roleIds),
    });
  }

  public async allowedActionsForUserId(
    userRoles: UserRolesDAO,
    rolePermissionsDao: RolePermissionsDAO,
    userId: string,
  ) {
    const user = await this.getUserWithRoles(userRoles, userId);
    // Fetch permissions for all roles
    const permissions = await rolePermissionsDao.allowedActionsForRoleIds(
      user.roleIds,
    );
    return permissions;
  }

  // weird function, maybe remove
  /**
   *
   * @param userRoles
   * @param rolePermissionsDao
   * @param address
   * @param possibilities
   * @returns
   * @deprecated
   */
  public async canPerformAction(
    userRoles: UserRolesDAO,
    rolePermissionsDao: RolePermissionsDAO,
    userId: string,
    possibilities: [EActions, EResource][] | [EActions, EResource],
  ): Promise<[EActions, EResource] | null> {
    const permissions = await this.allowedActionsForUserId(
      userRoles,
      rolePermissionsDao,
      userId,
    );
    if (!permissions) {
      return null;
    }
    const allPossibilities: [EActions, EResource][] = [];
    if (possibilities.length > 1) {
      if (Array.isArray(possibilities[0])) {
        allPossibilities.push(...(possibilities as [EActions, EResource][]));
      } else {
        allPossibilities.push(possibilities as [EActions, EResource]);
      }
    }
    for (const permission of permissions) {
      for (const [action, resource] of allPossibilities) {
        if (
          permission.action === EActions.ADMIN &&
          (permission.resource === resource || resource === EResource.ALL)
        ) {
          return [action, resource];
        }
        if (permission.action === action && permission.resource === resource) {
          return [action, resource];
        }
      }
    }
    return null;
  }

  public async bindAddressToUser(
    userRoles: UserRolesDAO,
    rolesDao: RolesDAO,
    rolePermissionsDao: RolePermissionsDAO,
    userId: string,
    address: string,
    addressType: UserAddressType,
  ) {
    const roleId = `${addressType.toUpperCase()}#${address}`;

    await Promise.all([
      rolesDao.create({
        id: roleId,
        name: `${addressType}: ${address}`,
      }),
      userRoles.bind({
        userId,
        roleId,
        rolesDao,
      }),
      rolePermissionsDao.bind({
        roleId,
        action: EActions.ADMIN,
        resource: EResource.USER,
        identifier: address,
      }),
    ]);
  }
}
