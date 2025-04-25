import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  decodeCursor,
  encodeCursor,
  paginate,
  IPaginatedResult,
  IPaginationOptions,
} from "@0xflick/ordinals-models";
import { RolesDAO } from "./roles.js";

export class UserRolesDAO {
  public static TABLE_NAME = process.env.TABLE_NAME_RBAC || "RBAC";
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public static idFor(userId: string, roleId: string) {
    return `USER#${userId}ROLE_ID#${roleId}`;
  }

  public async bind({
    userId,
    roleId,
    rolesDao,
  }: {
    userId: string;
    roleId: string;
    rolesDao: RolesDAO;
  }): Promise<UserRolesDAO> {
    let wasBound = true;
    try {
      await this.db.send(
        new PutCommand({
          TableName: UserRolesDAO.TABLE_NAME,
          Item: {
            pk: UserRolesDAO.idFor(userId, roleId),
            UserID: userId,
            UserRoleID: roleId,
            CreatedAt: Date.now(),
          },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    } catch (e: unknown) {
      // Check if this error is a known DynamoDB error
      if (e instanceof Error && e.name === "ConditionalCheckFailedException") {
        // Duplicate entry, whatever. continue but don't update any counters
        wasBound = false;
      } else {
        // Something else went wrong, rethrow
        throw e;
      }
    }
    if (wasBound) {
      await rolesDao.usersBound(roleId);
    }
    return this;
  }

  public async unlink({
    userId,
    roleId,
    rolesDao,
  }: {
    userId: string;
    roleId: string;
    rolesDao: RolesDAO;
  }): Promise<UserRolesDAO> {
    let wasRemoved = true;
    try {
      await this.db.send(
        new DeleteCommand({
          TableName: UserRolesDAO.TABLE_NAME,
          Key: {
            pk: UserRolesDAO.idFor(userId, roleId),
          },
          ConditionExpression: "attribute_exists(pk)",
        }),
      );
    } catch (e) {
      // Check if this error is a known DynamoDB error
      if (e instanceof Error && e.name === "ConditionalCheckFailedException") {
        // Entry already gone... whatever. continue but don't update any counters
        wasRemoved = false;
      } else {
        // Something else went wrong, rethrow
        throw e;
      }
    }
    if (wasRemoved) {
      await rolesDao.usersRemoved(roleId);
    }
    return this;
  }

  public async batchUnlinkByRoleId(roleId: string): Promise<UserRolesDAO> {
    const entriesToDeleteIds: { userId: string; userRoleId: string }[] = [];
    for await (const item of paginate<{
      userId: string;
      userRoleId: string;
    }>(async (options: IPaginationOptions) => {
      const pagination = decodeCursor(options?.cursor);
      const result = await this.db.send(
        new QueryCommand({
          TableName: UserRolesDAO.TABLE_NAME,
          IndexName: "UserRoleIDIndex",
          KeyConditionExpression: "UserRoleID = :roleId",
          ExpressionAttributeValues: {
            ":roleId": roleId,
          },
          ProjectionExpression: "UserRoleID, UserID",
          ...(pagination
            ? {
                ExclusiveStartKey: pagination.lastEvaluatedKey,
              }
            : {}),
        }),
      );
      const lastEvaluatedKey = result.LastEvaluatedKey;
      const page = pagination ? pagination.page + 1 : 1;
      const size = result.Items?.length ?? 0;
      const count = (pagination ? pagination.count : 0) + size;
      const cursor = encodeCursor({ lastEvaluatedKey, page, count });
      return {
        items:
          result.Items?.map((item) => ({
            userId: item.UserID,
            userRoleId: item.UserRoleID,
          })) ?? [],
        cursor,
        page,
        count,
        size,
      };
    })) {
      entriesToDeleteIds.push(item);
    }
    if (entriesToDeleteIds.length > 0) {
      await this.db.send(
        new BatchWriteCommand({
          RequestItems: {
            [UserRolesDAO.TABLE_NAME]: entriesToDeleteIds.map(
              ({ userId, userRoleId }) => ({
                DeleteRequest: {
                  Key: {
                    pk: UserRolesDAO.idFor(userId, userRoleId),
                  },
                },
              }),
            ),
          },
        }),
      );
    }

    return this;
  }

  public async getRoleIdsPaginated(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<string>> {
    const pagination = decodeCursor(options?.cursor);
    const result = await this.db.send(
      new QueryCommand({
        TableName: UserRolesDAO.TABLE_NAME,
        IndexName: "UserIDIndex",
        KeyConditionExpression: "UserID = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ProjectionExpression: "UserRoleID",
        ScanIndexForward: true,
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
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;
    const cursor = encodeCursor({ lastEvaluatedKey, page, count });
    return {
      items: result.Items?.map((item) => item.UserRoleID) ?? [],
      cursor,
      page,
      count,
      size,
    };
  }

  public async getAllRoleIds(userId: string) {
    const roleIds: string[] = [];
    for await (const roleId of this.getRoleIds(userId)) {
      roleIds.push(roleId);
    }
    return roleIds;
  }

  public getRoleIds(userId: string) {
    return paginate((options) => this.getRoleIdsPaginated(userId, options));
  }

  public async getUsersPaginated(
    roleId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<string>> {
    const pagination = decodeCursor(options?.cursor);
    const result = await this.db.send(
      new QueryCommand({
        TableName: UserRolesDAO.TABLE_NAME,
        IndexName: "UserRoleIDIndex",
        KeyConditionExpression: "UserRoleID = :roleId",
        ExpressionAttributeValues: {
          ":roleId": roleId,
        },
        ProjectionExpression: "UserID",
        ScanIndexForward: true,
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
      }),
    );
    const lastEvaluatedKey = result.LastEvaluatedKey;
    const page = pagination ? pagination.page + 1 : 1;
    const size = result.Items?.length ?? 0;
    const count = (pagination ? pagination.count : 0) + size;
    const cursor = encodeCursor({ lastEvaluatedKey, page, count });
    return {
      items: result.Items?.map((item) => item.UserID) ?? [],
      cursor,
      page,
      count,
      size,
    };
  }

  public getUsers(roleId: string) {
    return paginate<string>((options) =>
      this.getUsersPaginated(roleId, options),
    );
  }

  public async getAllUsers(roleId: string) {
    const users: string[] = [];
    for await (const user of this.getUsers(roleId)) {
      users.push(user);
    }
    return users;
  }
}
