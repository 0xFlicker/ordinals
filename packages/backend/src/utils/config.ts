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
  if (!process.env.FUNDED_QUEUE_URL) {
    throw new Error("FUNDED_QUEUE_URL is not set");
  }
  return process.env.FUNDED_QUEUE_URL;
});

export const insufficientFundsQueueUrl = lazySingleton(() => {
  if (!process.env.INSUFFICIENT_FUNDS_QUEUE_URL) {
    throw new Error("INSUFFICIENT_FUNDS_QUEUE_URL is not set");
  }
  return process.env.INSUFFICIENT_FUNDS_QUEUE_URL;
});

export const genesisQueueUrl = lazySingleton(() => {
  if (!process.env.GENESIS_QUEUE_URL) {
    throw new Error("GENESIS_QUEUE_URL is not set");
  }
  return process.env.GENESIS_QUEUE_URL;
});

export const batchSuccessQueueUrl = lazySingleton(() => {
  if (!process.env.BATCH_SUCCESS_QUEUE_URL) {
    throw new Error("BATCH_SUCCESS_QUEUE_URL is not set");
  }
  return process.env.BATCH_SUCCESS_QUEUE_URL;
});

export const batchFailureQueueUrl = lazySingleton(() => {
  if (!process.env.BATCH_FAILURE_QUEUE_URL) {
    throw new Error("BATCH_FAILURE_QUEUE_URL is not set");
  }
  return process.env.BATCH_FAILURE_QUEUE_URL;
});

export const batchRemainingFundingsQueueUrl = lazySingleton(() => {
  if (!process.env.BATCH_REMAINING_FUNDINGS_QUEUE_URL) {
    throw new Error("BATCH_REMAINING_FUNDINGS_QUEUE_URL is not set");
  }
  return process.env.BATCH_REMAINING_FUNDINGS_QUEUE_URL;
});

export const mainnetElectrumHostname = lazySingleton(() => {
  if (!process.env.MAINNET_ELECTRUM_HOSTNAME) {
    throw new Error("MAINNET_ELECTRUM_HOSTNAME is not set");
  }
  return process.env.MAINNET_ELECTRUM_HOSTNAME;
});

export const mainnetElectrumPort = lazySingleton(() => {
  if (!process.env.MAINNET_ELECTRUM_PORT) {
    throw new Error("MAINNET_ELECTRUM_PORT is not set");
  }
  return parseInt(process.env.MAINNET_ELECTRUM_PORT);
});

export const mainnetElectrumProtocol = lazySingleton(() => {
  return process.env.MAINNET_ELECTRUM_PROTOCOL === "tls";
});

export const testnetElectrumHostname = lazySingleton(() => {
  if (!process.env.TESTNET_ELECTRUM_HOSTNAME) {
    throw new Error("TESTNET_ELECTRUM_HOSTNAME is not set");
  }
  return process.env.TESTNET_ELECTRUM_HOSTNAME;
});

export const testnetElectrumPort = lazySingleton(() => {
  if (!process.env.TESTNET_ELECTRUM_PORT) {
    throw new Error("TESTNET_ELECTRUM_PORT is not set");
  }
  return parseInt(process.env.TESTNET_ELECTRUM_PORT);
});

export const testnetElectrumProtocol = lazySingleton(() => {
  return process.env.TESTNET_ELECTRUM_PROTOCOL === "tls";
});

export const testnet4ElectrumHostname = lazySingleton(() => {
  if (!process.env.TESTNET4_ELECTRUM_HOSTNAME) {
    throw new Error("TESTNET4_ELECTRUM_HOSTNAME is not set");
  }
  return process.env.TESTNET4_ELECTRUM_HOSTNAME;
});

export const testnet4ElectrumPort = lazySingleton(() => {
  if (!process.env.TESTNET4_ELECTRUM_PORT) {
    throw new Error("TESTNET4_ELECTRUM_PORT is not set");
  }
  return parseInt(process.env.TESTNET4_ELECTRUM_PORT);
});

export const testnet4ElectrumProtocol = lazySingleton(() => {
  return process.env.TESTNET4_ELECTRUM_PROTOCOL === "tls";
});

export const regtestElectrumHostname = lazySingleton(() => {
  if (!process.env.REGTEST_ELECTRUM_HOSTNAME) {
    throw new Error("REGTEST_ELECTRUM_HOSTNAME is not set");
  }
  return process.env.REGTEST_ELECTRUM_HOSTNAME;
});

export const regtestElectrumPort = lazySingleton(() => {
  if (!process.env.REGTEST_ELECTRUM_PORT) {
    throw new Error("REGTEST_ELECTRUM_PORT is not set");
  }
  return parseInt(process.env.REGTEST_ELECTRUM_PORT);
});

export const regtestElectrumProtocol = lazySingleton(() => {
  return process.env.REGTEST_ELECTRUM_PROTOCOL === "tls";
});
