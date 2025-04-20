import {
  Address,
  OutputData,
  Script,
  Signer,
  Tap,
  Tx,
  TxData,
  TxTemplate,
} from "@cmdcode/tapscript";
import { get_pubkey, get_seckey } from "@cmdcode/crypto-tools/keys";
import { CannotFitInscriptionsError } from "./errors.js";
import { BitcoinScriptData } from "./types.js";
import { serializedScriptToScriptData } from "./utils.js";

export interface RevealTransactionInput {
  leaf: string;
  tapkey: string;
  cblock: string;
  rootTapKey: string;
  script: BitcoinScriptData[];
  vout: number;
  txid: string;
  amount: number;
  secKey: Uint8Array;
  padding: number;
  inscriptions: {
    destinationAddress: string;
  }[];
}

export type RevealTransactionParentTx = Omit<TxTemplate, "vin"> & {
  vin: Required<TxTemplate>["vin"]["0"];
  value: number;
  secKey: Uint8Array;
  destinationAddress: string;
};

export type RevealTransactionFeeDestination = {
  address: string;
  weight: number;
};

export type RevealTransactionFeeRateRange = [number, number];

export interface RevealTransactionRequest {
  inputs: RevealTransactionInput[];

  parentTxs?: RevealTransactionParentTx[];

  feeDestinations?: RevealTransactionFeeDestination[];

  readonly feeRateRange: RevealTransactionFeeRateRange; // sats/vbyte [highest, lowest]
  readonly feeTarget?: number; // in sats, if not provided, the fee will be paid to the miners
}

export function generateRevealTransaction({
  inputs,
  parentTxs,
  feeDestinations,
  feeRateRange,
}: RevealTransactionRequest): {
  hex: string;
  platformFee: number;
  minerFee: number;
  underpriced?: boolean;
} {
  const result = generateRevealTransactionDataIteratively({
    inputs,
    parentTxs,
    feeDestinations,
    feeRateRange,
  });
  return {
    hex: Tx.encode(result.txData).hex,
    platformFee: result.platformFee,
    underpriced: result.underpriced,
    minerFee: result.minerFee,
  };
}
export function generateRevealTransactionDataIteratively(
  request: RevealTransactionRequest,
): {
  txData: TxData;
  feeRate: number;
  platformFee: number;
  underpriced?: boolean;
  minerFee: number;
} {
  // Validate that all inputs have at least one inscription
  if (request.inputs.some((input) => !input.inscriptions?.length)) {
    throw new CannotFitInscriptionsError(
      "All inputs must have at least one inscription",
    );
  }

  const [highestFeeRate, lowestFeeRate] = request.feeRateRange;

  // PHASE 1: Quick check at highestFeeRate
  let attemptHighest = buildTxAtFeeRate(
    request,
    highestFeeRate,
    [100, 0],
    false,
  );
  if (attemptHighest) {
    // Verify with real signatures
    const verifiedTx = verifyAndSignTx(attemptHighest.txData, request);
    if (verifiedTx) {
      return {
        txData: verifiedTx,
        feeRate: highestFeeRate,
        platformFee: attemptHighest.platformFee,
        minerFee: attemptHighest.minerFee,
      };
    }
  }

  // PHASE 2: Binary Search in [lowestFeeRate, highestFeeRate - 1]
  const bestWithHighestFees = binarySearchHighestFeasible(
    request,
    [lowestFeeRate, highestFeeRate - 1],
    [75, 100],
  );
  if (bestWithHighestFees) {
    const verifiedTx = verifyAndSignTx(bestWithHighestFees.txData, request);
    if (verifiedTx) {
      return {
        ...bestWithHighestFees,
        txData: verifiedTx,
      };
    }
  }

  // PHASE 2.5: Now look for lower platform fees
  const bestWithLowerFees = binarySearchHighestFeasible(
    request,
    [lowestFeeRate, highestFeeRate - 1],
    [0, 75],
  );
  if (bestWithLowerFees) {
    const verifiedTx = verifyAndSignTx(bestWithLowerFees.txData, request);
    if (verifiedTx) {
      return {
        ...bestWithLowerFees,
        txData: verifiedTx,
      };
    }
  }

  // PHASE 3: Try without platform fees
  // 3a) Quick check at highestFeeRate again, but no fees
  const requestWithoutFees: RevealTransactionRequest = {
    ...request,
    feeDestinations: undefined,
  };
  const attemptNoFeesHighest = buildTxAtFeeRate(
    requestWithoutFees,
    highestFeeRate,
    [0, 100],
    false,
  );
  if (attemptNoFeesHighest) {
    const verifiedTx = verifyAndSignTx(
      attemptNoFeesHighest.txData,
      requestWithoutFees,
    );
    if (verifiedTx) {
      return {
        txData: verifiedTx,
        feeRate: highestFeeRate,
        platformFee: 0,
        underpriced: true,
        minerFee: attemptNoFeesHighest.minerFee,
      };
    }
  }

  // 3b) Binary Search with no fees
  const bestNoFees = binarySearchHighestFeasible(
    requestWithoutFees,
    [lowestFeeRate, highestFeeRate - 1],
    [0, 100],
  );
  if (bestNoFees) {
    const verifiedTx = verifyAndSignTx(bestNoFees.txData, requestWithoutFees);
    if (verifiedTx) {
      return {
        ...bestNoFees,
        txData: verifiedTx,
        platformFee: 0,
        underpriced: true,
      };
    }
  }

  // If everything fails
  throw new CannotFitInscriptionsError();
}

