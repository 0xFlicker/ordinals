import {
  ChecksumAlgorithm,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { IAwsContext } from "../../context/aws.js";
import { IConfigContext } from "../../context/config.js";
import {
  S3RequestPresigner,
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";
import { createLogger } from "@0xflick/ordinals-backend";
import { Hash } from "@aws-sdk/hash-node";
import { formatUrl } from "@aws-sdk/util-format-url";
import { HttpRequest } from "@aws-sdk/protocol-http";

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
  const { s3Client, uploadBucket, deploymentS3, awsEndpoint } = context;
  logger.debug(
    { uploadBucket, key, contentType, metadata },
    "Getting S3 upload url",
  );
  // const command = new PutObjectCommand({
  //   Bucket: uploadBucket,
  //   Key: key,
  //   ContentType: contentType,
  //   ...(deploymentS3 === "localstack"
  //     ? {
  //         ChecksumAlgorithm: undefined,
  //       }
  //     : {}),
  //   ...(metadata ? { Metadata: metadata } : {}),
  // });

  const baseInput = {
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  };

  const sanitizedInput =
    deploymentS3 === "localstack"
      ? { ...baseInput }
      : { ...baseInput, ChecksumAlgorithm: ChecksumAlgorithm.CRC32 };

  const command = new PutObjectCommand(sanitizedInput);

  if (deploymentS3 !== "localstack") {
    return getSignedUrl(s3Client, command, { expiresIn: 120 });
  }

  if (!awsEndpoint) {
    throw new Error("AWS endpoint is not set");
  }

  // ✂️ Manually build presigner to remove checksum middleware
  const signer = new S3RequestPresigner({
    ...s3Client.config,
    sha256: Hash.bind(null, "sha256"),
  });

  // 🔥 Remove checksum middleware before signing
  command.middlewareStack.remove("checksumMiddleware");
  command.middlewareStack.remove("bodyChecksumMiddleware");

  const stack = command.middlewareStack.clone();
  const handler = stack.resolve(
    async (args) => args.request as any,
    s3Client.config,
  );

  const request = await handler({
    input: command.input,
  });

  const presigner = new S3RequestPresigner({
    ...s3Client.config,
    sha256: Hash.bind(null, "sha256"),
  });

  const signedRequest = await presigner.presign(request as any, {
    expiresIn: 120,
  });

  return formatUrl(signedRequest);
}

export async function getSignedMultipartUploadUrl({
  key,
  multiPartUploadId,
  partNumber,
  context,
}: {
  key: string;
  multiPartUploadId: string;
  partNumber: number;
  context: IAwsContext & IConfigContext;
}) {
  const { s3Client, uploadBucket, deploymentS3 } = context;
  const command = new UploadPartCommand({
    Bucket: uploadBucket,
    Key: key,
    PartNumber: partNumber,
    UploadId: multiPartUploadId,
    ...(deploymentS3 === "localstack"
      ? {
          ChecksumAlgorithm: undefined,
        }
      : {}),
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
  const { s3Client, uploadBucket, deploymentS3 } = context;
  const command = new CreateMultipartUploadCommand({
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(deploymentS3 === "localstack"
      ? {
          ChecksumAlgorithm: undefined,
        }
      : {}),
    ...(metadata ? { Metadata: metadata } : {}),
  });
  const response = await s3Client.send(command);
  if (!response.UploadId) {
    throw new Error("Failed to get multipart upload ID");
  }
  return response.UploadId;
}
