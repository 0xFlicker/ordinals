import { S3ClientConfig, S3Client } from "@aws-sdk/client-s3";
import { deployment } from "@0xflick/ordinals-config";
import { KMSClient, type KMSClientConfig } from "@aws-sdk/client-kms";

export function createS3Client(options?: S3ClientConfig) {
  return new S3Client(
    options ?? {
      endpoint: deployment.endpoint,
      region: deployment.region,
      ...(deployment.endpoint?.startsWith("http:") && {
        forcePathStyle: true,
      }),
    },
  );
}

export function createKMSClient(options?: KMSClientConfig) {
  return new KMSClient(
    options ?? { region: deployment.region, endpoint: deployment.endpoint },
  );
}
