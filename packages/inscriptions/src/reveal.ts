import {
  Address,
  OutputData,
  Signer,
  Tap,
  Tx,
  TxData,
  TxTemplate,
} from "@0xflick/tapscript";
import * as cryptoUtils from "@0xflick/crypto-utils";
import { CannotFitInscriptionsError } from "./errors.js";
import { BitcoinScriptData, WritableInscription } from "./types.js";
import { serializedScriptToScriptData } from "./utils.js";

export interface RevealTransactionRequest {
  inputs: {
    leaf: string;
    tapkey: string;
    cblock: string;
    script: BitcoinScriptData[];
    vout: number;
    txid: string;
    amount: number;
    address: string;
    secKey: cryptoUtils.SecretKey;
    padding: number;
    inscriptions: WritableInscription[];
  }[];

  parentTxs?: (Omit<TxTemplate, "vin"> & {
    vin: Required<TxTemplate>["vin"]["0"];
    value: number;
    secKey: cryptoUtils.SecretKey;
    destinationAddress: string;
  })[];

  // If you leave this empty, the fee will be paid to the miners
  feeDestinations?: {
    address: string;
    percentage: number; // Percentage of available fee (0-100)
  }[];

  readonly feeRateRange: [number, number]; // sats/vbyte [highest, lowest]
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

/**
 * Tries to build a valid transaction at a given feeRate.
 * Returns TxData if successful, or null if no valid distribution found.
 */
function buildTxAtFeeRate(
  request: RevealTransactionRequest,
  feeRate: number,
  platformFeeRange: [number, number],
  withRealSignatures = false,
): { txData: TxData; platformFee: number; minerFee: number } | null {
  // 1) Build base skeleton: mandatory inputs/outputs for padding and inscriptions
  const { txSkeleton, witnessSigners } = buildSkeleton(request);

  // 2) Attach dummy witnesses for size estimation
  if (!withRealSignatures) {
    attachDummyWitnesses(txSkeleton, request);
  } else {
    signAllVin(txSkeleton, witnessSigners);
  }

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

  // 5) If no feeDestinations, return
  const leftoverForFees = totalInputAmount - requiredPadding;
  if (!request.feeDestinations || request.feeDestinations.length === 0) {
    return { txData: txSkeleton, platformFee: 0, minerFee: baseMinerFee };
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
  const feePercentCandidates = [];
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
  // For parent txs - single signature witnesse
  request.parentTxs?.forEach((_, i) => {
    txData.vin[i].witness = ["00".repeat(64)]; // Dummy signature
  });

  // For inscription inputs - signature + script + control block
  let offset = request.parentTxs?.length ?? 0;
  request.inputs.forEach((input, i) => {
    txData.vin[offset + i].witness = [
      "00".repeat(64), // Dummy signature
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

  // Verify all signatures
  try {
    let offset = request.parentTxs?.length ?? 0;
    request.parentTxs?.forEach((pTx, i) => {
      const pubKey = pTx.secKey.pub.x;
      const [tPub] = Tap.getPubKey(pubKey);
      witnessSigners.push(() => {
        const tapSecKey = Tap.getSecKey(pTx.secKey)[0];

        const sig = Signer.taproot.sign(tapSecKey, txSkeleton, i);

        Signer.taproot.verifyTx(txSkeleton, i, {
          pubkey: tPub,
        });

        return [sig];
      });
    });

    request.inputs.forEach((_, i) => {
      if (!txSkeleton.vin[offset + i].witness?.length) {
        throw new Error("Missing witness data");
      }
    });

    return txSkeleton;
  } catch (e) {
    console.error("Verification failed:", e);
    return null;
  }
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
  feeDestinations: { address: string; percentage: number }[],
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

  const totalPct = feeDestinations.reduce((s, d) => s + d.percentage, 0);
  const allocatedToPlatform =
    (leftover - minerFee) * (platformFeePercent / 100);

  // Build platform outputs
  const platformOutputs = feeDestinations.map((dest) => {
    const share = Math.floor(
      (allocatedToPlatform * dest.percentage) / totalPct,
    );
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
  const totalFeeNeeded = Math.ceil(feeRate * newVSize);

  // If leftover can't cover total fees, revert and return null
  if (leftover < totalFeeNeeded) {
    tempTxData.vout.splice(-platformOutputs.length);
    return null;
  }

  // Optionally check target platform fee if feeTarget was set
  const actualPlatformFee = allocatedToPlatform - (totalFeeNeeded - minerFee);
  if (feeTarget && actualPlatformFee < feeTarget * 0.75) {
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

  // Parent TXs
  parentTxs?.forEach((pTx, i) => {
    const pubKey = pTx.secKey.pub.x;
    const [tPub] = Tap.getPubKey(pubKey);
    witnessSigners.push(() => {
      const tapSecKey = Tap.getSecKey(pTx.secKey)[0];
      const sig = Signer.taproot.sign(tapSecKey, txSkeleton, i);
      Signer.taproot.verifyTx(txSkeleton, i, { pubkey: tPub });
      return [sig];
    });
    vin.push({
      ...pTx.vin,
      prevout: {
        value: pTx.value,
        scriptPubKey: Address.p2tr.scriptPubKey(tPub),
      },
    });
  });

  // Inputs & Inscriptions
  let indexOffset = parentTxs?.length ?? 0;
  inputs.forEach((input, i) => {
    witnessSigners.push(() => {
      const sig = Signer.taproot.sign(
        input.secKey.raw,
        txSkeleton,
        indexOffset + i,
        {
          extension: input.leaf,
        },
      );
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
        scriptPubKey: ["OP_1", input.tapkey],
      },
    });
  });

  // Build base outputs
  const vout: TxTemplate["vout"] = [];

  // Parent outputs
  parentTxs?.forEach((pTx) => {
    vout.push({
      value: pTx.value,
      scriptPubKey: ["OP_1", Address.p2tr.decode(pTx.destinationAddress).hex],
    });
  });

  // Inscription outputs
  inputs.forEach((input) => {
    input.inscriptions.forEach((inscription) => {
      vout.push({
        value: input.padding,
        scriptPubKey: [
          "OP_1",
          Address.p2tr.decode(inscription.destinationAddress).hex,
        ],
      });
    });
  });

  const txSkeleton: TxData = Tx.create({ vin, vout });
  return { txSkeleton, witnessSigners };
}

/** Signs all vin with the stored witness signers. */
function signAllVin(
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