export class TransactionTooLargeError extends Error {
  constructor() {
    super("Transaction size exceeds system limits");
    this.name = "TransactionTooLargeError";
  }
}

function buildTxAtFeeRate(
  request: RevealTransactionRequest,
  feeRate: number,
  platformFeeRange: [number, number],
  withRealSignatures = false,
): { txData: TxData; platformFee: number; minerFee: number } | null {
  const { txSkeleton, witnessSigners } = buildSkeleton(request);

  // Validate that all required outputs are present
  const expectedOutputCount =
    (request.parentTxs?.length || 0) +
    request.inputs.reduce((sum, input) => sum + input.inscriptions.length, 0);

  if (txSkeleton.vout.length !== expectedOutputCount) {
    throw new CannotFitInscriptionsError(
      "Failed to create all required inscription outputs",
    );
  }

  // Build initial skeleton to get accurate size estimate
  attachDummyWitnesses(txSkeleton, request);

  // Add dummy outputs for size estimation (one for each potential fee destination)
  const dummyOutputs = request.feeDestinations?.map(() => ({
    value: 1000,
    scriptPubKey: ["OP_1", "0".repeat(64)], // dummy P2TR output
  })) || [
    {
      value: 1000,
      scriptPubKey: ["OP_1", "0".repeat(64)], // dummy P2TR output
    },
  ];
  txSkeleton.vout.push(...dummyOutputs);

  // Remove the dummy outputs before proceeding
  txSkeleton.vout.splice(-dummyOutputs.length);

  // If using real signatures, sign the transaction
  if (withRealSignatures) {
    signAllVin(txSkeleton, witnessSigners);
  }

  // Continue with fee calculations...

  // 3) Estimate base size and compute minimal miner fee
  let baseVSize = 0;
  try {
    baseVSize = Tx.util.getTxSize(txSkeleton).vsize;
  } catch {
    console.log(
      "Invalid or can't estimate",
      JSON.stringify(txSkeleton, null, 2),
    );
    return null;
  }
  const baseMinerFee = Math.ceil(feeRate * baseVSize);

  // 4) Check that we have enough input to pay for required padding + base miner fee
  const totalInputAmount = getTotalInputAmount(request);
  const requiredPadding = getRequiredPaddingAmount(request);
  if (totalInputAmount < requiredPadding + baseMinerFee) {
    return null;
  }

  // 5) If no feeDestinations, verify we can cover miner fee
  const leftoverForFees = totalInputAmount - requiredPadding;
  if (!request.feeDestinations || request.feeDestinations.length === 0) {
    // Verify the transaction with real signatures if requested
    if (withRealSignatures) {
      signAllVin(txSkeleton, witnessSigners);
    }

    // Verify final size and fee
    let finalVSize = 0;
    try {
      finalVSize = Tx.util.getTxSize(txSkeleton).vsize;
    } catch {
      return null;
    }
    const finalMinerFee = Math.ceil(feeRate * finalVSize);

    // Ensure we can cover the final miner fee
    if (leftoverForFees < finalMinerFee) {
      return null;
    }

    return { txData: txSkeleton, platformFee: 0, minerFee: finalMinerFee };
  }

  // 6) Try platform-fee distributions
  let [maxPlatformFeePercent, minPlatformFeePercent] = platformFeeRange;
  // swap if low is higher than high
  if (minPlatformFeePercent > maxPlatformFeePercent) {
    [maxPlatformFeePercent, minPlatformFeePercent] = [
      minPlatformFeePercent,
      maxPlatformFeePercent,
    ];
  }
  const step = 5;
  const feePercentCandidates: number[] = [];
  for (
    let percent = maxPlatformFeePercent;
    percent >= minPlatformFeePercent;
    percent -= step
  ) {
    feePercentCandidates.push(percent);
  }
  for (const platformFeePercent of feePercentCandidates) {
    const maybeTxData = tryPlatformFeeDistribution(
      txSkeleton,
      witnessSigners,
      leftoverForFees,
      baseMinerFee,
      request.feeDestinations,
      feeRate,
      platformFeePercent,
      request.feeTarget,
      withRealSignatures,
    );
    if (maybeTxData) {
      return {
        ...maybeTxData,
        minerFee: baseMinerFee,
      };
    }
  }

  return null;
}

