import config from "@0xflick/ordinals-config";
import { lazySingleton } from "@0xflick/ordinals-models";

const deploymentName = config.deployment.name;

export const awsEndpoint = lazySingleton(() => {
  return process.env.AWS_ENDPOINT_URL ?? deploymentName === "localstack"
    ? "http://localhost.localstack.cloud:4566"
    : deploymentName === "test"
    ? "http://localhost:8000"
    : undefined;
});

export const deploymentS3 = lazySingleton(() => {
  return process.env.DEPLOYMENT_S3 || deploymentName;
});

export const deploymentKMS = lazySingleton(() => {
  return process.env.DEPLOYMENT_KMS || deploymentName;
});

export const awsRegion = lazySingleton(() => {
  return process.env.AWS_REGION;
});

export const inscriptionBucket = lazySingleton(() => {
  return deploymentName === "localstack"
    ? process.env.INSCRIPTION_BUCKET_LOCAL ||
        process.env.INSCRIPTION_BUCKET ||
        "inscriptions"
    : process.env.INSCRIPTION_BUCKET || "inscriptions";
});

export const transactionBucket = lazySingleton(() => {
  return deploymentName === "localstack"
    ? process.env.TRANSACTION_BUCKET_LOCAL ||
        process.env.TRANSACTION_BUCKET ||
        "transactions"
    : process.env.TRANSACTION_BUCKET || "transactions";
});

export const uploadBucket = lazySingleton(() => {
  return deploymentName === "localstack"
    ? process.env.UPLOAD_BUCKET_LOCAL || process.env.UPLOAD_BUCKET || "uploads"
    : process.env.UPLOAD_BUCKET || "uploads";
});

export const dynamoDbUrl = lazySingleton(() => {
  return process.env.DYNAMODB_URL;
});

export const dynamoDbRegion = lazySingleton(() => {
  return process.env.DYNAMODB_REGION || "us-east-1";
});

export const dynamoDbSslEnabled = lazySingleton(() => {
  return !(
    process.env.DYNAMODB_SSL_ENABLED === "false" ||
    process.env.DYNAMODB_SSL_ENABLED === "0" ||
    typeof process.env.DYNAMODB_SSL_ENABLED === "undefined"
  );
});

export const tableNames = lazySingleton(() => {
  const tableConfig: Record<string, string> = JSON.parse(
    process.env.TABLE_NAMES || "{}",
  );
  return tableConfig;
});

export const regtestMempoolUrl = lazySingleton(() => {
  return process.env.REGTEST_MEMPOOL_URL ?? null;
});
export const testnetMempoolUrl = lazySingleton(() => {
  return process.env.TESTNET_MEMPOOL_URL ?? null;
});
export const testnetMempoolAuth = lazySingleton(() => {
  return process.env.TESTNET_MEMPOOL_AUTH ?? null;
});
export const mainnetMempoolUrl = lazySingleton(() => {
  return process.env.MAINNET_MEMPOOL_URL ?? null;
});
export const mainnetMempoolAuth = lazySingleton(() => {
  return process.env.MAINNET_MEMPOOL_AUTH ?? null;
});

export const fundedQueueUrl = lazySingleton(() => {
  return process.env.FUNDED_QUEUE_URL ?? null;
});

export const insufficientFundsQueueUrl = lazySingleton(() => {
  return process.env.INSUFFICIENT_FUNDS_QUEUE_URL ?? null;
});

export const genesisQueueUrl = lazySingleton(() => {
  return process.env.GENESIS_QUEUE_URL ?? null;
});

export const batchSuccessQueueUrl = lazySingleton(() => {
  return process.env.BATCH_SUCCESS_QUEUE_URL ?? null;
});

export const batchFailureQueueUrl = lazySingleton(() => {
  return process.env.BATCH_FAILURE_QUEUE_URL ?? null;
});

export const batchRemainingFundingsQueueUrl = lazySingleton(() => {
  return process.env.BATCH_REMAINING_FUNDINGS_QUEUE_URL ?? null;
});
