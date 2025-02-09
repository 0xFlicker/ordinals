// const buf = buffer;
// const { Address, Script, Signer, Tap, Tx } = window.tapscript;\
import cbor from "cbor";
import { BrotliOptions, brotliCompress, constants } from "zlib";
import { promisify } from "util";
import {
  Address,
  OutputData,
  Script,
  Signer,
  Tap,
  Tx,
  TxData,
  TxTemplate,
} from "@0xflick/tapscript";
import * as cryptoUtils from "@0xflick/crypto-utils";
import {
  InvalidAddressError,
  InvalidKeyError,
  PaddingTooLowError,
} from "./errors.js";
import {
  BitcoinNetworkNames,
  BitcoinScriptData,
  InscriptionFile,
  WritableInscription,
} from "./types.js";
import {
  buf2hex,
  isValidAddress,
  networkNamesToTapScriptName,
  satsToBitcoin,
  scriptDataToSerializedScript,
  serializeTxidAndIndexWithStripping,
  serializedScriptToScriptData,
} from "./utils.js";
import { createQR } from "./qrcode.js";
import { mimetypeInfo } from "./mimetype.js";

const { encode: cborEncode } = cbor;
const brotliCompressAsync = promisify(brotliCompress);

export interface InscriptionContent {
  isBin?: boolean;
  content: ArrayBuffer;
  mimeType: string;
  metadata?: Record<string, any>;
  compress?: boolean;
}

export interface PendingTransaction {
  txsize: number;
  vout: number;
  script: string[];
  output: {
    value: number;
    scriptPubKey: string[];
  };
}

// a presale transaction is a transaction that can be spent using the secKey. there is no inscription attached to it
export async function generatePresaleAddress({
  amount,
  feeRate,
  network,
  privKey,
}: {
  privKey: string;
  feeRate: number;
  amount: number;
  network: BitcoinNetworkNames;
}) {
  const secKey = new cryptoUtils.KeyPair(privKey);
  const pubKey = secKey.pub.x;
  const script = [pubKey, "OP_CHECKSIG"];
  const leaf = Tap.tree.getLeaf(Script.encode(script));
  const [tapKey] = Tap.getPubKey(pubKey, { target: leaf });
  const fundingAddress = Address.p2tr.encode(
    tapKey,
    networkNamesToTapScriptName(network),
  );
  // using this redeemtx to both simulate a spend (for gas estimation), but also
  const vout0 = {
    value: amount,
    scriptPubKey: ["OP_1", tapKey],
  };
  const tx = Tx.create({
    // fake input
    vin: [
      {
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
      },
    ],
    vout: [vout0],
  });

  const txsize = Tx.util.getTxSize(tx).size;
  const fee = Math.ceil(feeRate * txsize);
  vout0.value += fee;

  return {
    tapKey,
    amount: vout0.value,
    fundingAddress,
  };
}

export interface FundingAddressRequest {
  inscriptions: InscriptionContent[];
  padding?: number;
  tip: number;
  address: string;
  network: BitcoinNetworkNames;
  privKey: string;
  feeRate: number;
  parentInscriptions?: {
    txid: string;
    index: number;
  }[];
}

export interface FundingAddressResponse {
  fundingAddress: string;
  totalFee: number;
  amount: string;
  qrValue: string;
  qrSrc: string;
  files: InscriptionFile[];
  inscriptionsToWrite: WritableInscription[];
  overhead: number;
  padding: number;
  initScript: BitcoinScriptData[];
  initTapKey: string;
  initLeaf: string;
  initCBlock: string;
  secKey: cryptoUtils.SecretKey;
}

