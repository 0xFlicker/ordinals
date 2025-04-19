import { S3ClientConfig, S3Client } from "@aws-sdk/client-s3";
import { deployment } from "@0xflick/ordinals-config";
import { KMSClient, type KMSClientConfig } from "@aws-sdk/client-kms";

export function createS3Client(options?: S3ClientConfig) {
  // special case for test deployment
  if (deployment.name === "test") {
    return new S3Client({
      endpoint: "http://localhost:4569",
      region: "us-east-1",
      credentials: {
        accessKeyId: "S3RVER",
        secretAccessKey: "S3RVER",
      },
      forcePathStyle: true,
      defaultsMode: "legacy",
    });
  }
  return new S3Client(
    options ?? {
      endpoint: deployment.endpoint,
      region: deployment.region,
      ...(deployment.endpoint?.startsWith("http:") && {
        forcePathStyle: true,
        defaultsMode: "legacy",
      }),
    },
  );
}

export function createKMSClient(options?: KMSClientConfig) {
  return new KMSClient(
    options ?? { region: deployment.region, endpoint: deployment.endpoint },
  );
}
