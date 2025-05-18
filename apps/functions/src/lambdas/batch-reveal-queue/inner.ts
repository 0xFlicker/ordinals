import { Handler } from "aws-lambda";
import {
  createDynamoDbBatchDao,
  createDynamoDbFundingDao,
  createStorageFundingDocDao,
  createLogger,
  inscriptionBucket,
  transactionBucket,
  getFeeEstimates,
  createSqsClient,
  createS3Client,
  sendRawTransaction,
} from "@0xflick/ordinals-backend";
import { v4 as uuidv4 } from "uuid";
import {
  GroupableFunding,
  groupFundings,
  InscriptionFunding,
} from "@0xflick/inscriptions";
import {
  BitcoinNetworkNames,
  IInscriptionDocCommon,
} from "@0xflick/ordinals-models";
import {
  sendBatchSubmittedEvent,
  sendCouldNotSubmitBatchEvent,
  sendRemainingFundingsEvent,
} from "./events.js";
import { uploadTransaction } from "./storage.js";
const logger = createLogger({ name: "scheduled-batch-processor" });

type StatusFunding = {
  address: string;
  id: string;
  fundingAmountSat: number;
  network: BitcoinNetworkNames;
  fundedAt: Date;
  sizeEstimate: number;
  fundingTxid: string;
  fundingVout: number;
};

const batchDao = createDynamoDbBatchDao();
const fundingDao = createDynamoDbFundingDao();
const fundingDocDao = createStorageFundingDocDao({
  bucketName: inscriptionBucket.get(),
});

const sqsClient = createSqsClient();
const s3Client = createS3Client();

/**
 * Submits a batch transaction and handles all related operations
 * @param fundings The fundings to include in the batch
 * @param hex The transaction hex
 * @param network The Bitcoin network
 * @returns The transaction ID
 */
async function submitBatchTransaction({
  fundings,
  hex,
  network,
}: {
  fundings: InscriptionFunding[];
  hex: string;
  network: BitcoinNetworkNames;
}): Promise<string> {
  const id = uuidv4();
  let txid: string | undefined;
  try {
    logger.info(
      { batchId: id, fundingIds: fundings.map(({ id }) => id) },
      "Funding IDs",
    );
    await batchDao.createBatch({
      fundingIds: fundings.map(({ id }) => id),
      batchId: id,
      network,
    });
    logger.info(
      {
        batchId: id,
      },
      "Sending raw transaction",
    );
    txid = await sendRawTransaction(hex, network);

    // Track the offset index for each funding.
    const fundingReveals: {
      id: string;
      batchTransactionOffset: number;
    }[] = [];
    for (const { parentTxs, inputs } of fundings) {
      let offsetIndex = parentTxs?.length ?? 0;
      for (const input of inputs) {
        fundingReveals.push({
          id: input.rootTapKey,
          batchTransactionOffset: offsetIndex,
        });
        offsetIndex += input.inscriptions.length;
      }
    }

    await Promise.all([
      sendBatchSubmittedEvent(sqsClient, {
        batchId: id,
        txid,
        fundingIds: fundings.map(({ id }) => id),
      }),
      batchDao.updateBatch(id, txid, fundingReveals),
    ]);
    return txid;
  } catch (error: any) {
    logger.error(error, `Could not submit batch ${id}`);
    await sendCouldNotSubmitBatchEvent(sqsClient, {
      batchId: id,
      error: error.message,
      fundings,
    });
    logger.info(`Revoking batch ${id}`);
    await batchDao.revokeBatch(id);
    logger.info(`Revoked batch ${id}`);
    throw error;
  } finally {
    await uploadTransaction(s3Client, transactionBucket.get(), id, hex);
  }
}

