import { SQSClient } from "@aws-sdk/client-sqs";
import { deployment } from "@0xflick/ordinals-config";

export function createSqsClient() {
  return new SQSClient({
    ...deployment,
  });
}
