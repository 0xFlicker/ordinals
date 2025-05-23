import { from, mergeMap, retry, catchError, map, tap } from "rxjs";
import {
  FundedEvent,
  FundingDao,
  InsufficientFundsEvent,
  createLogger,
  createDynamoDbFundingDao,
  createSqsClient,
  insufficientFundsQueueUrl,
  fundedQueueUrl,
  pullElectrumTransactionsForAddress,
} from "@0xflick/ordinals-backend";
import { type Handler } from "aws-lambda";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import { NoVoutFound } from "@0xflick/ordinals-backend/watch/mempool.js";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
const logger = createLogger({ name: "funding-poller" });

const sqsClient = createSqsClient();

function shouldCheckNow(item: { nextCheckAt: Date; id: string }): boolean {
  const now = Date.now();
  const nextCheckAt = item.nextCheckAt;
  if (!nextCheckAt) {
    return true;
  }
  const isPast = now > nextCheckAt.getTime();
  if (!isPast) {
    logger.info(
      {
        nextCheckAt: nextCheckAt.toISOString(),
      },
      `Funding ${item.id} is not past due`,
    );
  }
  return isPast;
}

function createCheckFundingStream({
  fundingId,
  address,
  scriptHash,
  fundingAmountSat,
  network,
  fundingDao,
}: {
  fundingId: string;
  address: string;
  scriptHash: string;
  fundingAmountSat: number;
  network: BitcoinNetworkNames;
  fundingDao: FundingDao;
}) {
  return from(
    pullElectrumTransactionsForAddress({
      scriptHash,
      findValue: fundingAmountSat,
      network,
    }),
  ).pipe(
    map((response) => {
      logger.info(
        { ...response },
        `Electrum response for funding ${fundingId}`,
      );
      if (!response)
        throw new Error(`No electrum response for funding ${fundingId}`);
      return response;
    }),
    retry({
      resetOnSuccess: true,
      delay: 100,
      count: 3,
    }),
    mergeMap(async (funding) => {
      logger.info(
        { fundingId, txid: funding.txid, address, amount: funding.amount },
        `Funding ${fundingId} for ${address} found!  Paid ${funding.amount} for a request of: ${fundingAmountSat}`,
      );
      if (funding.amount < fundingAmountSat) {
        logger.warn(`Funding ${fundingId} for ${address} is underfunded`);
      } else {
        const overpaymentAmountSat =
          funding.amount - fundingAmountSat > 0
            ? funding.amount - fundingAmountSat
            : undefined;
        await fundingDao.addressFunded({
          fundingTxid: funding.txid,
          fundingVout: funding.vout,
          id: fundingId,
          overpaymentAmountSat,
        });
      }
      return funding;
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
  try {
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
          scriptHash: funding.genesisScriptHash,
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
          creatorId,
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
              creatorId,
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
              creatorId,
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
      error(err) {
        logger.error(err, "Error in funding poller");
        throw err;
      },
    });
  } catch (error) {
    logger.error(error, "Error in funding poller");
    throw error;
  }
};
