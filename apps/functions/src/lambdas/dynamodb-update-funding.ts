import { DynamoDBStreamEvent, type DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  FundingDao,
  createEventBridgeClient,
  emitEvent,
} from "@0xflick/ordinals-backend";
import { IAddressInscriptionModel } from "@0xflick/ordinals-models/addressInscription.js";
import { TCollectionModel } from "@0xflick/ordinals-models";

const eventBridgeClient = createEventBridgeClient({
  endpoint: process.env.EVENT_BRIDGE_ENDPOINT,
});

function isInsert(record: DynamoDBRecord) {
  return record.eventName === "INSERT";
}

function isUpdate(record: DynamoDBRecord) {
  return record.eventName === "MODIFY";
}

function isCollectionFunding(
  newModel: TCollectionModel | IAddressInscriptionModel,
): newModel is TCollectionModel {
  return newModel.type === "collection";
}

function isAddressInscriptionFunding(
  newModel: IAddressInscriptionModel | TCollectionModel,
): newModel is IAddressInscriptionModel {
  return newModel.type === "address-inscription";
}

function isFunding(newModel: IAddressInscriptionModel) {
  return newModel.fundingStatus === "funding";
}

async function handleDynamoDBRecord(record: DynamoDBRecord) {
  const { dynamodb } = record;
  if (isInsert(record)) {
    const { NewImage } = dynamodb;
    const newModel = FundingDao.recordToModel(NewImage);
    if (isAddressInscriptionFunding(newModel)) {
      await emitEvent({
        event: {
          Action: "address-inscription-funding",
          Payload: {
            collectionId: newModel.collectionId,
            addressInscriptionId: newModel.id,
          },
        },
        eventBridge: eventBridgeClient,
        source: "dynamodb-update-funding",
      });
    }
  }
}

export const handler = async (event: DynamoDBStreamEvent) => {
  await Promise.all(event.Records.map(handleDynamoDBRecord));
};
