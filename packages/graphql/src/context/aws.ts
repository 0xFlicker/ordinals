import { createS3Client } from "@0xflick/ordinals-backend";
import type { S3Client } from "@aws-sdk/client-s3";
import { IConfigContext } from "./config.js";

export interface IAwsContext {
  s3Client: S3Client;
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

  return {
    s3Client,
  };
}
