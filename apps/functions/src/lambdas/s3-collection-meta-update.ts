import {
  createLogger,
  createS3Client,
  uploadBucket,
} from "@0xflick/ordinals-backend";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { type S3EventRecord } from "aws-lambda";

const s3Client = createS3Client();

const logger = createLogger({
  name: "s3-collection-meta-update",
});

export const handler = async (record: S3EventRecord) => {
  const uploadBucketName = uploadBucket.get();
  if (record.s3.bucket.name !== uploadBucketName) {
    return;
  }
  switch (record.eventName) {
    case "ObjectCreated:Put": {
      const response = await s3Client.send(
        new HeadObjectCommand({
          Bucket: uploadBucketName,
          Key: record.s3.object.key,
        }),
      );
      const {
        "x-azm-meta-collection-id": collectionId,
        "content-type": contentType,
      } = response.Metadata ?? {};
      if (!collectionId) {
        logger.info("No collection id found in metadata");
        return;
      }
      logger.info({ collectionId }, "Collection id found in metadata");
    }
  }
};
