import {
  addressReceivedMoneyInThisTx,
  generatePrivKey,
  broadcastTx,
  BitcoinNetworkNames,
  waitForInscriptionFunding,
  networkNamesToTapScriptName,
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  satsToBitcoin,
} from "@0xflick/inscriptions";
import { lookup } from "mime-types";
import fs from "fs";
import path from "path";
import os from "os";
import { Address, Tx, Tap } from "@cmdcode/tapscript";
import { get_seckey, get_pubkey } from "@cmdcode/crypto-tools/keys";
import { inscribeFiles } from "../../inscribe.js";
import { build } from "esbuild";
import { createMempoolBitcoinClient } from "../../mempool.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function deployOpLockCat({
  destinationAddress,
  network,
  feeRate,
  rpcuser,
  rpcpassword,
  rpcwallet,
  noSend,
}: {
  destinationAddress: string;
  network: BitcoinNetworkNames;
  feeRate?: number;
  rpcuser: string;
  rpcpassword?: string;
  rpcwallet?: string;
  noSend?: boolean;
}) {
  if (destinationAddress === "auto") {
    const privKey = generatePrivKey();
    const secKey = get_seckey(privKey);
    const pubkey = get_pubkey(secKey);
    const [tseckey] = Tap.getSecKey(secKey);
    const [tpubkey, cblock] = Tap.getPubKey(pubkey);
    const addr = Address.p2tr.encode(
      tpubkey,
      networkNamesToTapScriptName(network),
    );

    console.log(`\nInscription Address:`);
    console.log(`Private key: ${privKey}`);
    console.log(`Address: ${addr}`);
    console.log(`TapRoot secret key: ${tseckey}`);
    console.log(`TapRoot public key: ${tpubkey}`);
    console.log(`Control block: ${cblock}`);
    destinationAddress = addr;
  }

  const mempoolClient = createMempoolBitcoinClient({
    network,
  });
  const { fastestFee, halfHourFee } =
    await mempoolClient.fees.getFeesRecommended();

  feeRate = feeRate || fastestFee;
  if (feeRate < halfHourFee) {
    console.warn(
      `Fee rate is less than the fastest fee rate. Using fastest fee rate.`,
    );
    process.exit(1);
  }

  if (feeRate > fastestFee) {
    console.warn(
      `Fee rate is very high. Are you sure you want to continue? (y/n)`,
    );
    await new Promise((resolve, reject) => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      function handleInput(key: string) {
        if (key === "y") {
          resolve(true);
        } else {
          reject(new Error("User did not confirm"));
        }
      }
      stdin.once("data", handleInput);
    });
  }

  const tmDir = path.join(os.tmpdir(), `flickjs`);
  const flickjs = await build({
    entryPoints: [
      path.join(__dirname, "../../../../../packages/assets/src/index.ts"),
    ],
    banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
    outfile: path.join(tmDir, "flick.js"),
    bundle: true,
    minify: true,
    external: ["canvas", "dtrace-provider"],
    platform: "browser",
    target: "es2022",
  });

  console.log(`[FEE_RATE] target: ${feeRate}`);
  console.log(`[FEE_RATE] fastest: ${fastestFee}`);
  console.log(`[FEE_RATE] halfHour: ${halfHourFee}`);

  console.log(`[FLICKJS] Inscribing to ${destinationAddress}...`);
  const parentPrivKey = generatePrivKey();
  const parentSecKey = get_seckey(parentPrivKey);
  const parentPubkey = get_pubkey(parentSecKey);
  const [parentTseckey] = Tap.getSecKey(parentSecKey);
  const [parentTpubkey, parentCblock] = Tap.getPubKey(parentPubkey);
  const parentAddress = Address.p2tr.encode(
    parentTpubkey,
    networkNamesToTapScriptName(network),
  );

  const { revealTxId: genesisTxId } = await inscribeFiles({
    address: parentAddress,
    files: [
      {
        content: Buffer.from("BITFLICK"),
        mimeType: "text/plain",
        metadata: {
          name: "BITFLICK",
          description: "BITFLICK",
        },
      },
    ],
    network,
    rpcuser,
    rpcpassword,
    rpcwallet,
    noSend,
    targetFeeRate: feeRate,
    minFeeRate: halfHourFee,
    maxFeeRate: fastestFee,
    // tipAmount: 1000,
    // tipDestinationAddress: parentAddress,
  });
  console.log(`[PARENT_INSCRIPTION_ID] ${genesisTxId}`);
  const parentInscriptionId = `${genesisTxId}i0`;

  // get all assets from ordinals/op-lock-cat/content/assets
  const assets = fs.readdirSync(
    path.join(__dirname, "../../../../../ordinals/op-lock-cat/content/assets"),
  );
  console.log(`[ASSETS] ${assets.length}`);

  const { revealTxId: flickJsTxId } = await inscribeFiles({
    address: destinationAddress,
    parent: {
      amount: 546,
      destinationAddress: parentAddress,
      index: 0,
      inscriptionId: parentInscriptionId,
      secKey: parentPrivKey,
      txid: genesisTxId,
    },
    files: [
      {
        path: path.join(tmDir, "flick.js"),
        mimeType: "application/javascript",
        metadata: {
          name: "flick.js",
          description:
            "Flick.js is a functional library for generating images iteratively on a canvas.",
          author: "flick",
          version: "0.0.3",
        },
      },
      {
        path: path.join(
          __dirname,
          "../../../../../ordinals/op-lock-cat/content/cbor.js",
        ),
        mimeType: "application/javascript",
        metadata: {
          name: "CBOR.js",
        },
      },
      ...assets.map((asset) => ({
        path: path.join(
          __dirname,
          "../../../../../ordinals/op-lock-cat/content/assets",
          asset,
        ),
        mimeType: "image/webp",
      })),
    ],
    // tipAmount: 1000,
    // tipDestinationAddress: parentAddress,
    network,
    rpcuser,
    rpcpassword,
    rpcwallet,
    noSend,
    minFeeRate: halfHourFee,
    maxFeeRate: fastestFee,
    targetFeeRate: feeRate,
  });

  const flickJsInscriptionId = `${flickJsTxId}i0`;
  const cborInscriptionId = `${flickJsTxId}ii`;

  console.log(`[FLICKJS] ${flickJsInscriptionId}`);
  console.log(`[CBOR] ${cborInscriptionId}`);
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const assetInscriptionId = `${flickJsTxId}i${i + 2}`;
    console.log(`[${asset}] ${assetInscriptionId}`);
  }
}
