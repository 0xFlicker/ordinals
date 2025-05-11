import { estimateSmartFee } from "@0xflick/ordinals-backend";
import { BitcoinModule } from "./generated-types/module-types.js";
import { toBitcoinNetworkName } from "./transforms.js";
import { bitcoinNetworkStatus } from "./blockchainInfo.js";
import { createLogger } from "@0xflick/ordinals-backend";
import { BitcoinNetworkProblem } from "../../generated-types/graphql.js";

const logger = createLogger({ name: "bitcoin-resolvers" });

export const resolvers: BitcoinModule.Resolvers = {
  Query: {
    currentBitcoinFees: async (_, { network }) => {
      const problems: BitcoinNetworkProblem[] = [];
      const errorSet = new Set<string>();
      try {
        const results = await Promise.all([
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
        logger.info({ results });
        const [
          { feerate: minimum, errors: minimumErrors },
          { feerate: halfHour, errors: halfHourErrors },
          { feerate: hour, errors: hourErrors },
          { feerate: fastest, errors: fastestErrors },
        ] = results;

        if (minimumErrors.length > 0) {
          for (const error of minimumErrors) {
            errorSet.add(error);
          }
        }
        if (halfHourErrors.length > 0) {
          for (const error of halfHourErrors) {
            errorSet.add(error);
          }
        }
        if (hourErrors.length > 0) {
          for (const error of hourErrors) {
            errorSet.add(error);
          }
        }
        if (fastestErrors.length > 0) {
          for (const error of fastestErrors) {
            errorSet.add(error);
          }
        }
        if (errorSet.size > 0) {
          for (const error of errorSet) {
            problems.push({
              message: error,
              severity: "ERROR",
            });
          }
        }

        return {
          problems,
          data: {
            minimum,
            fastest,
            halfHour,
            hour,
          },
        };
      } catch (error) {
        logger.error(error);
        return {
          problems: [
            ...problems,
            {
              message: "Failed to fetch fees",
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
