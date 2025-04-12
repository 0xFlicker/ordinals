import { from, mergeMap, retry, timer, filter, map, tap } from "rxjs";
import {
  FundedEvent,
  FundingDao,
  InsufficientFundsEvent,
  createLogger,
  createMempoolBitcoinClient,
  createDynamoDbFundingDao,
  createSqsClient,
  enqueueCheckTxo,
  getDb,
  insufficientFundsQueueUrl,
  fundedQueueUrl,
  tableNames,
} from "@0xflick/ordinals-backend";
import { type Handler } from "aws-lambda";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import { NoVoutFound } from "@0xflick/ordinals-backend/watch/mempool.js";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
const logger = createLogger({ name: "funding-poller" });

const sqsClient = createSqsClient();

function shouldCheckNow(item: { nextCheckAt: Date }): boolean {
  const now = Date.now();
  const nextCheckAt = item.nextCheckAt;
  if (!nextCheckAt) {
    return true;
  }
  return now > nextCheckAt.getTime();
}

function createCheckFundingStream({
  fundingId,
  address,
  fundingAmountSat,
  network,
  fundingDao,
}: {
  fundingId: string;
  address: string;
  fundingAmountSat: number;
  network: BitcoinNetworkNames;
  fundingDao: FundingDao;
}) {
  const mempoolBitcoinClient = createMempoolBitcoinClient({
    network,
  });
  return from(
    enqueueCheckTxo({
      address,
      mempoolBitcoinClient,
      findValue: fundingAmountSat,
    }),
  ).pipe(
    map((mempoolResponse) => {
      if (!mempoolResponse) throw new NoVoutFound({ address });
      return mempoolResponse;
    }),
    retry({
      resetOnSuccess: true,
      delay: 100,
      count: 3,
    }),
    mergeMap(async (funding) => {
      logger.info(
        `Funding ${fundingId} for ${funding.address} found!  Paid ${funding.amount} for a request of: ${fundingAmountSat}`,
      );
      if (funding.amount < fundingAmountSat) {
        logger.warn(`Funding ${fundingId} for ${address} is underfunded`);
      } else {
        await fundingDao.addressFunded({
          fundingTxid: funding.txid,
          fundingVout: funding.vout,
          id: fundingId,
        });
        await fundingDao.updateFundingNextCheckAt({
          id: fundingId,
          nextCheckAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });
        return funding;
      }
    }),
    tap((funding) => {
      if (funding.amount < fundingAmountSat) {
        const event: InsufficientFundsEvent = {
          fundingId,
          address,
          fundingAmountSat,
          txid: funding.txid,
          vout: funding.vout,
          fundedAmount: funding.amount,
          network,
        };
        sqsClient.send(
          new SendMessageCommand({
            QueueUrl: insufficientFundsQueueUrl.get(),
            MessageBody: JSON.stringify(event),
          }),
        );
      }
    }),
  );
}

export const handler: Handler = async () => {
  const fundingDao = createDynamoDbFundingDao();
  const allFundings = await fundingDao.getAllFundingsByStatusNextCheckAt({
    fundingStatus: "funding",
    nextCheckAt: new Date(),
  });

  const fundingsToCheck = allFundings.filter(shouldCheckNow);
  const fundingsToSkip = allFundings.filter((f) => !shouldCheckNow(f));

  const nextCheckTime =
    fundingsToSkip.length > 0
      ? new Date(
          Math.min(...fundingsToSkip.map((f) => f.nextCheckAt.getTime())),
        ).toISOString()
      : "N/A";

  logger.info(
    {
      totalFundings: allFundings.length,
      checkingNow: fundingsToCheck.length,
      checkingLater: fundingsToSkip.length,
      nextCheckAt: nextCheckTime,
    },
    "Funding check status",
  );

  const fundingStreams = from(fundingsToCheck).pipe(
    mergeMap((funding) => {
      return createCheckFundingStream({
        fundingId: funding.id,
        address: funding.address,
        fundingAmountSat: funding.fundingAmountSat,
        network: funding.network,
        fundingDao,
      }).pipe(
        map((fundings) => ({
          ...fundings,
          ...funding,
        })),
      );
    }, 12),
    mergeMap(
      async ({
        address,
        amount,
        fundingAmountSat,
        id,
        network,
        txid,
        vout,
      }) => {
        try {
          const event: FundedEvent = {
            address,
            fundedAmount: amount,
            fundingAmountSat,
            fundingId: id,
            network,
            txid,
            vout,
          };
          const { MessageId } = await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: fundedQueueUrl.get(),
              MessageBody: JSON.stringify(event),
            }),
          );
          logger.info(
            { MessageId },
            `Funding ${id} for ${address} sent to SQS with amount ${amount}`,
          );
          return {
            address,
            amount,
            fundingAmountSat,
            id,
            network,
            txid,
            vout,
          };
        } catch (error) {
          logger.error(error, `Error sending message to SQS`);
          return {
            fundingId: id,
            error: error as Error,
          };
        }
      },
    ),
  );
  fundingStreams.subscribe({
    complete() {
      logger.info("Funding poller complete");
    },
  });
};
