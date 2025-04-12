import { BrotliOptions, brotliCompress, constants } from "zlib";
import { KeyPair, SecretKey } from "@0xflick/crypto-utils";
import {
  BitcoinNetworkNames,
  BitcoinScriptData,
  InscriptionContent,
  InscriptionFile,
  WritableInscription,
} from "./types.js";
import { Script, Signer, Tx } from "@0xflick/tapscript";
import { Tap } from "@0xflick/tapscript";
import {
  cborEncode,
  isValidAddress,
  networkNamesToTapScriptName,
  satsToBitcoin,
  scriptDataToSerializedScript,
  serializeTxidAndIndexWithStripping,
} from "./utils.js";
import { Address } from "@0xflick/tapscript";
import { createQR } from "./qrcode.js";
import { promisify } from "util";
import { InvalidAddressError, PaddingTooLowError } from "./errors.js";
import { mimetypeInfo } from "./mimetype.js";

const brotliCompressAsync = promisify(brotliCompress);

export interface GenesisFundingRequest {
  // Combine fields from FundingAddressRequest + anything else you need:
  inscriptions: InscriptionContent[];
  padding?: number;
  tip?: number; // optional "tip" or extra sats user wants to include
  address: string; // user's own address—used to derive pubkey or for other reasons?
  network: BitcoinNetworkNames;
  privKey: string; // key used to form the Taproot output
  feeRate: number; // used for size estimation, but final fee=0 in the genesis TX
  parentInscriptions?: {
    txid: string;
    index: number;
  }[];
}

export interface GenesisFundingResponse {
  // The address the user must fund:
  fundingAddress: string;
  // The total # of sats we expect them to send:
  amount: string;
  // Standard fields you used to return:
  qrValue: string;
  qrSrc: string;
  // Possibly keep the partial TX or just keep the data needed to finalize
  partialHex: string; // the raw hex of the partial genesis transaction (fee=0)
  totalFee: number; // how many sats we're "reserving" for miner cost (still 0 in the TX, but we show the user for reference)
  files: InscriptionFile[];
  inscriptionsToWrite: WritableInscription[];
  overhead: number;
  padding: number;
  genesisTapKey: string;
  genesisLeaf: string;
  genesisCblock: string;
  genesisScript: BitcoinScriptData[];
  refundTapKey: string;
  refundLeaf: string;
  refundCBlock: string;
  rootTapKey: string;
  secKey: SecretKey;
}

