import { BitcoinNetworkNames } from "@0xflick/ordinals-models";
import { JsonRpcResponse, estimateSmartFeeBatch } from "../index.js";
import { createLogger } from "../index.js";
import { bitcoinToSats, satsToBitcoin } from "@0xflick/inscriptions";

const logger = createLogger({ name: "fee-cache" });

export interface IFeesRecommended {
  fastest: number;
  halfHour: number;
  hour: number;
  minimum: number;
}

// Cache for fee estimates by network
const feeCache: Partial<
  Record<
    BitcoinNetworkNames,
    {
      fees: IFeesRecommended;
      timestamp: number;
    }
  >
> = {};

// Cache expiration time in milliseconds (10 seconds)
const CACHE_EXPIRATION = 10 * 1000;

/**
 * Helper function to get fee estimates for a network with caching
 * @param network The Bitcoin network (mainnet, testnet, regtest)
 * @returns Fee estimates for the network
 */
export async function getFeeEstimates(network: BitcoinNetworkNames): Promise<{
  problems?: string[];
  fees?: IFeesRecommended;
}> {
  const now = Date.now();
  const cachedData = feeCache[network];

  // Return cached data if it exists and hasn't expired
  if (cachedData && now - cachedData.timestamp < CACHE_EXPIRATION) {
    logger.info({ network, cached: true }, "Using cached fee estimates");
    return {
      fees: cachedData.fees,
    };
  }

  try {
    const results = await estimateSmartFeeBatch(
      [
        { conf_target: 1, estimate_mode: "ECONOMICAL" },
        { conf_target: 2, estimate_mode: "ECONOMICAL" },
        { conf_target: 6, estimate_mode: "ECONOMICAL" },
        { conf_target: 12, estimate_mode: "ECONOMICAL" },
      ],
      network,
    );
    let [
      {
        result: { feerate: fastest, errors: fastestErrors },
      },
      {
        result: { feerate: halfHour, errors: halfHourErrors },
      },
      {
        result: { feerate: hour, errors: hourErrors },
      },
      {
        result: { feerate: minimum, errors: minimumErrors },
      },
    ]: JsonRpcResponse<{
      feerate: number;
      errors?: string[] | null;
    }>[] = results;
    fastestErrors =
      fastestErrors && fastestErrors.length > 0 ? fastestErrors : null;
    halfHourErrors =
      halfHourErrors && halfHourErrors.length > 0 ? halfHourErrors : null;
    hourErrors = hourErrors && hourErrors.length > 0 ? hourErrors : null;
    minimumErrors =
      minimumErrors && minimumErrors.length > 0 ? minimumErrors : null;

    function rpcFeeRateToSatPerByte(feeRate: number) {
      return Math.ceil(Number(bitcoinToSats(feeRate.toString())) / 1000);
    }

    function checkErrors(
      errors: string[] | null,
      feeRate: number,
    ): [null | string[], number] {
      if (errors?.length && errors.length > 0) {
        if (errors.some((error) => error.includes("no feerate found"))) {
          return [null, 1];
        } else {
          return [errors, rpcFeeRateToSatPerByte(feeRate)];
        }
      }
      return [null, rpcFeeRateToSatPerByte(feeRate)];
    }

    [minimumErrors, minimum] = checkErrors(minimumErrors, minimum);
    [halfHourErrors, halfHour] = checkErrors(halfHourErrors, halfHour);
    [hourErrors, hour] = checkErrors(hourErrors, hour);
    [fastestErrors, fastest] = checkErrors(fastestErrors, fastest);

    const problems: string[] = [];

    if (minimumErrors?.length && minimumErrors.length > 0) {
      if (minimumErrors.some((error) => error.includes("no feerate found"))) {
        minimum = 1;
      } else {
        problems.push(...minimumErrors);
      }
    }
    if (halfHourErrors?.length && halfHourErrors.length > 0) {
      if (halfHourErrors.some((error) => error.includes("no feerate found"))) {
        halfHour = 1;
      } else {
        problems.push(...halfHourErrors);
      }
    }
    if (hourErrors?.length && hourErrors.length > 0) {
      if (hourErrors.some((error) => error.includes("no feerate found"))) {
        hour = 1;
      } else {
        problems.push(...hourErrors);
      }
    }
    if (fastestErrors?.length && fastestErrors.length > 0) {
      if (fastestErrors.some((error) => error.includes("no feerate found"))) {
        fastest = 1;
      } else {
        problems.push(...fastestErrors);
      }
    }

    return {
      ...(problems.length > 0 ? { problems } : {}),
      fees: {
        fastest,
        halfHour,
        hour,
        minimum,
      },
    };
  } catch (error: any) {
    logger.error(error);
    return {
      problems: error.message ? [error.message] : ["Something went wrong"],
    };
  }
}
