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
      if (collectionId) {
        const fundings =
          await fundingDao.listAllFundingByStatusAndCollectionPaginated({
            id: collectionId as ID_Collection,
            fundingStatus: fromGraphqlFundingStatus(fundingStatus),
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
      } else {
        const fundings = await fundingDao.listAllFundingByStatusPaginated({
          fundingStatus: fromGraphqlFundingStatus(fundingStatus),
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
      }
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
        case "testnet4":
          return "TESTNET4";
        default:
          throw new Error(`Unknown network: ${await p.network}`);
      }
    },
    qrSrc: async (p) => {
      return (await p.getQrSrc({})).src;
    },
    status: async (p) => {
      return toGraphqlFundingStatus(await p.fundingStatus());
    },
    fundingGenesisTxUrl: async (p, _, { fundingDao }) => {
      const id = await p.fundingGenesisTxId();
      if (!id) {
        return null;
      }
      return getUrl({
        network: await p.network,
        id,
        bitcoinRegtestMempoolEndpoint: "http://localhost:4080",
        bitcoinTestnetMempoolEndpoint: "https://mempool.space/testnet",
        bitcoinMainnetMempoolEndpoint: "https://mempool.space",
        bitcoinTestnet4MempoolEndpoint: "https://mempool.space/testnet4",
      });
    },

    fundingRevealTxUrl: async (p, _, { fundingDao }) => {
      const id = await p.fundingRevealTxId();
      if (!id) {
        return null;
      }
      return getUrl({
        network: await p.network,
        id,
        bitcoinRegtestMempoolEndpoint: "http://localhost:4080",
        bitcoinTestnetMempoolEndpoint: "https://mempool.space/testnet",
        bitcoinMainnetMempoolEndpoint: "https://mempool.space",
        bitcoinTestnet4MempoolEndpoint: "https://mempool.space/testnet4",
      });
    },
  },
};
