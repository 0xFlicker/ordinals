import { DynamoDBStreamEvent } from "aws-lambda";
import { handleDynamoDBRecord } from "./handler";

export const handler = async (event: DynamoDBStreamEvent) => {
  await Promise.all(event.Records.map(handleDynamoDBRecord));
};
