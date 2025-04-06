import { BitcoinModule } from "./generated-types/module-types.js";
import { MempoolModel } from "./models.js";
import { toBitcoinNetworkName } from "./transforms.js";

export const resolvers: BitcoinModule.Resolvers = {
  Query: {
    currentBitcoinFees: async (
      _,
      { network },
      { createMempoolBitcoinClient },
    ) => {
      const client = createMempoolBitcoinClient({
        network: toBitcoinNetworkName(network),
      });
      const mempoolBitcoinClient = new MempoolModel(client);
      const feeEstimate = await mempoolBitcoinClient.recommendedFees();
      return {
        minimum: feeEstimate.minimumFee,
        fastest: feeEstimate.fastestFee,
        halfHour: feeEstimate.halfHourFee,
        hour: feeEstimate.hourFee,
      };
    },
  },
};