function attachDummyWitnesses(
  txData: TxData,
  request: RevealTransactionRequest,
) {
  request.parentTxs?.forEach((_, i) => {
    txData.vin[i].witness = ["00".repeat(64)];
  });

  // For inscription inputs - signature + script + control block
  let offset = request.parentTxs?.length ?? 0;
  request.inputs.forEach((input, i) => {
    txData.vin[offset + i].witness = [
      "00".repeat(64),
      serializedScriptToScriptData(input.script),
      input.cblock,
    ];
  });
}

function verifyAndSignTx(
  txData: TxData,
  request: RevealTransactionRequest,
): TxData | null {
  const { txSkeleton, witnessSigners } = buildSkeleton(request);
  txSkeleton.vout = txData.vout; // Copy outputs from candidate

  // Sign with real signatures
  signAllVin(txSkeleton, witnessSigners);

  return txSkeleton;
}

/**
 * Attempts a specific platform fee distribution given a transaction skeleton.
 * Returns a signed TxData if successful, or null if not feasible.
 */
function tryPlatformFeeDistribution(
  skeleton: TxData,
  witnessSigners: Array<() => TxData["vin"][number]["witness"]>,
  leftover: number,
  minerFee: number,
  feeDestinations: { address: string; weight: number }[],
  feeRate: number,
  platformFeePercent: number,
  feeTarget?: number,
  withRealSignatures = false,
): { txData: TxData; platformFee: number } | null {
  // Clone the skeleton so we don't mutate the original
  const tempTxData: TxData = {
    version: skeleton.version,
    locktime: skeleton.locktime,
    vin: skeleton.vin.map((vin) => ({ ...vin })),
    vout: [...skeleton.vout], // shallow copy
  };

  const totalWeight = feeDestinations.reduce((s, d) => s + d.weight, 0);
  const allocatedToPlatform =
    (leftover - minerFee) * (platformFeePercent / 100);

  // Build platform outputs
  const platformOutputs = feeDestinations.map((dest) => {
    const share = Math.floor((allocatedToPlatform * dest.weight) / totalWeight);
    return {
      value: share,
      scriptPubKey: Address.p2tr.scriptPubKey(
        Address.p2tr.decode(dest.address),
      ),
    } as OutputData;
  });

  // Add platform outputs temporarily
  tempTxData.vout.push(...platformOutputs);

  // Sign or use dummy witnesses for size estimation
  if (withRealSignatures) {
    signAllVin(tempTxData, witnessSigners);
  }

  // Recalculate final size + total fee at the new outputs
  let newVSize = 0;
  try {
    newVSize = Tx.util.getTxSize(tempTxData).vsize;
  } catch {
    tempTxData.vout.splice(-platformOutputs.length);
    return null;
  }
  // Add a 2% buffer to ensure we meet relay fees
  const totalFeeNeeded = Math.ceil(feeRate * newVSize * 1.02);

  // If leftover can't cover total fees, revert and return null
  if (leftover < totalFeeNeeded) {
    tempTxData.vout.splice(-platformOutputs.length);
    return null;
  }

  // FIX: Recalculate platform outputs with actual available amount
  const actualAvailableForPlatform = leftover - totalFeeNeeded;
  const actualPlatformFee = Math.floor(
    actualAvailableForPlatform * (platformFeePercent / 100),
  );

  // Update platform output values
  platformOutputs.forEach((output, i) => {
    const share = Math.floor(
      (actualPlatformFee * feeDestinations[i].weight) / totalWeight,
    );
    tempTxData.vout[tempTxData.vout.length - platformOutputs.length + i].value =
      share;
  });

  // Optionally check target platform fee if feeTarget was set
  const actualPlatformFeeWithTarget =
    actualPlatformFee - (totalFeeNeeded - minerFee);
  if (feeTarget && actualPlatformFeeWithTarget < feeTarget * 0.75) {
    tempTxData.vout.splice(-platformOutputs.length);
    return null;
  }

  return { txData: tempTxData, platformFee: actualPlatformFee };
}

