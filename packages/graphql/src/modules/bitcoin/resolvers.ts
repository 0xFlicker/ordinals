import { estimateSmartFee } from "@0xflick/ordinals-backend";
import { BitcoinModule } from "./generated-types/module-types.js";
import { toBitcoinNetworkName } from "./transforms.js";
import { bitcoinNetworkStatus } from "./blockchainInfo.js";
export const resolvers: BitcoinModule.Resolvers = {
  Query: {
    currentBitcoinFees: async (_, { network }) => {
      const [
        { feerate: minimum },
        { feerate: halfHour },
        { feerate: hour },
        { feerate: fastest },
      ] = await Promise.all([
        estimateSmartFee(
          { conf_target: 1, estimate_mode: "CONSERVATIVE" },
          toBitcoinNetworkName(network),
        ),
        estimateSmartFee(
          { conf_target: 2, estimate_mode: "CONSERVATIVE" },
          toBitcoinNetworkName(network),
        ),
        estimateSmartFee(
          { conf_target: 3, estimate_mode: "CONSERVATIVE" },
          toBitcoinNetworkName(network),
        ),
        estimateSmartFee(
          { conf_target: 6, estimate_mode: "CONSERVATIVE" },
          toBitcoinNetworkName(network),
        ),
      ]);
      return {
        minimum,
        fastest,
        halfHour,
        hour,
      };
    },
    bitcoinNetworkStatus: async (_, { network }) => {
      return bitcoinNetworkStatus({ network });
    },
  },
};
