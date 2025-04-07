import { Observable, mergeMap, map, from, tap } from "rxjs";
import {
  FundedEvent,
  GenesisEvent,
  createDynamoDbFundingDao,
  createLogger,
  createMempoolBitcoinClient,
  createS3Client,
  createSqsClient,
  createStorageFundingDocDao,
  genesisQueueUrl,
  inscriptionBucket,
  getFeeEstimates,
} from "@0xflick/ordinals-backend";
import { SecretKey } from "@0xflick/crypto-utils";
import { SQSHandler } from "aws-lambda";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

const logger = createLogger({ name: "funded-queue" });
const sqsClient = createSqsClient();
const s3Client = createS3Client();
const fundingDao = createDynamoDbFundingDao();
const fundingDocDao = createStorageFundingDocDao({
  s3Client,
  bucketName: inscriptionBucket.get(),
});

function observeFundedEvent(event: Observable<FundedEvent>) {
  return event.pipe(
    mergeMap(
      async ({ address, fundedAmount, fundingId, txid, vout, network }) => {
        try {
          const [
            doc,
            {
              address: fundingAddress,
              network,
              createdAt,
              destinationAddress,
              fundingAmountBtc,
              fundingAmountSat,
              fundingStatus,
              id,
              meta,
              timesChecked,
              type,
              collectionId,
              fundedAt,
              revealTxid,
            },
          ] = await Promise.all([
            fundingDocDao.getInscriptionTransaction({
              fundingAddress: address,
              id: fundingId,
            }),
            fundingDao.getFunding(fundingId),
          ]);

          const mempoolBitcoinClient = createMempoolBitcoinClient({
            network,
          });
          logger.info("Generating genesis transaction");
          const secKey = new SecretKey(Buffer.from(doc.secKey, "hex"));
          const { fastestFee } = await getFeeEstimates(network);

          const [{ MessageId }] = await Promise.all([
            sqsClient.send(
              new SendMessageCommand({
                QueueUrl: genesisQueueUrl.get(),
                MessageBody: JSON.stringify(genesisEvent),
              }),
            ),
            fundingDao.genesisFunded({
              genesisTxid: txid,
              id: fundingId,
            }),
            fundingDao.updateFundingLastChecked({
              id: fundingId,
              lastChecked: new Date(),
              resetTimesChecked: true,
            }),
          ]);
          logger.info(
            {
              MessageId,
            },
            `Sent genesis event ${fundingId} to queue`,
          );
          return {
            fundingId,
            genesisTxid,
            fundingTxid: txid,
            fundedAmount,
            fundedAddress: address,
            network,
          };
        } catch (error: unknown) {
          logger.error(error, `Error processing funded event ${fundingId}`);
          return {
            fundingId,
            error: error as Error,
          };
        }
      },
    ),
  );
}

export const handler: SQSHandler = async (event) => {
  await new Promise<void>((resolve, reject) =>
    from(event.Records)
      .pipe(
        map((message) => JSON.parse(message.body)),
        mergeMap(observeFundedEvent),
      )
      .subscribe({
        next(value) {
          logger.info(value, "Funded event processed");
        },
        complete() {
          logger.info("Completed");
          resolve();
        },
        error(error) {
          logger.error(error, "Error processing funded event");
          reject(error);
        },
      }),
  );
};
