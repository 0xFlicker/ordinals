import {
  RevealedTransaction,
  InscriptionFunding,
  GroupableFunding,
} from "@0xflick/inscriptions";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import {
  batchSuccessQueueUrl,
  batchFailureQueueUrl,
  batchRemainingFundingsQueueUrl,
} from "@0xflick/ordinals-backend";

export interface CouldNotSubmitBatchEvent {
  batchId: string;
  error: string;
  fundings: InscriptionFunding[];
}

export interface BatchSubmittedEvent {
  batchId: string;
  txid: string;
  fundingIds: string[];
}

export interface RemainingFundingsEvent {
  laterFundings: GroupableFunding[];
  laterParentInscription: Record<string, RevealedTransaction[]>;
}

export async function sendCouldNotSubmitBatchEvent(
  sqsClient: SQSClient,
  event: CouldNotSubmitBatchEvent,
) {
  const command = new SendMessageCommand({
    QueueUrl: batchFailureQueueUrl.get(),
    MessageBody: JSON.stringify(event),
  });
  return await sqsClient.send(command);
}

export async function sendBatchSubmittedEvent(
  sqsClient: SQSClient,
  event: BatchSubmittedEvent,
) {
  const command = new SendMessageCommand({
    QueueUrl: batchSuccessQueueUrl.get(),
    MessageBody: JSON.stringify(event),
  });
  return await sqsClient.send(command);
}

export async function sendRemainingFundingsEvent(
  sqsClient: SQSClient,
  event: RemainingFundingsEvent,
) {
  const command = new SendMessageCommand({
    QueueUrl: batchRemainingFundingsQueueUrl.get(),
    MessageBody: JSON.stringify(event),
  });
  return await sqsClient.send(command);
}