export async function generateFundingAddress({
  address,
  inscriptions,
  padding = 10000,
  tip,
  network,
  privKey,
  feeRate,
  parentInscriptions,
}: FundingAddressRequest): Promise<FundingAddressResponse> {
  const files: InscriptionFile[] = [];
  if (!isValidAddress(address)) {
    throw new InvalidAddressError(address);
  }

  for (const { content, mimeType, metadata, compress } of inscriptions) {
    files.push({
      content,
      mimetype: mimeType,
      metadata,
      compress,
    });
  }

  const min_padding = 546;

  if (
    isNaN(padding) ||
    padding > Number.MAX_SAFE_INTEGER ||
    padding < min_padding
  ) {
    throw new PaddingTooLowError(padding, min_padding);
  }
  const KeyPair = cryptoUtils.KeyPair;
  const secKey = new KeyPair(privKey);
  const pubkey = secKey.pub.x;
  const ec = new TextEncoder();
  const init_script = [pubkey, "OP_CHECKSIG"];
  const init_leaf = Tap.tree.getLeaf(Script.encode(init_script));
  const [init_tapkey, init_cblock] = Tap.getPubKey(pubkey, {
    target: init_leaf,
  });

  /**
   * This is to test IF the tx COULD fail.
   * This is most likely happening due to an incompatible key being generated.
   */
  const test_redeemtx = Tx.create({
    vin: [
      {
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
        prevout: {
          value: 10000,
          scriptPubKey: ["OP_1", init_tapkey],
        },
      },
    ],
    vout: [
      {
        value: 8000,
        scriptPubKey: ["OP_1", init_tapkey],
      },
    ],
  });

  const test_sig = await Signer.taproot.sign(secKey.raw, test_redeemtx, 0, {
    extension: init_leaf,
  });
  test_redeemtx.vin[0].witness = [test_sig.hex, init_script, init_cblock];
  const isValid = Signer.taproot.verifyTx(test_redeemtx, 0, {
    pubkey,
  });

  if (!isValid) {
    throw new InvalidKeyError(
      "Generated keys could not be validated. Please reload the app.",
    );
  }

  const inscriptionsToWrite: Omit<WritableInscription, "destinationAddress">[] =
    [];

  const datas = await Promise.all(
    files.map(async ({ mimetype, compress, content }) => {
      if (!compress) {
        return [false, new Uint8Array(content)] as const;
      }
      const brotliCompressOptions = {
        params: {
          [constants.BROTLI_PARAM_LGBLOCK]: 24,
          [constants.BROTLI_PARAM_LGWIN]: 24,
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
          [constants.BROTLI_PARAM_SIZE_HINT]: content.byteLength,
        },
      };
      if (mimetypeInfo[mimetype]) {
        brotliCompressOptions.params[constants.BROTLI_PARAM_MODE] =
          mimetypeInfo[mimetype].encoderMode;
      }
      const compressedData = await brotliCompressAsync(
        content,
        brotliCompressOptions,
      );
      if (compressedData.byteLength < content.byteLength) {
        return [true, new Uint8Array(compressedData)] as const;
      }
      return [false, new Uint8Array(content)] as const;
    }),
  );

  // Build one master script containing all inscriptions
  const masterScript: (string | Uint8Array)[] = [pubkey, "OP_CHECKSIG"];
  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const [compress, data] = datas[i];
    const metadata = files[i].metadata;
    const mimetype = ec.encode(files[i].mimetype);

    // Start inscription
    masterScript.push("OP_0", "OP_IF");
    masterScript.push(ec.encode("ord"), "01", mimetype);

    // Add pointer for all inscriptions after first one
    if (i > 0) {
      masterScript.push("02", new Uint8Array([i * padding])); // Little-endian pointer to output index
    }

    // Add parent inscription references if any
    if (parentInscriptions && parentInscriptions.length > 0) {
      parentInscriptions.forEach(({ txid, index }) => {
        masterScript.push(
          "03",
          serializeTxidAndIndexWithStripping(txid, index),
        );
      });
    }

    // Add metadata if any
    if (metadata) {
      const metadataCbor = cborEncode(metadata);
      for (let j = 0; j < metadataCbor.byteLength; j += 520) {
        const chunk = Uint8Array.prototype.slice.call(metadataCbor, j, j + 520);
        masterScript.push("05", chunk);
      }
    }

    // Add compression flag if needed
    if (compress) {
      masterScript.push("09", ec.encode("br"));
    }

    // Add content
    masterScript.push("OP_0", data, "OP_ENDIF");

    inscriptionsToWrite.push({
      pointerIndex: i,
      file: files[i],
    });

    totalSize += data.byteLength;
  }

  const leaf = Tap.tree.getLeaf(Script.encode(masterScript));
  const [tapKey, cblock] = Tap.getPubKey(pubkey, { target: leaf });

  const inscriptionAddress = Address.p2tr.encode(
    tapKey,
    networkNamesToTapScriptName(network),
  );

  // Generate the reveal transaction
  const inscriptionsToWriteWithDestination = inscriptionsToWrite.map(
    (inscription) => ({
      ...inscription,
      destinationAddress: inscriptionAddress,
    }),
  );
  const revealTx = await generateGenesisTransactionData({
    amount:
      (69 + inscriptionsToWrite.length * 2 * 31 + 10) * feeRate +
      padding * inscriptionsToWrite.length,
    fee: 0,
    initCBlock: init_cblock,
    initLeaf: init_leaf,
    initScript: init_script,
    initTapKey: init_tapkey,
    secKey: secKey,
    txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
    vout: 0,
  });
  const { vsize } = Tx.util.getTxSize(revealTx);
  const feeSize = Math.ceil(feeRate * vsize);
  // Now that we have the actual fee size, we can calculate the actual amount
  const amount = padding * inscriptionsToWrite.length + tip + feeSize;

  const fundingAddress = Address.p2tr.encode(
    init_tapkey,
    networkNamesToTapScriptName(network),
  );

  let qr_value =
    "bitcoin:" + fundingAddress + "?amount=" + satsToBitcoin(BigInt(amount));

  const overhead = amount - feeSize;

  return {
    fundingAddress,
    amount: satsToBitcoin(BigInt(amount)),
    qrValue: qr_value,
    qrSrc: await createQR(qr_value),
    files,
    totalFee: feeSize,
    inscriptionsToWrite: inscriptionsToWriteWithDestination,
    overhead,
    padding,
    initScript: scriptDataToSerializedScript(init_script),
    initTapKey: init_tapkey,
    initLeaf: init_leaf,
    initCBlock: init_cblock,
    secKey,
  };
}

