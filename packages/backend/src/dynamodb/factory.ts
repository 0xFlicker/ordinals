import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { tableNames } from "../utils/config.js";
import { getDb } from "./create.js";
import { FundingDao } from "./funding.js";
import { ClaimsDao } from "./claims.js";
import { OpenEditionClaimsDao } from "./openEdition.js";
import { WalletDAO } from "./wallet.js";
import { UploadsDAO } from "./uploads.js";
import { BatchDAO } from "./batch.js";

export function createDynamoDbFundingDao<
  ItemMeta extends Record<string, any> = {},
  CollectionMeta extends Record<string, any> = {},
>(): FundingDao<ItemMeta, CollectionMeta> {
  FundingDao.TABLE_NAME = tableNames.get().funding ?? FundingDao.TABLE_NAME;
  return new FundingDao<ItemMeta, CollectionMeta>(getDb());
}

export function createDynamoDbClaimsDao({
  claimsTableName,
  db,
}: {
  claimsTableName?: string;
  db?: DynamoDBDocumentClient;
} = {}) {
  claimsTableName = claimsTableName ?? tableNames.get().claims;

  ClaimsDao.TABLE_NAME = claimsTableName ?? ClaimsDao.TABLE_NAME;
  return new ClaimsDao(db ?? getDb());
}

export function createDynamoDbOpenEditionClaimsDao({
  db,
  openEditionClaimsTableName,
}: {
  db?: DynamoDBDocumentClient;
  openEditionClaimsTableName?: string;
} = {}) {
  openEditionClaimsTableName =
    openEditionClaimsTableName ?? tableNames.get().openEditionClaims;

  OpenEditionClaimsDao.TABLE_NAME =
    openEditionClaimsTableName ?? OpenEditionClaimsDao.TABLE_NAME;
  return new OpenEditionClaimsDao(db ?? getDb());
}

export function createDynamoDbWalletDao({
  db,
  walletTableName,
}: {
  db?: DynamoDBDocumentClient;
  walletTableName?: string;
} = {}) {
  walletTableName = walletTableName ?? tableNames.get().wallet;

  WalletDAO.TABLE_NAME = walletTableName ?? WalletDAO.TABLE_NAME;
  return new WalletDAO(db ?? getDb());
}

export function createDynamoDbUploadsDao({
  db,
  uploadsTableName,
}: {
  db?: DynamoDBDocumentClient;
  uploadsTableName?: string;
} = {}) {
  uploadsTableName = uploadsTableName ?? tableNames.get().uploads;

  UploadsDAO.TABLE_NAME =
    uploadsTableName ?? tableNames.get().uploads ?? UploadsDAO.TABLE_NAME;
  return new UploadsDAO(db ?? getDb());
}

export function createDynamoDbBatchDao({
  db,
  batchTableName,
}: {
  db?: DynamoDBDocumentClient;
  batchTableName?: string;
} = {}) {
  batchTableName = batchTableName ?? tableNames.get().funding;
  BatchDAO.TABLE_NAME = batchTableName ?? BatchDAO.TABLE_NAME;
  return new BatchDAO(db ?? getDb());
}
