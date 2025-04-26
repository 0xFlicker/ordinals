import {
  createDynamoDbFundingDao,
  getDb,
  createDynamoDbClaimsDao,
  ClaimsDao,
  OpenEditionClaimsDao,
  createDynamoDbOpenEditionClaimsDao,
  FundingDao,
  UploadsDAO,
  createDynamoDbUploadsDao,
} from "@0xflick/ordinals-backend";
import {
  RolePermissionsDAO,
  RolesDAO,
  UserDAO,
  UserNonceDAO,
  UserRolesDAO,
  createDynamoDbRolePermissionsDao,
  createDynamoDbRolesDao,
  createDynamoDbUserDao,
  createDynamoDbUserNonceDao,
  createDynamoDbUserRolesDao,
} from "@0xflick/ordinals-rbac";
import { IConfigContext } from "./config.js";

export interface DbContext {
  fundingDao: FundingDao;
  typedFundingDao<
    ItemMeta extends Record<string, any> = {},
    CollectionMeta extends Record<string, any> = {},
  >(): FundingDao<ItemMeta, CollectionMeta>;
  userRolesDao: UserRolesDAO;
  rolesDao: RolesDAO;
  rolePermissionsDao: RolePermissionsDAO;
  userDao: UserDAO;
  userNonceDao: UserNonceDAO;
  claimsDao: ClaimsDao;
  openEditionClaimsDao: OpenEditionClaimsDao;
  uploadsDao: UploadsDAO;
}

export function createDbContext(config: IConfigContext) {
  const db = getDb();
  const context: DbContext = {
    fundingDao: createDynamoDbFundingDao<{}, {}>(),
    typedFundingDao<
      ItemMeta extends Record<string, any> = {},
      CollectionMeta extends Record<string, any> = {},
    >() {
      return createDynamoDbFundingDao<ItemMeta, CollectionMeta>();
    },
    userRolesDao: createDynamoDbUserRolesDao({
      rbacTableName: config.tableNames.rbac,
      db,
    }),
    rolesDao: createDynamoDbRolesDao({
      rbacTableName: config.tableNames.rbac,
      db,
    }),
    rolePermissionsDao: createDynamoDbRolePermissionsDao({
      rbacTableName: config.tableNames.rbac,
      db,
    }),
    userDao: createDynamoDbUserDao({
      userTableName: config.tableNames.users,
      db,
    }),
    userNonceDao: createDynamoDbUserNonceDao({
      userNonceTableName: config.tableNames.userNonce,
      db,
    }),
    claimsDao: createDynamoDbClaimsDao({
      claimsTableName: config.tableNames.claims,
      db,
    }),
    openEditionClaimsDao: createDynamoDbOpenEditionClaimsDao({
      db,
      openEditionClaimsTableName: config.tableNames.openEditionClaims,
    }),
    uploadsDao: createDynamoDbUploadsDao({
      db,
      uploadsTableName: config.tableNames.uploads,
    }),
  };
  return context;
}
