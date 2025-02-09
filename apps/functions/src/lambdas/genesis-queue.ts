import { Observable, mergeMap, map, from, tap, retry, timer } from "rxjs";
import {
  FundedEvent,
  GenesisEvent,
  NoVoutFound,
  createDynamoDbFundingDao,
  createLogger,
  createMempoolBitcoinClient,
  createS3Client,
  createSqsClient,
  createStorageFundingDocDao,
  enqueueCheckTxo,
  genesisQueueUrl,
  inscriptionBucket,
} from "@0xflick/ordinals-backend";
import { SecretKey } from "@0xflick/crypto-utils";
import { SQSHandler } from "aws-lambda";
import { WritableInscription, generateGenesisTransaction, generateRevealTransaction } from "@0xflick/inscriptions";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

const logger = createLogger({ name: "funded-queue" });
const sqsClient = createSqsClient();
const s3Client = createS3Client();
const fundingDao = createDynamoDbFundingDao();
const fundingDocDao = createStorageFundingDocDao({
  s3Client,
  bucketName: inscriptionBucket.get(),
});

function observeGenesisEvent(event: Observable<GenesisEvent>) {
  return event.pipe(
    mergeMap(
      ({
        fundedAddress,
        network,
        fundedAmount,
        fundingId,
        fundingTxid,
      }) =>
        from(
          enqueueCheckTxo({
            address: fundedAddress,
            mempoolBitcoinClient: createMempoolBitcoinClient({
              network,
            }),
          }),
        ).pipe(
          map((mempoolResponse) => {
            if (!mempoolResponse)
              throw new NoVoutFound({ address: fundedAddress });
            return mempoolResponse;
          }),
          retry({
            resetOnSuccess: true,
            delay(error, retryCount) {
              logger.error(error, "Error checking funding");
              return timer(100);
            },
          }),
          mergeMap(
            async({
              address,
              amount,
              txid,
              vout
            }) => {
              const [doc, funding] = await Promise.all([
                fundingDocDao.getInscriptionTransaction({
                  id: fundingId,
                  fundingAddress: fundedAddress,
                }),
                fundingDao.getFunding(fundingId),
              ])
                return {
                  doc,
                  fundingId,
                  fundingTxid,
                  genesisTxid: txid,
                  genesisVout: vout,
                  genesisAmount: amount,
                  fundedAddress,
                  fundedAmount,
                  network,
                  genesisAddress: address,
                  tipAmount: funding.tipAmountSat,
                  tipAddress: funding.tipAmountDestination,
                }
            },
          ),
          mergeMap(async ({ 
            doc, tipAmount, tipAddress,genesisAddress, fundedAddress, fundedAmount, fundingId, fundingTxid, network, genesisAmount, genesisVout, genesisTxid }) => {
            const mempoolBitcoinClient = createMempoolBitcoinClient({
              network,
            });

            const { fastestFee, halfHourFee, hourFee } = await mempoolBitcoinClient.fees.getFeesRecommended();

            const revealTx = generateRevealTransaction({
              inputs: [{
                address: genesisAddress,
                amount: genesisAmount,
                cblock: doc.initCBlock,
                leaf: doc.initLeaf,
                script: doc.initScript,
                tapkey: doc.initTapKey,
                vout: genesisVout,
                txid: genesisTxid,
                padding: doc.padding,
                secKey: new SecretKey(Buffer.from(doc.secKey, "hex")),
                inscriptions: doc.writableInscriptions,
              }]
            });
            const revealTxid = await mempoolBitcoinClient.transactions.postTx({
              txhex: revealTx,
            });


            const [{ MessageId }] = await Promise.all([
              sqsClient.send(
                new SendMessageCommand({
                  QueueUrl: genesisQueueUrl.get(),
                  MessageBody: JSON.stringify(value),
                }),
              ),
            ]);
            return {
              revealTxid,
              fundingId,
              fundingTxid,
              genesisTxid,
              fundedAddress,
              fundedAmount,
              network,
              genesisAddress,
              genesisAmount,
              genesisVout,
            };
          }),
        ),  
      ),
    ),
    tap((value: GenesisEvent) => {
      sqsClient
        .send(
          new SendMessageCommand({
            QueueUrl: genesisQueueUrl.get(),
            MessageBody: JSON.stringify(value),
          }),
        )
        .then(({ MessageId }) => {
          logger.info(
            {
              MessageId,
            },
            `Sent genesis event ${value.fundingId} to queue`,
          );
        })
        .catch((error) => {
          logger.error(
            error,
            `Error sending genesis event ${value.fundingId} to queue`,
          );
        });
    }),
  );
}

export const handler: SQSHandler = async (event) => {
  await new Promise<void>((resolve, reject) =>
    from(event.Records)
      .pipe(
        map((message) => JSON.parse(message.body)),
        mergeMap(observeGenesisEvent),
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
