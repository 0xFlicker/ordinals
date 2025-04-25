// groupings.ts
import { Tx } from "@cmdcode/tapscript";
import {
  generateRevealTransactionDataIteratively,
  RevealTransactionFeeDestination,
  RevealTransactionFeeRateRange,
  RevealTransactionInput,
  RevealTransactionParentTx,
  TransactionTooLargeError,
} from "./reveal.js";
import { getFinalFees, getUniqueParentInscriptions } from "./aggregators.js";

/**
 * InscriptionFunding represents a funding record.
 */
export type InscriptionFunding = {
  id: string;
  sizeEstimate: number; // estimated size (computed externally)
  parentInscriptionId?: string;
  fundedAt: Date;
  inputs: RevealTransactionInput[];
  parentTxs?: RevealTransactionParentTx[];
  feeDestinations?: RevealTransactionFeeDestination[];
  feeTarget?: number;
};

/**
 * GroupableFunding is a funding that can be grouped.
 */
export type GroupableFunding = {
  id: string;
  sizeEstimate: number; // estimated size (computed externally)
  fundedAt: Date;
  parentInscriptionId?: string;
  input: RevealTransactionInput;
  feeDestinations: RevealTransactionFeeDestination[];
  parentTx?: RevealTransactionParentTx;
  feeTarget?: number;
};

/**
 * RevealedTransaction holds a successfully validated batch.
 */
export type RevealedTransaction = {
  fundings: InscriptionFunding[];
  hex: string;
};

/**
 * GroupingResult is the complete output of the grouping algorithm.
 */
export interface GroupingResult {
  // For fundings with a parent inscription, we produce one primary batch per parent.
  nextParentInscription: Record<string, RevealedTransaction>;
  // Additional batches for a parent (if more than one valid batch is formed) are stored here.
  laterParentInscription: Record<string, RevealedTransaction[]>;
  // Non-parent fundings are grouped by fee destinations (the set of all fee destinations).
  feeDestinationGroups: Record<string, RevealedTransaction[]>;
  // Fundings that are too recent (<15 minutes old) and must wait.
  laterFundings: GroupableFunding[];
  // Fundings that cannot form a valid batch even on their own.
  rejectedFundings: InscriptionFunding[];
}

const MAX_BATCH_SIZE = 100000; // 100K size threshold
const RECENT_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Returns the size of a funding.
 */
export function sizeOfTransaction(funding: InscriptionFunding): number {
  return funding.sizeEstimate;
}

/**
 * validateBatch aggregates unique inputs, parentTxs, and feeDestinations from the candidate fundings,
 * then tries to generate a reveal transaction. If the transaction's size (vsize * 4) is within MAX_BATCH_SIZE,
 * returns an object with tx hex and fee info; otherwise returns false.
 */
export function validateBatch(
  fundings: InscriptionFunding[],
  feeRateRange: RevealTransactionFeeRateRange,
):
  | false
  | {
      hex: string;
      platformFee: number;
      minerFee: number;
      underpriced?: boolean;
    } {
  const uniqueParentTxs = getUniqueParentInscriptions(fundings);

  try {
    const tx = generateRevealTransactionDataIteratively({
      feeRateRange,
      inputs: fundings.flatMap((f) => f.inputs),
      parentTxs: uniqueParentTxs,
      ...getFinalFees(fundings),
    });
    const { size } = Tx.util.getTxSize(tx.txData);
    if (size > MAX_BATCH_SIZE) {
      throw new TransactionTooLargeError();
    }
    return {
      hex: Tx.encode(tx.txData).hex,
      platformFee: tx.platformFee,
      minerFee: tx.minerFee,
      underpriced: tx.underpriced,
    };
  } catch (e) {
    console.error("Error validating batch:", e);
    return false;
  }
}

/**
 * Generates a grouping key for non-parent fundings based on feeDestinations.
 * If none are provided, returns "nofee".
 */
function feeDestinationsKey(
  funding: GroupableFunding | InscriptionFunding,
): string {
  const sorted =
    funding.feeDestinations
      ?.slice()
      .sort((a, b) => a.address.localeCompare(b.address)) ?? [];
  return JSON.stringify(sorted);
}

function createNewInscriptionFunding(
  funding: GroupableFunding,
): InscriptionFunding {
  return {
    inputs: [funding.input],
    fundedAt: funding.fundedAt,
    id: funding.id,
    sizeEstimate: funding.sizeEstimate,
    ...(funding.parentTx ? { parentTxs: [funding.parentTx] } : {}),
    feeDestinations: funding.feeDestinations,
    ...(funding.feeTarget ? { feeTarget: funding.feeTarget } : {}),
  };
}