// Our scheduled Lambda handler
export const handler: Handler = async () => {
  const allReadyFundings: Promise<{
    doc: IInscriptionDocCommon;
    funding: StatusFunding;
  }>[] = [];
  const unableToBatchFundings: InscriptionFunding[] = [];
  for await (const funding of fundingDao.listAllFundingsByStatusFundedAt({
    fundingStatus: "funded",
    fundedAt: new Date(),
  })) {
    logger.info({ funding }, "Funding");
    allReadyFundings.push(
      fundingDocDao
        .getInscriptionTransaction({
          id: funding.id,
          fundingAddress: funding.address,
        })
        .then((doc) => ({
          doc,
          funding,
        })),
    );
  }
  const readyFundings = await Promise.all(allReadyFundings);

  if (readyFundings.length === 0) {
    logger.info("No ready fundings to batch; exiting.");
    return;
  }

  logger.info(
    {
      fundings: readyFundings.length,
    },
    "Ready fundings",
  );

  // Group all fundings by network
  const fundingsByNetwork: Map<
    BitcoinNetworkNames,
    {
      doc: IInscriptionDocCommon;
      funding: StatusFunding;
    }[]
  > = new Map();
  for (const funding of readyFundings) {
    const network = funding.funding.network;
    if (!fundingsByNetwork.has(network)) {
      fundingsByNetwork.set(network, []);
    }
    fundingsByNetwork.get(network)?.push(funding);
  }

  if (fundingsByNetwork.size !== 0) {
    logger.info(
      {
        networks: Object.fromEntries(
          Array.from(fundingsByNetwork.entries()).map(([network, fundings]) => [
            network,
            fundings.length,
          ]),
        ),
      },
      "Fundings by network",
    );
  }

  for (const [network, requests] of fundingsByNetwork.entries()) {
    const batchId = uuidv4();
    const { problems, fees } = await getFeeEstimates(network);
    if (problems || !fees) {
      logger.error({ problems }, "Fee estimation problems");
      continue;
    }
    const fundings: GroupableFunding[] = [];
    for (const { doc, funding } of requests) {
      if (!funding.fundingTxid) {
        logger.error({ funding }, "Funding has no funding txid");
        unableToBatchFundings.push({
          id: funding.id,
          fundedAt: funding.fundedAt,
          sizeEstimate: funding.sizeEstimate,
          inputs: [
            {
              amount: funding.fundingAmountSat,
              leaf: doc.genesisLeaf,
              tapkey: doc.genesisTapKey,
              cblock: doc.genesisCBlock,
              padding: doc.padding,
              script: doc.genesisScript,
              secKey: Buffer.from(doc.secKey, "hex"),
              rootTapKey: doc.rootTapKey,
              inscriptions: doc.writableInscriptions,
              txid: funding.fundingTxid,
              vout: funding.fundingVout,
            },
          ],
          ...(doc.tipAmountDestination && doc.tip
            ? {
                feeDestinations: [
                  {
                    address: doc.tipAmountDestination,
                    weight: 100,
                  },
                ],
                feeTarget: doc.tip,
              }
            : {
                feeDestinations: [],
              }),
          parentInscriptionId: doc.parentInscriptionId,
        });
        continue;
      }
      logger.info(
        {
          address: funding.address,
          amount: funding.fundingAmountSat,
          tipAmount: doc.tip,
          tipDestination: doc.tipAmountDestination,
          txid: funding.fundingTxid,
          vout: funding.fundingVout,
        },
        "Funding",
      );
      fundings.push({
        id: funding.id,
        fundedAt: funding.fundedAt,
        sizeEstimate: funding.sizeEstimate,
        input: {
          amount: funding.fundingAmountSat,
          leaf: doc.genesisLeaf,
          tapkey: doc.genesisTapKey,
          cblock: doc.genesisCBlock,
          padding: doc.padding,
          script: doc.genesisScript,
          secKey: Buffer.from(doc.secKey, "hex"),
          rootTapKey: doc.rootTapKey,
          inscriptions: doc.writableInscriptions,
          txid: funding.fundingTxid,
          vout: funding.fundingVout,
        },
        ...(doc.tipAmountDestination && doc.tip
          ? {
              feeDestinations: [
                {
                  address: doc.tipAmountDestination,
                  weight: 100,
                },
              ],
              feeTarget: doc.tip,
            }
          : {
              feeDestinations: [],
            }),
        parentInscriptionId: doc.parentInscriptionId,
      });
    }

    const {
      feeDestinationGroups,
      laterFundings,
      laterParentInscription,
      nextParentInscription,
      rejectedFundings,
    } = groupFundings(
      fundings,
      [fees.fastest, fees.hour],
      process.env.BATCH_REVEAL_TIME_MINUTES
        ? parseInt(process.env.BATCH_REVEAL_TIME_MINUTES) * 60 * 1000
        : undefined,
    );
    const [
      remainingFundingsEvent,
      rejectedFundingsEvent,
      ...batchTransactions
    ] = await Promise.all([
      sendRemainingFundingsEvent(sqsClient, {
        laterFundings,
        laterParentInscription,
      }),
      rejectedFundings.length > 0 || unableToBatchFundings.length > 0
        ? sendCouldNotSubmitBatchEvent(sqsClient, {
            batchId,
            error: "Failed to group fundings",
            fundings: rejectedFundings.concat(unableToBatchFundings),
          })
        : Promise.resolve<null>(null),
      ...Object.values(nextParentInscription).map(async ({ fundings, hex }) => {
        return submitBatchTransaction({
          fundings,
          hex,
          network,
        });
      }),
      ...Object.values(feeDestinationGroups)
        .map((revealedTransactions) =>
          revealedTransactions.map(async ({ fundings, hex }) => {
            return submitBatchTransaction({
              fundings,
              hex,
              network,
            });
          }),
        )
        .flat(),
    ]);

    logger.info(
      {
        batchId,
        network,
        remainingFundingsEvent: remainingFundingsEvent.MessageId,
        rejectedFundingsEvent: rejectedFundingsEvent?.MessageId,
        transactionsSubmitted: batchTransactions,
      },
      "Submitted batch",
    );
  }
};