/** Build a base transaction skeleton with mandatory inputs/outputs only. */
export function buildSkeleton(request: RevealTransactionRequest): {
  txSkeleton: TxData;
  witnessSigners: Array<() => TxData["vin"][number]["witness"]>;
} {
  const { inputs, parentTxs } = request;

  const witnessSigners: Array<() => TxData["vin"][number]["witness"]> = [];
  const vin: TxTemplate["vin"] = [];
  const vout: TxTemplate["vout"] = [];

  for (let i = 0; i < (parentTxs?.length ?? 0); i++) {
    const parentTx = parentTxs![i];
    const index = i;
    const pubKey = get_pubkey(parentTx.secKey, true);
    const script = [pubKey, "OP_CHECKSIG"];
    const sbytes = Script.encode(script);
    const tapleaf = Tap.tree.getLeaf(sbytes);
    const [tPub, cBlock] = Tap.getPubKey(pubKey, {
      target: tapleaf,
    });
    witnessSigners.push(() => {
      const sig = Signer.taproot.sign(parentTx.secKey, txSkeleton, index, {
        extension: tapleaf,
      });
      return [sig.hex, script, cBlock];
    });
    vin.push({
      ...parentTx.vin,
      prevout: {
        value: parentTx.value,
        scriptPubKey: ["OP_1", tPub],
      },
    });
    vout.push({
      value: parentTx.value,
      scriptPubKey: Address.toScriptPubKey(parentTx.destinationAddress),
    });
  }

  // Inputs & Inscriptions
  let indexOffset = parentTxs?.length ?? 0;
  for (let i = indexOffset; i < inputs.length + indexOffset; i++) {
    const input = inputs[i - indexOffset];
    witnessSigners.push(() => {
      const sig = Signer.taproot.sign(input.secKey, txSkeleton, i, {
        extension: input.leaf,
      });
      return [
        sig.hex,
        serializedScriptToScriptData(input.script),
        input.cblock,
      ];
    });

    vin.push({
      txid: input.txid,
      vout: input.vout,
      prevout: {
        value: input.amount,
        scriptPubKey: ["OP_1", input.rootTapKey],
      },
    });

    for (const inscription of input.inscriptions) {
      vout.push({
        value: input.padding,
        scriptPubKey: [
          "OP_1",
          Address.p2tr.decode(inscription.destinationAddress).hex,
        ],
      });
    }
  }

  const txSkeleton: TxData = Tx.create({ vin, vout });
  return { txSkeleton, witnessSigners };
}

/** Signs all vin with the stored witness signers. */
export function signAllVin(
  txData: TxData,
  signers: Array<() => TxData["vin"][number]["witness"]>,
) {
  for (let i = 0; i < signers.length; i++) {
    txData.vin[i].witness = signers[i]();
  }
}

/** Sums total input from parentTxs + inputs. */
function getTotalInputAmount(request: RevealTransactionRequest): number {
  const parentAmount =
    request.parentTxs?.reduce((sum, p) => sum + p.value, 0) ?? 0;
  const inputAmount = request.inputs.reduce((sum, inp) => sum + inp.amount, 0);
  return parentAmount + inputAmount;
}

/** Computes required padding from inputs. */
function getRequiredPaddingAmount(request: RevealTransactionRequest): number {
  const totalInscriptions = request.inputs.reduce(
    (acc, i) => acc + i.inscriptions.length * i.padding,
    0,
  );
  let parentPadding = 0;
  for (const pTx of request.parentTxs ?? []) {
    parentPadding += pTx.value;
  }
  return totalInscriptions + parentPadding;
}

/**
 * Finds the highest feasible fee rate in [low, high].
 * Returns null if no feasible rate is found.
 */
function binarySearchHighestFeasible(
  request: RevealTransactionRequest,
  minerFeeRateRange: [number, number],
  platformFeeRange: [number, number],
): {
  txData: TxData;
  feeRate: number;
  platformFee: number;
  minerFee: number;
} | null {
  let best: {
    txData: TxData;
    feeRate: number;
    platformFee: number;
    minerFee: number;
  } | null = null;

  let [minerLow, minerHigh] = minerFeeRateRange;
  // swap if low is higher than high
  if (minerLow > minerHigh) {
    [minerLow, minerHigh] = [minerHigh, minerLow];
  }

  while (minerLow <= minerHigh) {
    // "Upper-biased" midpoint: we push the midpoint up
    const mid = Math.floor((minerLow + minerHigh + 1) / 2);

    const attempt = buildTxAtFeeRate(request, mid, platformFeeRange, false);
    if (attempt) {
      // mid is feasible => record it, move low up
      best = { ...attempt, feeRate: mid };
      minerLow = mid + 1; // search for a higher feasible rate
    } else {
      // mid is not feasible => reduce high
      minerHigh = mid - 1;
    }
  }

  return best;
}
