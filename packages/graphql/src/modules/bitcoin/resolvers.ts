import { getFeeEstimates } from "@0xflick/ordinals-backend";
import { BitcoinModule } from "./generated-types/module-types.js";
import { toBitcoinNetworkName } from "./transforms.js";
import { bitcoinNetworkStatus } from "./blockchainInfo.js";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({ name: "bitcoin-resolvers" });

export const resolvers: BitcoinModule.Resolvers = {
  Query: {
    currentBitcoinFees: async (_, { network }) => {
      try {
        const results = await getFeeEstimates(toBitcoinNetworkName(network));
        return {
          data: results.fees,
          problems: results.problems?.map((problem) => ({
            message: problem,
            severity: "ERROR",
          })),
        };
      } catch (error) {
        logger.error(error);
        return {
          data: null,
          problems: [
            {
              message: "Something went wrong",
              severity: "ERROR",
            },
          ],
        };
      }
    },
    bitcoinNetworkStatus: async (_, { network }) => {
      return {
        data: await bitcoinNetworkStatus({ network }),
      };
    },
  },
};