export async function generateFundableGenesisTransaction(
  request: GenesisFundingRequest,
): Promise<GenesisFundingResponse> {
  const {
    address,
    inscriptions,
    padding = 10000,
    tip = 0,
    network,
    privKey,
    feeRate,
    parentInscriptions,
  } = request;

  // 1) Validate address, build "files" array, etc.
  if (!isValidAddress(address)) {
    throw new InvalidAddressError(address);
  }
  const files: InscriptionFile[] = [];
  for (const { content, mimeType, metadata, compress } of inscriptions) {
    files.push({
      content,
      mimetype: mimeType,
      metadata,
      compress,
    });
  }

  // 2) Basic checks on padding, key creation
  const minPadding = 546;
  if (isNaN(padding) || padding < minPadding) {
    throw new PaddingTooLowError(padding, minPadding);
  }
  const secKey = new KeyPair(privKey);
  const pubKey = secKey.pub.x;

  // 5) Compress or not compress each inscription
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
        new Uint8Array(content),
        brotliCompressOptions,
      );
      if (compressedData.byteLength < content.byteLength) {
        return [true, new Uint8Array(compressedData)] as const;
      }
      return [false, new Uint8Array(content)] as const;
    }),
  );

  // 6) Build the "master" inscription script with all inscriptions
  //    This merges your old "generateFundingAddress" approach
  const masterScript: (string | Uint8Array)[] = [pubKey, "OP_CHECKSIG"];
  const ec = new TextEncoder();
  let totalSize = 0;
  const inscriptionsToWrite: Omit<WritableInscription, "destinationAddress">[] =
    [];

  for (let i = 0; i < files.length; i++) {
    const [didCompress, data] = datas[i];
    const { metadata, mimetype } = files[i];
    const mimeEncoded = ec.encode(mimetype);

    masterScript.push("OP_0", "OP_IF");
    masterScript.push(ec.encode("ord"), "01", mimeEncoded);

    // Add pointer if needed, or parent inscriptions
    if (i > 0) {
      masterScript.push("02", new Uint8Array([i * padding]));
    }
    if (parentInscriptions && parentInscriptions.length > 0) {
      parentInscriptions.forEach(({ txid, index }) => {
        masterScript.push(
          "03",
          serializeTxidAndIndexWithStripping(txid, index),
        );
      });
    }
    // Add metadata as cbor chunks
    if (metadata) {
      const metadataCbor = cborEncode(metadata);
      for (let j = 0; j < metadataCbor.byteLength; j += 520) {
        const chunk = Buffer.from(metadataCbor.subarray(j, j + 520));
        masterScript.push("05", new Uint8Array(chunk));
      }
    }
    if (didCompress) {
      masterScript.push("09", ec.encode("br"));
    }

    // Add actual content
    masterScript.push("OP_0", data, "OP_ENDIF");

    inscriptionsToWrite.push({
      pointerIndex: i,
      file: files[i],
    });
    totalSize += data.byteLength;
  }

  // 7) Create the final leaf & tap key
  const refundScript = Tap.encodeScript(masterScript.slice(0, 2));
  const genesisScript = Tap.encodeScript(masterScript);
  const tree = [
    // This is a refund script that does not include the inscription
    refundScript,
    // This is the actual inscription script
    genesisScript,
  ];
  const [tapKey] = Tap.getPubKey(pubKey, {
    tree,
  });

  // This is the actual address to which the user will send the EXACT funds
  const genesisAddress = Address.p2tr.encode(
    tapKey,
    networkNamesToTapScriptName(network),
  );

  // 8) Build a partial "genesis transaction" that we can measure.
  //    We set fee=0 here, because we no longer collect fees in genesis.
  //    The user is just locking these sats into the tap script.
  //    We'll do a single input referencing a dummy outpoint for sizing.
  const partialTxData = Tx.create({
    vin: [
      {
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
        prevout: {
          // We'll set a dummy large value—this is just for size estimation
          value: 100_000_000,
          scriptPubKey: ["OP_1", tapKey],
        },
      },
    ],
    vout: [
      {
        // We lock everything back to the same script
        value: 100_000_000, // dummy
        scriptPubKey: ["OP_1", tapKey],
      },
    ],
  });

  // 9) Sign the partial input with the new leaf, so the witness is included in the size
  const initSig = await Signer.taproot.sign(secKey, partialTxData, 0, {
    extension: genesisScript,
  });
  const [genesisTapKey, genesisCblock] = Tap.getPubKey(pubKey, {
    tree,
    target: genesisScript,
  });
  const [refundTapKey, refundCBlock] = Tap.getPubKey(pubKey, {
    tree,
    target: refundScript,
  });
  partialTxData.vin[0].witness = [
    initSig.hex,
    Script.encode(masterScript),
    genesisCblock,
  ];

  // 10) Measure its size so we know how many sats we need to cover (dust + any overhead)
  const { size } = Tx.util.getTxSize(partialTxData);
  // We do collect a small miner fee from the user just to get it confirmed in a block
  // but "fee=0" inside the actual output. So your minimal "miner" cost is:
  const feeSize = Math.ceil(feeRate * size);

  // 11) The total needed from the user is basically
  // "padding * #inscriptions + tip + minimal-miner-fee-for-confirmation"
  // (You can tweak as needed.)
  const totalInscriptions = inscriptions.length;
  const required =
    Math.max(tip, Math.ceil(feeSize * 0.03)) +
    feeSize +
    padding * totalInscriptions +
    // output signatures
    totalInscriptions * 32 +
    // 1 input signature
    64;

  const overhead = required - feeSize;

  // 12) Return everything we used to from generateFundingAddress
  return {
    fundingAddress: genesisAddress,
    amount: satsToBitcoin(BigInt(required)), // e.g. "0.00012345"
    qrValue: `bitcoin:${genesisAddress}?amount=${satsToBitcoin(
      BigInt(required),
    )}`,
    qrSrc: await createQR(
      `bitcoin:${genesisAddress}?amount=${satsToBitcoin(BigInt(required))}`,
    ),
    files,
    totalFee: feeSize,
    inscriptionsToWrite: inscriptionsToWrite.map((insc) => ({
      ...insc,
      destinationAddress: address,
    })),
    overhead,
    padding,
    genesisTapKey,
    genesisLeaf: genesisScript,
    genesisCblock,
    genesisScript: scriptDataToSerializedScript(masterScript),
    refundTapKey,
    refundLeaf: refundScript,
    refundCBlock,
    rootTapKey: tapKey,
    secKey,
    partialHex: Tx.encode(partialTxData).hex, // so you can debug or show the user
  };
}
