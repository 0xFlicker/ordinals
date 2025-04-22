import { InscriptionFunding } from "./index.js";
import {
  RevealTransactionFeeDestination,
  RevealTransactionParentTx,
} from "./reveal.js";

export function getFinalFees(fundings: InscriptionFunding[]): {
  feeDestinations?: RevealTransactionFeeDestination[];
  feeTarget?: number;
} {
  // Map to store unique destinations and their occurrence count
  const destinationCounts = new Map<
    string,
    { dest: RevealTransactionFeeDestination; count: number }
  >();
  let totalFeeTarget = 0;

  // Collect all fee destinations and count their occurrences
  for (const funding of fundings) {
    if (funding.feeTarget) {
      totalFeeTarget += funding.feeTarget;
    }

    for (const dest of funding.feeDestinations || []) {
      const key = JSON.stringify(dest);
      if (destinationCounts.has(key)) {
        // Increment count for existing destination
        const existing = destinationCounts.get(key)!;
        existing.count += 1;
      } else {
        // Add new destination with count 1
        destinationCounts.set(key, { dest, count: 1 });
      }
    }
  }

  // If there are no fee destinations, return undefined
  if (destinationCounts.size === 0) {
    return {};
  }

  // Calculate the total weight considering occurrence counts
  const totalWeight = Array.from(destinationCounts.values()).reduce(
    (sum, { dest, count }) => sum + dest.weight * count,
    0,
  );

  // Normalize the weights if they don't sum to 100, considering occurrence counts
  const normalizedDestinations = Array.from(destinationCounts.values()).map(
    ({ dest, count }) => ({
      ...dest,
      weight: Math.round(((dest.weight * count) / totalWeight) * 100),
    }),
  );

  return {
    feeDestinations: normalizedDestinations,
    feeTarget: totalFeeTarget,
  };
}

/**
 * Gets all unique parent inscriptions from all fundings
 * @returns Array of unique parent inscriptions
 */
export function getUniqueParentInscriptions(
  fundings: InscriptionFunding[],
): RevealTransactionParentTx[] {
  const uniqueParentInscriptions = new Map<string, RevealTransactionParentTx>();
  for (const funding of fundings) {
    for (const ptx of funding.parentTxs || []) {
      const key = `${ptx.vin.txid}:${ptx.vin.vout}`;
      if (!uniqueParentInscriptions.has(key)) {
        uniqueParentInscriptions.set(key, ptx);
      }
    }
  }

  return Array.from(uniqueParentInscriptions.values());
}
