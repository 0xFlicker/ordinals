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
} from "@0xflick/ordinals-backend";
import { SecretKey } from "@0xflick/crypto-utils";
import { SQSHandler } from "aws-lambda";
import { generateGenesisTransaction } from "@0xflick/inscriptions";
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
          const doc = await fundingDocDao.getInscriptionTransaction({
            fundingAddress: address,
            id: fundingId,
          });

          const mempoolBitcoinClient = createMempoolBitcoinClient({
            network,
          });
          logger.info("Generating genesis transaction");
          const secKey = new SecretKey(Buffer.from(doc.secKey, "hex"));
          const genesisTx = await generateGenesisTransaction({
            amount: fundedAmount,
            initCBlock: doc.initCBlock,
            initLeaf: doc.initLeaf,
            initScript: doc.initScript,
            initTapKey: doc.initTapKey,
            secKey,
            txid,
            vout,
            fee: doc.totalFee,
          });

          logger.info(`Sending genesis funding ${fundingId} to mempool`);
          const genesisTxid = (await mempoolBitcoinClient.transactions.postTx({
            txhex: genesisTx,
          })) as string;
          logger.info(`Genesis funding ${fundingId} is funded!`);
          const genesisEvent: GenesisEvent = {
            fundingId,
            genesisTxid,
            fundingTxid: txid,
            fundedAmount,
            fundedAddress: address,
            network,
          };
          const [{ MessageId }] = await Promise.all([
            sqsClient.send(
              new SendMessageCommand({
                QueueUrl: genesisQueueUrl.get(),
                MessageBody: JSON.stringify(genesisEvent),
              }),
            ),
            fundingDao.genesisFunded({
              genesisTxid,
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
