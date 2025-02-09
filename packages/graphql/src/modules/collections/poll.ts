// Only used for local development, in production there are lambda s3 event notifications that do this

import { ID_Collection } from "@0xflick/ordinals-models";
import { Context } from "../../context/index.js";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  createLogger,
  handleUploadedParentInscription,
} from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "s3-polling",
});

export async function startS3Polling(
  fileName: string,
  collectionId: ID_Collection,
  context: Context,
) {
  const collectionLogger = logger.child({
    collectionId,
    fileName,
  });
  const { s3Client, uploadBucket, typedFundingDao } = context;
  // poll s3 for the file
  let found = false;
  while (!found) {
    try {
      const result = await s3Client.send(
        new HeadObjectCommand({
          Bucket: uploadBucket,
          Key: fileName,
        }),
      );
      if (result.ContentType) {
        found = true;
      } else {
        throw new Error("File not found");
      }
    } catch (err) {
      collectionLogger.info("waiting for file to be uploaded");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  collectionLogger.info(`file found for ${fileName}`);
  // the bit that runs in the lambda
  await handleUploadedParentInscription(collectionId);
}
