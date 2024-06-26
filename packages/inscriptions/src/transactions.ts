// const buf = buffer;
// const { Address, Script, Signer, Tap, Tx } = window.tapscript;\
import cbor from "cbor";
import { BrotliOptions, brotliCompress, constants } from "zlib";
import { promisify } from "util";
import {
  Address,
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

  const inscriptionsToWrite: WritableInscription[] = [];
  let total_fee = 0;
  const base_size = 160;

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

  for (let i = 0; i < files.length; i++) {
    const [compress, data] = datas[i];
    const metadata = files[i].metadata;
    const mimetype = ec.encode(files[i].mimetype);

    // chunk metadataCbor into 520 byte chunks
    const chunks = [];
    if (metadata) {
      const metadataCbor = cborEncode(metadata);
      for (let i = 0; i < metadataCbor.byteLength; i += 520) {
        chunks.push(Uint8Array.prototype.slice.call(metadataCbor, i, i + 520));
      }
    }
    const script: (string | Uint8Array)[] = [
      pubkey,
      "OP_CHECKSIG",
      "OP_0",
      "OP_IF",
      ec.encode("ord"),
      "01",
      mimetype,
      ...(parentInscriptions && parentInscriptions?.length > 0
        ? parentInscriptions
            .map(({ txid, index }) => [
              "03",
              serializeTxidAndIndexWithStripping(txid, index),
            ])
            .flat()
        : []),
      ...chunks.map((chunk) => ["05", chunk]).flat(),
      ...(compress ? ["09", ec.encode("br")] : []),
      "OP_0",
      data,
      "OP_ENDIF",
    ];

    const leaf = Tap.tree.getLeaf(Script.encode(script));
    const [tapKey, cblock] = Tap.getPubKey(pubkey, { target: leaf });

    const inscriptionAddress = Address.p2tr.encode(
      tapKey,
      networkNamesToTapScriptName(network),
    );

    const txsize = data.byteLength;
    const fee = Math.ceil(feeRate * txsize);
    total_fee += fee;

    inscriptionsToWrite.push({
      leaf: leaf,
      tapkey: tapKey,
      cblock: cblock,
      inscriptionAddress: inscriptionAddress,
      txsize: txsize,
      fee: fee,
      script: scriptDataToSerializedScript(script),
      file: files[i],
    });
  }

  // we are covering 2 times the same outputs, once for seeder, once for the inscribers
  let total_fees =
    total_fee +
    (69 + inscriptionsToWrite.length * 2 * 31 + 10) * feeRate +
    base_size * inscriptionsToWrite.length +
    padding * inscriptionsToWrite.length;

  let fundingAddress = Address.p2tr.encode(
    init_tapkey,
    networkNamesToTapScriptName(network),
  );

  if (!isNaN(tip) && tip >= 500) {
    total_fees += 50 * feeRate + tip;
  }
  total_fees = Math.ceil(total_fees);
  let qr_value =
    "bitcoin:" +
    fundingAddress +
    "?amount=" +
    satsToBitcoin(BigInt(total_fees));

  let overhead = total_fees - total_fee - padding * inscriptions.length - tip;

  if (isNaN(overhead)) {
    overhead = 0;
  }

  if (isNaN(tip)) {
    tip = 0;
  }

  return {
    fundingAddress,
    amount: satsToBitcoin(BigInt(total_fees)),
    qrValue: qr_value,
    qrSrc: await createQR(qr_value),
    files,
    totalFee: total_fee,
    inscriptionsToWrite,
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
  inscriptions: WritableInscription[];
  txid: string;
  vout: number;
  amount: number;
  tip?: number;
  padding: number;
  tippingAddress?: string;
  initScript: BitcoinScriptData[];
  initTapKey: string;
  initLeaf: string;
  initCBlock: string;
  secKey: cryptoUtils.SecretKey;
}
export interface GenesisTransactionResponse {}

export async function generateGenesisTransaction({
  inscriptions,
  txid,
  vout,
  amount,
  tip,
  padding,
  tippingAddress,
  initScript,
  initTapKey,
  initLeaf,
  initCBlock,
  secKey,
}: GenesisTransactionRequest) {
  let outputs: TxTemplate["vout"] = [];

  for (let i = 0; i < inscriptions.length; i++) {
    outputs.push({
      value: padding + inscriptions[i].fee,
      scriptPubKey: ["OP_1", inscriptions[i].tapkey],
    });
  }

  if (tip && tippingAddress && !isNaN(tip) && tip >= 500) {
    outputs.push({
      value: tip,
      scriptPubKey: Address.decode(tippingAddress).script,
    });
  }

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

  let rawTx = Tx.encode(initRedeemTx).hex;
  return rawTx as string;
}

export interface RevealTransactionRequest {
  inscription: WritableInscription;
  vout: number;
  txid: string;
  amount: number;
  address: string;
  secKey: cryptoUtils.SecretKey;
  parentTxs?: (Required<TxTemplate>["vin"]["0"] & {
    value: number;
    secKey: cryptoUtils.SecretKey;
    parentVout: Required<TxTemplate>["vout"]["0"];
  })[];
}

export function generateRevealTransaction({
  address,
  inscription,
  vout,
  txid,
  amount,
  secKey,
}: RevealTransactionRequest): string {
  return Tx.encode(
    generateRevealTransactionData({
      address,
      inscription,
      vout,
      txid,
      amount,
      secKey,
    }),
  ).hex;
}

export function generateRevealTransactionData({
  address,
  inscription,
  vout,
  txid,
  amount,
  secKey,
  parentTxs,
}: RevealTransactionRequest): TxData {
  const redeemTx = Tx.create({
    vin: [
      ...(parentTxs?.map(({ parentVout: _, value, secKey, ...vin }) => {
        let pubKey = secKey.pub.x;

        const [tPub] = Tap.getPubKey(pubKey);
        return {
          ...vin,
          prevout: {
            value,
            scriptPubKey: ["OP_1", tPub],
          },
        };
      }) || []),
      {
        txid,
        vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", inscription.tapkey],
        },
      },
    ],
    vout: [
      ...(parentTxs?.map(({ parentVout }) => parentVout) || []),
      {
        value: amount - inscription.fee,
        scriptPubKey: ["OP_1", Address.p2tr.decode(address).hex],
      },
    ],
  });

  // If there are parent transactions inputs, sign them
  if (parentTxs) {
    for (let i = 0; i < parentTxs?.length || 0; i++) {
      const { secKey } = parentTxs[i];
      let pubKey = secKey.pub.x;

      const [tPub] = Tap.getPubKey(pubKey);
      const [tSecKey] = Tap.getSecKey(secKey);

      const sig = Signer.taproot.sign(tSecKey, redeemTx, i);
      redeemTx.vin[i].witness = [sig];
      const isValid = Signer.taproot.verifyTx(redeemTx, i, {
        pubkey: tPub,
      });
      if (!isValid) {
        throw new Error("Invalid signature");
      }
    }
  }
  const sig = Signer.taproot.sign(
    secKey.raw,
    redeemTx,
    redeemTx.vin.length - 1,
    {
      extension: inscription.leaf,
    },
  );
  redeemTx.vin[redeemTx.vin.length - 1].witness = [
    sig.hex,
    serializedScriptToScriptData(inscription.script),
    inscription.cblock,
  ];

  const pubKey = secKey.pub.x;
  const isValid = Signer.taproot.verifyTx(redeemTx, redeemTx.vin.length - 1, {
    pubkey: pubKey,
  });

  if (!isValid) {
    throw new Error("Invalid signature");
  }
  return redeemTx;
}
