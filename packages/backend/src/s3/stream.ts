import { toCollectionId } from "@0xflick/ordinals-models";
import { createDynamoDbFundingDao, uploadBucket } from "../index.js";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const updateCollectionMeta = async ({
  key,
  bucket,
  s3Client,
}: {
  key: string;
  bucket: string;
  s3Client: S3Client;
}) => {
  const uploadBucketName = uploadBucket.get();
  if (bucket !== uploadBucketName) {
    return;
  }
  const response = await s3Client.send(
    new HeadObjectCommand({
      Bucket: uploadBucketName,
      Key: key,
    }),
  );
  const { "x-collection-id": collectionId } = response.Metadata ?? {};
  if (!collectionId) {
    console.error("No collection id found in metadata");
    return;
  }
  const collectionFundingDao = createDynamoDbFundingDao<
    {},
    {
      parentInscriptionContentExists?: boolean;
    }
  >();
  await collectionFundingDao.updateCollectionMeta(
    toCollectionId(collectionId),
    {
      parentInscriptionContentExists: true,
    },
  );
};
