import { Handler } from "aws-lambda";
import {
  createDynamoDbBatchDao,
  createDynamoDbFundingDao,
  createStorageFundingDocDao,
  createLogger,
  inscriptionBucket,
  transactionBucket,
  createMempoolBitcoinClient,
  getFeeEstimates,
  submitTx,
  createSqsClient,
  createS3Client,
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
} from "./events";
import { uploadTransaction } from "./storage";
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
async function submitBatchTransaction(
  fundings: InscriptionFunding[],
  hex: string,
  network: BitcoinNetworkNames,
): Promise<string> {
  const id = uuidv4();
  const [_, txid] = await Promise.all([
    batchDao.createBatch(
      fundings.map(({ id }) => id),
      id,
    ),
    submitTx({
      txhex: hex,
      mempoolBitcoinClient: createMempoolBitcoinClient({
        network,
      }),
    }).then(async (txid) => {
      logger.info({ txid }, `Submitted batch ${id}`);
      try {
        try {
          await sendBatchSubmittedEvent(sqsClient, {
            batchId: id,
            txid,
            fundingIds: fundings.map(({ id }) => id),
          });
        } catch (error: any) {
          logger.error({ error }, `Could not submit batch ${id}`);
          await sendCouldNotSubmitBatchEvent(sqsClient, {
            batchId: id,
            error: error.message,
            fundings,
          });
        }
      } finally {
        if (txid) {
          uploadTransaction(s3Client, transactionBucket.get(), txid, hex);
        }
      }
      logger.info({ txid }, `Submitted batch ${id}`);
      await Promise.all([
        fundingDao.revealFunded({
          id,
          revealTxid: txid,
        }),
        batchDao.updateBatch(id, txid),
      ]);
      return txid;
    }),
  ]);
  return txid;
}

// Our scheduled Lambda handler
export const handler: Handler = async () => {
  const allReadFundings: Promise<{
    doc: IInscriptionDocCommon;
    funding: StatusFunding;
  }>[] = [];
  for await (const funding of fundingDao.listAllFundingsByStatusFundedAt({
    fundingStatus: "funded",
    fundedAt: new Date(),
  })) {
    allReadFundings.push(
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
  const readyFundings = await Promise.all(allReadFundings);

  if (readyFundings.length === 0) {
    logger.info("No ready fundings to batch; exiting.");
    return;
  }

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
        networks: fundingsByNetwork.keys(),
      },
      "Fundings by network",
    );
  }

  for (const [network, requests] of fundingsByNetwork.entries()) {
    const batchId = uuidv4();
    const { fastestFee, hourFee } = await getFeeEstimates(network);
    const fundings: GroupableFunding[] = [];
    for (const { doc, funding } of requests) {
      logger.info(
        {
          amount: funding.fundingAmountSat,
          tipAmount: doc.tip,
          tipDestination: doc.tipAmountDestination,
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
    } = groupFundings(fundings, [fastestFee, hourFee]);
    const [
      remainingFundingsEvent,
      rejectedFundingsEvent,
      ...batchTransactions
    ] = await Promise.all([
      sendRemainingFundingsEvent(sqsClient, {
        laterFundings,
        laterParentInscription,
      }),
      rejectedFundings.length > 0
        ? sendCouldNotSubmitBatchEvent(sqsClient, {
            batchId,
            error: "Failed to group fundings",
            fundings: rejectedFundings,
          })
        : Promise.resolve<null>(null),
      ...Object.values(nextParentInscription).map(async ({ fundings, hex }) => {
        return submitBatchTransaction(fundings, hex, network);
      }),
      ...Object.values(feeDestinationGroups)
        .map((revealedTransactions) =>
          revealedTransactions.map(async ({ fundings, hex }) => {
            return submitBatchTransaction(fundings, hex, network);
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