function canJoinBatch(
  batch: InscriptionFunding,
  funding: GroupableFunding,
  feeRateRange: RevealTransactionFeeRateRange,
): boolean {
  // Add the funding to the batch and validate the batch.
  // first clone the batch
  const newBatch = {
    ...batch,
  };
  newBatch.inputs.push(funding.input);
  newBatch.feeTarget = funding.feeTarget
    ? funding.feeTarget + (batch.feeTarget ?? 0)
    : funding.feeTarget;
  return !!validateBatch([newBatch], feeRateRange);
}

/**
 * groupFundings implements the grouping logic:
 * - Fundings with a parent inscription are processed first: for each parent, the oldest valid batch is stored
 *   in nextParentInscription; additional batches go to laterParentInscription.
 * - Non-parent fundings are grouped by fee destination sets.
 * - Fundings that are recent (<15 minutes old) are placed into laterFundings.
 * - Fundings that can't form a valid batch even on their own are rejected.
 */
export function groupFundings(
  fundings: GroupableFunding[],
  feeRateRange: RevealTransactionFeeRateRange,
  recentThreshold: number = RECENT_THRESHOLD,
): GroupingResult {
  const now = Date.now();

  const laterFundings: GroupableFunding[] = [];
  const rejectedFundings: InscriptionFunding[] = [];
  const nextParentInscription: Record<string, RevealedTransaction> = {};
  const laterParentInscription: Record<string, RevealedTransaction[]> = {};
  const feeDestinationGroups: Record<string, RevealedTransaction[]> = {};

  // Separate parent and non-parent fundings.
  const parentFundings = fundings.filter((f) => f.parentInscriptionId);
  const nonParentFundings = fundings.filter((f) => !f.parentInscriptionId);

  // Process fundings with parentInscriptionId.
  const parentGroups = new Map<string, InscriptionFunding[]>();
  for (const f of parentFundings) {
    if (now - f.fundedAt.getTime() < recentThreshold) {
      laterFundings.push(f);
      continue;
    }
    const key = f.parentInscriptionId!;
    if (!parentGroups.has(key)) {
      parentGroups.set(key, [createNewInscriptionFunding(f)]);
    } else {
      // look for a batch that we can join
      const batch = parentGroups.get(key)!;
      let joined = false;
      for (const b of batch) {
        if (canJoinBatch(b, f, feeRateRange)) {
          b.inputs.push(f.input);
          b.feeTarget = f.feeTarget
            ? f.feeTarget + (b.feeTarget ?? 0)
            : f.feeTarget;
          b.sizeEstimate += f.sizeEstimate;
          b.feeDestinations = [
            ...(b.feeDestinations || []),
            ...(f.feeDestinations || []),
          ];
          joined = true;
          break;
        }
      }
      if (!joined) {
        batch.push(createNewInscriptionFunding(f));
      }
    }
  }

  for (const [parentId, group] of parentGroups.entries()) {
    group.sort((a, b) => {
      const timeDiff = a.fundedAt.getTime() - b.fundedAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return sizeOfTransaction(b) - sizeOfTransaction(a);
    });
    const batches: RevealedTransaction[] = [];
    let currentBatch: InscriptionFunding[] = [];
    let currentSize = 0;
    for (const funding of group) {
      const fundSize = sizeOfTransaction(funding);
      if (!currentBatch.length) {
        if (!validateBatch([funding], feeRateRange)) {
          rejectedFundings.push(funding);
          continue;
        }
        currentBatch.push(funding);
        currentSize = fundSize;
      } else {
        if (currentSize + fundSize > MAX_BATCH_SIZE) {
          const validated = validateBatch(currentBatch, feeRateRange);
          if (validated) {
            batches.push({ fundings: [...currentBatch], hex: validated.hex });
          } else {
            currentBatch.forEach((f) => rejectedFundings.push(f));
          }
          currentBatch = [];
          currentSize = 0;
          if (validateBatch([funding], feeRateRange)) {
            currentBatch.push(funding);
            currentSize = fundSize;
          } else {
            rejectedFundings.push(funding);
          }
        } else {
          const candidate = [...currentBatch, funding];
          const validated = validateBatch(candidate, feeRateRange);
          if (validated) {
            currentBatch.push(funding);
            currentSize += fundSize;
          } else {
            const batchValidated = validateBatch(currentBatch, feeRateRange);
            if (batchValidated) {
              batches.push({
                fundings: [...currentBatch],
                hex: batchValidated.hex,
              });
            } else {
              currentBatch.forEach((f) => rejectedFundings.push(f));
            }
            if (validateBatch([funding], feeRateRange)) {
              currentBatch = [funding];
              currentSize = fundSize;
            } else {
              rejectedFundings.push(funding);
              currentBatch = [];
              currentSize = 0;
            }
          }
        }
      }
    }
    if (currentBatch.length) {
      const validated = validateBatch(currentBatch, feeRateRange);
      if (validated) {
        batches.push({ fundings: [...currentBatch], hex: validated.hex });
      } else {
        currentBatch.forEach((f) => rejectedFundings.push(f));
      }
    }
    if (batches.length > 0) {
      nextParentInscription[parentId] = batches[0];
      if (batches.length > 1) {
        laterParentInscription[parentId] = batches.slice(1);
      }
    }
  }

  // Process non-parent fundings grouped by feeDestinations.
  const feeGroups = new Map<string, InscriptionFunding[]>();
  for (const f of nonParentFundings) {
    if (now - f.fundedAt.getTime() < recentThreshold) {
      laterFundings.push(f);
      continue;
    }
    const key = feeDestinationsKey(f);
    if (!feeGroups.has(key)) {
      feeGroups.set(key, [createNewInscriptionFunding(f)]);
    } else {
      // look for a batch that we can join
      const batch = feeGroups.get(key)!;
      let joined = false;
      for (const b of batch) {
        if (canJoinBatch(b, f, feeRateRange)) {
          b.inputs.push(f.input);
          b.feeTarget = f.feeTarget
            ? f.feeTarget + (b.feeTarget ?? 0)
            : f.feeTarget;
          joined = true;
          b.sizeEstimate += f.sizeEstimate;
          b.feeDestinations = [
            ...(b.feeDestinations || []),
            ...(f.feeDestinations || []),
          ];
          break;
        }
      }
      if (!joined) {
        batch.push(createNewInscriptionFunding(f));
      }
    }
  }

  for (const [key, group] of feeGroups.entries()) {
    group.sort((a, b) => {
      const timeDiff = a.fundedAt.getTime() - b.fundedAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return sizeOfTransaction(b) - sizeOfTransaction(a);
    });
    let currentBatch: InscriptionFunding[] = [];
    let currentSize = 0;
    const batches: RevealedTransaction[] = [];
    for (const funding of group) {
      const fundSize = sizeOfTransaction(funding);
      if (!currentBatch.length) {
        if (!validateBatch([funding], feeRateRange)) {
          rejectedFundings.push(funding);
          continue;
        }
        currentBatch.push(funding);
        currentSize = fundSize;
      } else {
        if (currentSize + fundSize > MAX_BATCH_SIZE) {
          const validated = validateBatch(currentBatch, feeRateRange);
          if (validated) {
            const batchCopy: InscriptionFunding[] = currentBatch.map(
              (funding) => ({
                inputs: [...funding.inputs],
                fundedAt: funding.fundedAt,
                id: funding.id,
                sizeEstimate: funding.sizeEstimate,
                feeDestinations: [...(funding.feeDestinations || [])],
                feeTarget: funding.feeTarget,
                parentInscriptionId: funding.parentInscriptionId,
                parentTxs: [...(funding.parentTxs || [])],
              }),
            );
            batches.push({ fundings: batchCopy, hex: validated.hex });
          } else {
            currentBatch.forEach((f) => rejectedFundings.push(f));
          }
          currentBatch = [];
          currentSize = 0;
          if (validateBatch([funding], feeRateRange)) {
            currentBatch.push(funding);
            currentSize = fundSize;
          } else {
            rejectedFundings.push(funding);
          }
        } else {
          const candidate = [...currentBatch, funding];
          const validated = validateBatch(candidate, feeRateRange);
          if (validated) {
            currentBatch.push(funding);
            currentSize += fundSize;
          } else {
            const batchValidated = validateBatch(currentBatch, feeRateRange);
            if (batchValidated) {
              batches.push({
                fundings: [...currentBatch],
                hex: batchValidated.hex,
              });
            } else {
              currentBatch.forEach((f) => rejectedFundings.push(f));
            }
            if (validateBatch([funding], feeRateRange)) {
              currentBatch = [funding];
              currentSize = fundSize;
            } else {
              rejectedFundings.push(funding);
              currentBatch = [];
              currentSize = 0;
            }
          }
        }
      }
    }
    if (currentBatch.length) {
      const validated = validateBatch(currentBatch, feeRateRange);
      if (validated) {
        const batchCopy: InscriptionFunding[] = currentBatch.map((funding) => ({
          inputs: [...funding.inputs],
          fundedAt: funding.fundedAt,
          id: funding.id,
          sizeEstimate: funding.sizeEstimate,
          feeDestinations: [...(funding.feeDestinations || [])],
          feeTarget: funding.feeTarget,
          parentInscriptionId: funding.parentInscriptionId,
          parentTxs: [...(funding.parentTxs || [])],
        }));
        batches.push({ fundings: batchCopy, hex: validated.hex });
      } else {
        currentBatch.forEach((f) => rejectedFundings.push(f));
      }
    }
    feeDestinationGroups[key] = batches;
  }

  return {
    nextParentInscription,
    laterParentInscription,
    feeDestinationGroups,
    laterFundings,
    rejectedFundings,
  };
}