export interface RefundTransactionRequest {
  feeRate: number;
  initTapKey: string;
  secKey: cryptoUtils.SecretKey;
  refundCBlock: string;
  txid: string;
  vout: number;
  amount: number | bigint;
  address: string;
}

export async function generateRefundTransaction({
  feeRate,
  initTapKey,
  secKey,
  refundCBlock,
  txid,
  vout,
  amount,
  address,
}: RefundTransactionRequest) {
  let pubKey = secKey.pub.x;
  const refundScript = [pubKey, "OP_CHECKSIG"];
  const refundTx = Tx.create({
    vin: [
      {
        txid: txid,
        vout: vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", initTapKey],
        },
      },
    ],
    vout: [
      {
        value: amount,
        scriptPubKey: Address.toScriptPubKey(address),
      },
    ],
  });
  const refundTxSize = Tx.util.getTxSize(refundTx);
  const txSize = refundTxSize.size;
  const fee = Math.ceil(feeRate * txSize);
  refundTx.vout[0].value = Number(amount) - fee;

  const sig = await Signer.taproot.sign(secKey.raw, refundTx, 0, {
    extension: Tap.encodeScript(refundScript),
  });
  refundTx.vin[0].witness = [sig.hex, refundScript, refundCBlock];
  const isValid = Signer.taproot.verifyTx(refundTx, 0, {
    pubkey: pubKey,
  });
  if (!isValid) {
    throw new Error("Invalid signature");
  }
  return Tx.encode(refundTx).hex;
}

export interface GenesisTransactionRequest {
  txid: string;
  vout: number;
  amount: number;
  fee: number;
  initScript: BitcoinScriptData[];
  initTapKey: string;
  initLeaf: string;
  initCBlock: string;
  secKey: cryptoUtils.SecretKey;
}

