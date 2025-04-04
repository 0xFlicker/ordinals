import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { tableNames } from "../utils/config.js";
import { getDb } from "./create.js";
import { FundingDao } from "./funding.js";
import { ClaimsDao } from "./claims.js";
import { OpenEditionClaimsDao } from "./openEdition.js";
import { WalletDAO } from "./wallet.js";
import { UploadsDAO } from "./uploads.js";

export function createDynamoDbFundingDao<
  ItemMeta extends Record<string, any> = {},
  CollectionMeta extends Record<string, any> = {},
>(): FundingDao<ItemMeta, CollectionMeta> {
  const allTableNames = tableNames.get();
  FundingDao.TABLE_NAME = allTableNames.funding ?? FundingDao.TABLE_NAME;
  return new FundingDao<ItemMeta, CollectionMeta>(getDb());
}

export function createDynamoDbClaimsDao({
  claimsTableName,
  db,
}: {
  claimsTableName?: string;
  db: DynamoDBDocumentClient;
}) {
  ClaimsDao.TABLE_NAME = claimsTableName ?? ClaimsDao.TABLE_NAME;
  return new ClaimsDao(db);
}

export function createDynamoDbOpenEditionClaimsDao({
  db,
  openEditionClaimsTableName,
}: {
  db: DynamoDBDocumentClient;
  openEditionClaimsTableName?: string;
}) {
  OpenEditionClaimsDao.TABLE_NAME =
    openEditionClaimsTableName ?? OpenEditionClaimsDao.TABLE_NAME;
  return new OpenEditionClaimsDao(db);
}

export function createDynamoDbWalletDao({
  db,
  walletTableName,
}: {
  db: DynamoDBDocumentClient;
  walletTableName?: string;
}) {
  WalletDAO.TABLE_NAME =
    walletTableName ?? tableNames.get().wallet ?? WalletDAO.TABLE_NAME;
  return new WalletDAO(db);
}

export function createDynamoDbUploadsDao({
  db,
  uploadsTableName,
}: {
  db: DynamoDBDocumentClient;
  uploadsTableName?: string;
}) {
  UploadsDAO.TABLE_NAME =
    uploadsTableName ?? tableNames.get().uploads ?? UploadsDAO.TABLE_NAME;
  return new UploadsDAO(db);
}
