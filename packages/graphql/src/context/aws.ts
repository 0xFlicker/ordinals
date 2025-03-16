import { createS3Client } from "@0xflick/ordinals-backend";
import type { S3Client } from "@aws-sdk/client-s3";
import { KMSClient } from "@aws-sdk/client-kms";
import { IConfigContext } from "./config.js";

export interface IAwsContext {
  s3Client: S3Client;
  kmsClient: KMSClient;
}

export function createAwsContext({
  awsEndpoint: endpoint,
  awsRegion: region,
  deploymentS3,
}: IConfigContext): IAwsContext {
  const s3Client = createS3Client({
    ...(deploymentS3 !== "aws" && endpoint ? { endpoint } : {}),
    region,
    ...(deploymentS3 === "localstack" ||
    (typeof deploymentS3 === "undefined" && endpoint?.startsWith("http:"))
      ? {
          forcePathStyle: true,
        }
      : {}),
  });

  const kmsClient = new KMSClient({
    region,
    ...(deploymentS3 === "localstack" ||
    (typeof deploymentS3 === "undefined" && endpoint?.startsWith("http:"))
      ? { endpoint }
      : {}),
  });

  return {
    s3Client,
    kmsClient,
  };
}
