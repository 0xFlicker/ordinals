import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { RolePermissionsDAO } from "./rolePermissions.js";
import { RolesDAO } from "./roles.js";
import { UserNonceDAO } from "./userNonce.js";
import { UserRolesDAO } from "./userRoles.js";
import { UserDAO } from "./user.js";
export function createDynamoDbUserNonceDao({
  userNonceTableName,
  db,
}: {
  userNonceTableName?: string;
  db: DynamoDBDocumentClient;
}): UserNonceDAO {
  UserNonceDAO.TABLE_NAME = userNonceTableName ?? UserNonceDAO.TABLE_NAME;
  return new UserNonceDAO(db);
}

export function createDynamoDbUserRolesDao({
  rbacTableName,
  db,
}: {
  rbacTableName?: string;
  db: DynamoDBDocumentClient;
}): UserRolesDAO {
  UserRolesDAO.TABLE_NAME = rbacTableName ?? UserRolesDAO.TABLE_NAME;
  return new UserRolesDAO(db);
}

export function createDynamoDbRolesDao({
  rbacTableName,
  db,
}: {
  rbacTableName?: string;
  db: DynamoDBDocumentClient;
}): RolesDAO {
  RolesDAO.TABLE_NAME = rbacTableName ?? RolesDAO.TABLE_NAME;
  return new RolesDAO(db);
}

export function createDynamoDbRolePermissionsDao({
  rbacTableName,
  db,
}: {
  rbacTableName?: string;
  db: DynamoDBDocumentClient;
}): RolePermissionsDAO {
  RolePermissionsDAO.TABLE_NAME =
    rbacTableName ?? RolePermissionsDAO.TABLE_NAME;
  return new RolePermissionsDAO(db);
}

export function createDynamoDbUserDao({
  userTableName,
  db,
}: {
  userTableName?: string;
  db: DynamoDBDocumentClient;
}): UserDAO {
  UserDAO.TABLE_NAME = userTableName ?? UserDAO.TABLE_NAME;
  return new UserDAO(db);
}
