import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { IAwsContext } from "../../context/aws.js";
import { IConfigContext } from "../../context/config.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "graphql-inscription-request-controllers",
});

export async function getS3UploadUrl({
  key,
  contentType,
  context,
  metadata,
}: {
  key: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  logger.debug(
    { uploadBucket, key, contentType, metadata },
    "Getting S3 upload url",
  );
  const command = new PutObjectCommand({
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 120,
  });

  return signedUrl;
}

export async function getSignedMultipartUploadUrl({
  key,
  multipartUploadId,
  partNumber,
  context,
}: {
  key: string;
  multipartUploadId: string;
  partNumber: number;
  context: IAwsContext & IConfigContext;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new UploadPartCommand({
    Bucket: uploadBucket,
    Key: key,
    PartNumber: partNumber,
    UploadId: multipartUploadId,
  });
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 120,
  });
  return signedUrl;
}

export async function getMultiPartUploadID({
  key,
  contentType,
  context,
  metadata,
}: {
  key: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new CreateMultipartUploadCommand({
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  });
  const response = await s3Client.send(command);
  if (!response.UploadId) {
    throw new Error("Failed to get multipart upload ID");
  }
  return response.UploadId;
}
