import type { S3Client } from "@aws-sdk/client-s3";
import { createKMSClient, createS3Client } from "./create.js";
import { FundingDocDao } from "./inscriptions.js";
import { KMSClient } from "@aws-sdk/client-kms";

export function createStorageFundingDocDao({
  bucketName,
  s3Client,
  kmsClient,
}: {
  bucketName: string;
  s3Client?: S3Client;
  kmsClient?: KMSClient;
}) {
  s3Client = s3Client ?? createS3Client();
  kmsClient = kmsClient ?? createKMSClient();
  return new FundingDocDao(s3Client, bucketName, kmsClient);
}
