import { MempoolClient } from "./mempool.js";
import { BitcoinNetworkNames } from "@0xflick/ordinals-models";
import { createLogger } from "../index.js";
import { createMempoolBitcoinClient } from "./mempool.js";

const logger = createLogger({ name: "fee-cache" });

export type IFeesRecommended = Awaited<
  ReturnType<MempoolClient["bitcoin"]["fees"]["getFeesRecommended"]>
>;

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
export async function getFeeEstimates(
  network: BitcoinNetworkNames,
): Promise<IFeesRecommended> {
  const now = Date.now();
  const cachedData = feeCache[network];

  // Return cached data if it exists and hasn't expired
  if (cachedData && now - cachedData.timestamp < CACHE_EXPIRATION) {
    logger.info({ network, cached: true }, "Using cached fee estimates");
    return cachedData.fees;
  }

  // Get fresh fee estimates
  logger.info({ network, cached: false }, "Fetching fresh fee estimates");
  const mempoolBitcoinClient = createMempoolBitcoinClient({ network });
  const fees = await mempoolBitcoinClient.fees.getFeesRecommended();

  // Update cache
  feeCache[network] = {
    fees,
    timestamp: now,
  };

  return fees;
}

export async function estimateFees(
  mempool: MempoolClient["bitcoin"],
): Promise<IFeesRecommended> {
  const fees = await mempool.fees.getFeesRecommended();
  return fees;
}
