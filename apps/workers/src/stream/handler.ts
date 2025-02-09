import { S3EventRecord, type DynamoDBRecord } from "aws-lambda";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  createDynamoDbFundingDao,
  createS3Client,
} from "@0xflick/ordinals-backend";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { uploadBucketName } from "../config";
import { toCollectionId } from "@0xflick/ordinals-models";

const s3Client = createS3Client();

type CollectionModel = {
  pk: string;
  sk: "collection";
  collectionId: string;
  maxSupply: number;
  pendingCount: number;
  totalCount: number;
};

function isCollectionModel(model: any): model is CollectionModel {
  return model.sk === "collection";
}

export const handleDynamoDBRecord = async (record: DynamoDBRecord) => {
  console.log("UPDATE TYPE", record.eventName);
  if (record.dynamodb?.OldImage) {
    const model = unmarshall(record.dynamodb?.OldImage as any);
    console.log("Old Model:\n", JSON.stringify(model, null, 2));
  }
  if (record.dynamodb?.NewImage) {
    const model = unmarshall(record.dynamodb?.NewImage as any);
    console.log("New Model:\n", JSON.stringify(model, null, 2));
  }
};

export const handleS3Record = async (record: S3EventRecord) => {
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
    }
  }
};