export async function generateGenesisTransactionData({
  txid,
  vout,
  amount,
  initScript,
  initTapKey,
  initLeaf,
  initCBlock,
  secKey,
  fee,
}: GenesisTransactionRequest): Promise<TxData> {
  let outputs: TxTemplate["vout"] = [
    {
      value: fee,
      scriptPubKey: ["OP_1", initTapKey],
    },
  ];

  const initRedeemTx = Tx.create({
    vin: [
      {
        txid: txid,
        vout: vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", initTapKey],
        },
      },
    ],
    vout: outputs,
  });
  const init_sig = await Signer.taproot.sign(secKey.raw, initRedeemTx, 0, {
    extension: initLeaf,
  });
  initRedeemTx.vin[0].witness = [
    init_sig.hex,
    serializedScriptToScriptData(initScript),
    initCBlock,
  ];
  return initRedeemTx;
}

export async function generateGenesisTransaction({
  txid,
  vout,
  amount,
  initScript,
  initTapKey,
  initLeaf,
  initCBlock,
  secKey,
  fee,
}: GenesisTransactionRequest) {
  const initRedeemTx = await generateGenesisTransactionData({
    txid,
    vout,
    amount,
    initScript,
    initTapKey,
    initLeaf,
    initCBlock,
    secKey,
    fee,
  });

  let rawTx = Tx.encode(initRedeemTx).hex;
  return rawTx as string;
}

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

  parentTxs?: (Required<TxTemplate>["vin"]["0"] & {
    value: number;
    secKey: cryptoUtils.SecretKey;
    parentVout: Required<TxTemplate>["vout"]["0"];
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

  // Outer iterative search over fee rates
  let currentRate = highestFeeRate;
  while (currentRate >= lowestFeeRate) {
    const maybeTx = buildTxAtFeeRate(request, currentRate);
    if (maybeTx) {
      return {
        txData: maybeTx.txData,
        feeRate: currentRate,
        platformFee: maybeTx.platformFee,
        minerFee: maybeTx.minerFee,
      }; // Found a valid transaction at this rate
    }

    // Drop the fee rate (could do -1 sats/vB, or multiply by 0.95, etc.)
    currentRate = Math.floor(currentRate * 0.95);
  }

  // Try one last time at lowest fee rate
  const lastTry = buildTxAtFeeRate(request, lowestFeeRate);
  if (lastTry) {
    return {
      txData: lastTry.txData,
      feeRate: lowestFeeRate,
      platformFee: lastTry.platformFee,
      underpriced: true,
      minerFee: lastTry.minerFee,
    };
  }

  // If we still can't build it at lowest rate, try with no platform fee
  const finalAttempt = buildTxAtFeeRate(
    {
      ...request,
      feeDestinations: undefined,
    },
    lowestFeeRate,
  );

  if (!finalAttempt) {
    throw new Error(
      "Cannot create valid transaction even with no platform fee",
    );
  }

  return {
    txData: finalAttempt.txData,
    feeRate: lowestFeeRate,
    platformFee: 0,
    underpriced: true,
    minerFee: finalAttempt.minerFee,
  };
}

/**
 * Tries to build a valid transaction at a given feeRate.
 * Returns TxData if successful, or null if no valid distribution found.
 */
function buildTxAtFeeRate(
  request: RevealTransactionRequest,
  feeRate: number,
): { txData: TxData; platformFee: number; minerFee: number } | null {
  // 1) Build base skeleton: mandatory inputs/outputs for padding and inscriptions
  const { txSkeleton, witnessSigners } = buildSkeleton(request);

  // 2) Estimate base size and compute minimal miner fee
  let baseVSize = 0;
  try {
    baseVSize = Tx.util.getTxSize(txSkeleton).vsize;
  } catch {
    console.log(
      "Invalid or can't estimate",
      JSON.stringify(txSkeleton, null, 2),
    );
    // If we can't even size it, bail
    return null;
  }
  const baseMinerFee = Math.ceil(feeRate * baseVSize);

  // 3) Check that we have enough input to pay for required padding + base miner fee
  const totalInputAmount = getTotalInputAmount(request);
  const requiredPadding = getRequiredPaddingAmount(request);
  if (totalInputAmount < requiredPadding + baseMinerFee) {
    // Not possible at this fee rate
    return null;
  }

  // 4) If no feeDestinations, sign and return
  const leftoverForFees = totalInputAmount - requiredPadding;
  if (!request.feeDestinations || request.feeDestinations.length === 0) {
    // Just sign it with the base miner fee in mind. (We assume leftover covers the base fee.)
    signAllVin(txSkeleton, witnessSigners);
    return { txData: txSkeleton, platformFee: 0, minerFee: baseMinerFee };
  }

  // 5) We do an inner loop for platform-fee distributions (just an example approach)
  const feePercentCandidates = [100, 95, 90, 85, 80, 75];
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
    );
    if (maybeTxData) {
      return {
        ...maybeTxData,
        minerFee: baseMinerFee,
      };
    }
  }

  // 6) If we didn't succeed in that range, optionally try going from 70% down to 0%
  //    or handle that logic in the same function. Your call.
  //    e.g.:
  for (let pct = 70; pct >= 0; pct -= 5) {
    const maybeTxData = tryPlatformFeeDistribution(
      txSkeleton,
      witnessSigners,
      leftoverForFees,
      baseMinerFee,
      request.feeDestinations,
      feeRate,
      pct,
      request.feeTarget,
    );
    if (maybeTxData) {
      return {
        ...maybeTxData,
        minerFee: baseMinerFee,
      };
    }
  }

  // 7) If no distribution works, return null
  return null;
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
): { txData: TxData; platformFee: number } | null {
  // Clone the skeleton so we don't mutate the original
  const tempTxData: TxData = {
    version: skeleton.version,
    locktime: skeleton.locktime,
    vin: skeleton.vin.map((vin) => ({ ...vin })),
    vout: [...skeleton.vout], // shallow copy
  };

  const totalPct = feeDestinations.reduce((s, d) => s + d.percentage, 0);
  const allocatedToPlatform = leftover * (platformFeePercent / 100);

  // Build platform outputs
  const platformOutputs = feeDestinations.map((dest) => {
    const share = Math.floor(
      (allocatedToPlatform * dest.percentage) / totalPct,
    );
    return {
      value: share,
      scriptPubKey: ["OP_1", Address.p2tr.decode(dest.address).hex],
    } as OutputData;
  });

  // Add platform outputs temporarily
  tempTxData.vout.push(...platformOutputs);

  // Recalculate final size + total fee at the new outputs
  let newVSize = 0;
  try {
    newVSize = Tx.util.getTxSize(tempTxData).vsize;
  } catch {
    // Invalid or can't estimate
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
    // Not enough platform fee to bother, revert
    tempTxData.vout.splice(-platformOutputs.length);
    return null;
  }

  // If we reach here, it's valid:
  // Sign inputs
  signAllVin(tempTxData, witnessSigners);

  return { txData: tempTxData, platformFee: actualPlatformFee };
}

/** Build a base transaction skeleton with mandatory inputs/outputs only. */
function buildSkeleton(request: RevealTransactionRequest): {
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
      const sig = Signer.taproot.sign(
        Tap.getSecKey(pTx.secKey)[0],
        txSkeleton,
        i,
      );
      if (!Signer.taproot.verifyTx(txSkeleton, i, { pubkey: tPub })) {
        throw new Error("Invalid signature (parentTx)");
      }
      return [sig];
    });
    vin.push({
      txid: pTx.txid,
      vout: pTx.vout,
      prevout: {
        value: pTx.value,
        scriptPubKey: ["OP_1", tPub],
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
    vout.push(pTx.parentVout);
  });

  // Inscription outputs
  inputs.forEach((input) => {
    input.inscriptions.forEach((inscription) => {
      vout.push({
        value: input.padding,
        scriptPubKey: Address.toScriptPubKey(inscription.destinationAddress),
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
    (acc, i) => acc + i.inscriptions.length,
    0,
  );
  const parentCount = request.parentTxs?.length ?? 0;
  // For simplicity, assume all inputs have the same padding. If they differ, you can adapt.
  const perInputPadding = request.inputs[0]?.padding ?? 0;
  return (totalInscriptions + parentCount) * perInputPadding;
}
