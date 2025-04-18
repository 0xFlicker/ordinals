import { bitcoinToSats } from "@0xflick/inscriptions";
import { InscriptionFundingModule } from "./generated-types/module-types.js";
import { getFundingModel, getUrl } from "./controllers.js";
import {
  fromGraphqlFundingStatus,
  toGraphqlFundingStatus,
} from "../axolotl/transforms.js";
import { ID_Collection } from "@0xflick/ordinals-models";

export const resolvers: InscriptionFundingModule.Resolvers = {
  Query: {
    inscriptionFunding: async (
      _,
      { id },
      { fundingDao, fundingDocDao, inscriptionBucket, s3Client },
    ) => {
      return getFundingModel({
        id,
        fundingDao,
        fundingDocDao,
        inscriptionBucket,
        s3Client,
      });
    },
    inscriptionFundings: async (
      _,
      { query: { collectionId, fundingStatus, next, limit } },
      { fundingDao, fundingDocDao, inscriptionBucket, s3Client },
    ) => {
      if (!collectionId && !fundingStatus) {
        return {
          problems: [
            {
              message: "Must provide either collectionId or fundingStatus",
            },
          ],
        };
      }
      const fundings =
        await fundingDao.listAllFundingByStatusAndCollectionPaginated({
          id: collectionId as ID_Collection,
          fundingStatus: fundingStatus
            ? fromGraphqlFundingStatus(fundingStatus)
            : undefined,
          cursor: next ?? undefined,
          limit: limit ?? undefined,
        });
      return {
        fundings: fundings.items.map((f) =>
          getFundingModel({
            id: f.id,
            fundingDao,
            fundingDocDao,
            inscriptionBucket,
            s3Client,
          }),
        ),
        next: fundings.cursor,
        count: fundings.count,
      };
    },
  },
  InscriptionFunding: {
    fundingAmountSats: async (p) => {
      return Number(bitcoinToSats(await p.fundingAmountBtc));
    },
    network: async (p) => {
      switch (await p.network) {
        case "mainnet":
          return "MAINNET";
        case "testnet":
          return "TESTNET";
        case "regtest":
          return "REGTEST";
        default:
          throw new Error(`Unknown network: ${await p.network}`);
      }
    },
    qrSrc: async (p) => {
      return (await p.getQrSrc({})).src;
    },
    status: async (p, _, { fundingDao }) => {
      const funding = await fundingDao.getFunding(p.id);
      return toGraphqlFundingStatus(funding.fundingStatus);
    },
    fundingGenesisTxId: async (p, _, { fundingDao }) => {
      const funding = await fundingDao.getFunding(p.id);
      return funding.genesisTxid ?? null;
    },
    fundingGenesisTxUrl: async (p, _, { fundingDao }) => {
      const funding = await fundingDao.getFunding(p.id);
      if (!funding.genesisTxid) {
        return null;
      }
      return getUrl({
        network: funding.network,
        id: funding.genesisTxid,
        bitcoinRegtestMempoolEndpoint: "http://localhost:4080",
        bitcoinTestnetMempoolEndpoint: "https://mempool.space/testnet",
        bitcoinMainnetMempoolEndpoint: "https://mempool.space",
      });
    },
    fundingRevealTxId: async (p, _, { fundingDao }) => {
      const funding = await fundingDao.getFunding(p.id);
      return funding.revealTxid!;
    },
    fundingRevealTxUrl: async (p, _, { fundingDao }) => {
      const funding = await fundingDao.getFunding(p.id);
      if (!funding.revealTxid) {
        return null;
      }
      return getUrl({
        network: funding.network,
        id: funding.revealTxid,
        bitcoinRegtestMempoolEndpoint: "http://localhost:4080",
        bitcoinTestnetMempoolEndpoint: "https://mempool.space/testnet",
        bitcoinMainnetMempoolEndpoint: "https://mempool.space",
      });
    },
  },
};
