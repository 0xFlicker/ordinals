import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidV4 } from "uuid";
import {
  IUser,
  UserWithRolesModel,
  EActions,
  EResource,
  UserAddressType,
  IUserAddress,
  UserWithAddressesModel,
} from "@0xflick/ordinals-rbac-models";
import { RolePermissionsDAO } from "./rolePermissions.js";
import { UserRolesDAO } from "./userRoles.js";
import { RolesDAO } from "./roles.js";

interface IUserDb {
  pk: string; // v4uuid (sk: USER) or address (sk: ADDRESS)
  sk: string; // "USER" or "EVM" or "BTC"
  UserId: string;
  Handle?: string;
  Address?: string;
  AddressType?: UserAddressType;
}

export class UserDAO {
  public static TABLE_NAME = process.env.TABLE_NAME_USER || "User";
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async createUser({
    userId,
    handle,
  }: {
    userId?: string;
    handle: string;
  }): Promise<string> {
    userId = userId ?? uuidV4();
    await this.db.send(
      new PutCommand({
        TableName: UserDAO.TABLE_NAME,
        Item: {
          pk: userId,
          sk: "USER",
          UserId: userId,
          Handle: handle,
        },
      }),
    );
    return userId;
  }

  public async getUserById({ userId }: { userId: string }): Promise<IUser> {
    const user = await this.db.send(
      new GetCommand({
        TableName: UserDAO.TABLE_NAME,
        Key: {
          pk: userId,
          sk: "USER",
        },
      }),
    );
    if (!user.Item) {
      throw new Error("User not found");
    }
    const { UserId, Handle } = user.Item;
    return {
      userId: UserId,
      handle: Handle,
    };
  }

  public async getUserByAddress({
    address,
  }: {
    address: string;
  }): Promise<IUser> {
    const user = await this.db.send(
      new GetCommand({
        TableName: UserDAO.TABLE_NAME,
        Key: {
          pk: address,
          sk: "ADDRESS",
        },
      }),
    );
    if (!user.Item) {
      throw new Error("User not found");
    }
    const { UserId } = user.Item;
    return {
      userId: UserId,
    };
  }

  public async getUserByHandle({ handle }: { handle: string }): Promise<IUser> {
    const user = await this.db.send(
      new QueryCommand({
        TableName: UserDAO.TABLE_NAME,
        KeyConditionExpression: "Handle = :handle",
        ExpressionAttributeValues: {
          ":handle": handle,
        },
        IndexName: "HandleIndex",
        ProjectionExpression: "UserId",
      }),
    );
    if (!user.Items || user.Items.length === 0) {
      throw new Error("User not found");
    }
    const { UserId } = user.Items[0];
    return {
      userId: UserId,
      handle,
    };
  }

  public async getUsersAddresses(userId: string): Promise<IUserAddress[]> {
    const addresses = await this.db.send(
      new QueryCommand({
        TableName: UserDAO.TABLE_NAME,
        KeyConditionExpression: "pk = :userId AND sk = :sk",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":sk": "ADDRESS",
        },
      }),
    );
    return (
      addresses.Items?.map((item) => ({
        type: item.AddressType as UserAddressType,
        address: item.Address,
      })) ?? []
    );
  }

  public async getUserWithAddresses(
    address: string,
  ): Promise<UserWithAddressesModel> {
    const response = await this.db.send(
      new QueryCommand({
        TableName: UserDAO.TABLE_NAME,
        KeyConditionExpression: "pk = :address AND sk = :sk",
        ExpressionAttributeValues: {
          ":address": address,
          ":sk": "ADDRESS",
        },
        ProjectionExpression: "UserId, Address, AddressType",
      }),
    );
    const { Items } = response;
    const userId = Items?.[0]?.UserId;
    const addresses =
      Items?.map((item) => ({
        type: item.AddressType as UserAddressType,
        address: item.Address,
      })) ?? [];
    return new UserWithAddressesModel({ userId, addresses });
  }

  public async getUserWithRoles(
    userRolesDao: UserRolesDAO,
    userId: string,
    handle?: string,
  ): Promise<UserWithRolesModel> {
    const roleIds = await userRolesDao.getAllRoleIds(userId);

    return new UserWithRolesModel({
      userId,
      roleIds,
      handle,
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
    const roleId = `ADDRESS#${address}`;
    await Promise.all([
      this.db.send(
        new PutCommand({
          TableName: UserDAO.TABLE_NAME,
          Item: {
            pk: address,
            sk: "ADDRESS",
            UserId: userId,
            Address: address,
            AddressType: addressType,
          },
        }),
      ),
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
