import {
  addressReceivedMoneyInThisTx,
  generatePrivKey,
  broadcastTx,
  BitcoinNetworkNames,
  networkNamesToTapScriptName,
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  satsToBitcoin,
} from "@0xflick/inscriptions";
import { lookup } from "mime-types";
import fs from "fs";
import { Address, Tx, Tap } from "@cmdcode/tapscript";
import { get_seckey } from "@cmdcode/crypto-tools/keys";
import { sendBitcoin, sendRawTransaction } from "./bitcoin.js";
import { createMempoolBitcoinClient } from "./mempool.js";

export async function inscribeFiles({
  address,
  network,
  files,
  padding = 546,
  targetFeeRate,
  minFeeRate,
  maxFeeRate,
  rpcuser,
  rpcpassword,
  rpcwallet,
  noSend,
  parent,
  tipDestinationAddress,
  tipAmount,
}: {
  address: string;
  files: {
    path?: string;
    content?: Buffer;
    mimeType?: string;
    metadataFile?: string;
    metadata?: Record<string, string>;
    compress?: boolean;
  }[];
  padding?: number;
  network: BitcoinNetworkNames;
  targetFeeRate?: number;
  minFeeRate?: number;
  maxFeeRate?: number;
  rpcuser: string;
  rpcpassword: string;
  rpcwallet: string;
  noSend: boolean;
  parent?: {
    amount: number;
    inscriptionId: string;
    txid: string;
    index: number;
    secKey: string;
    destinationAddress: string;
  };
  tipDestinationAddress?: string;
  tipAmount?: number;
}) {
  const mempoolClient = createMempoolBitcoinClient({
    network,
  });
  const { fastestFee, halfHourFee } =
    await mempoolClient.fees.getFeesRecommended();

  const parentInscriptions = parent
    ? [
        parent.inscriptionId.split("i").reduce(
          (acc, curr, index) => {
            if (index === 0) {
              return { txid: curr, index: null };
            }
            return { txid: acc.txid, index: Number(curr) };
          },
          { txid: null, index: null },
        ),
      ]
    : [];

  const inscriptions = await Promise.all(
    files.map(async (file) => ({
      content: file.content ?? (await fs.promises.readFile(file.path)),
      mimeType:
        (file.mimeType ?? lookup(file.path)) || "application/octet-stream",
      ...(file.metadataFile || file.metadata
        ? {
            metadata: {
              ...(file.metadataFile
                ? JSON.parse(
                    await fs.promises.readFile(file.metadataFile, "utf8"),
                  )
                : {}),
              ...(file.metadata || {}),
            },
          }
        : {}),
      compress: file.compress,
    })),
  );

  const privKey = generatePrivKey();
  const response = await generateFundableGenesisTransaction({
    address,
    inscriptions,
    padding,
    tip: tipAmount,
    network,
    privKey,
    feeRate: targetFeeRate,
    ...(parentInscriptions.length > 0 ? { parentInscriptions } : {}),
  });

  console.log(`Pay ${response.amount} to ${response.fundingAddress}`);
  let funded: readonly [string, number, number] | readonly [null, null, null] =
    [null, null, null];
  if (!noSend) {
    await sendBitcoin({
      fee_rate: targetFeeRate,
      network,
      outputs: [[response.fundingAddress, response.amount]],
      rpcpassword,
      rpcuser,
      rpcwallet,
      generate: network === "regtest",
    });
  }
  console.log("Waiting for funding...");
  do {
    funded = await addressReceivedMoneyInThisTx(
      response.fundingAddress,
      network,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (funded[0] == null);
  console.log(`Funded!`);

  let [txid, vout, amount] = funded;

  const revealResponse = generateRevealTransaction({
    feeRateRange:
      minFeeRate && maxFeeRate
        ? [minFeeRate, maxFeeRate]
        : [fastestFee, halfHourFee],
    inputs: [
      {
        leaf: response.genesisLeaf,
        tapkey: response.genesisTapKey,
        cblock: response.genesisCBlock,
        script: response.genesisScript,
        rootTapKey: response.rootTapKey,
        vout,
        txid,
        amount,
        secKey: response.secKey,
        padding: response.padding,
        inscriptions: response.inscriptionsToWrite,
      },
    ],
    ...(tipAmount && tipAmount > 0 && tipDestinationAddress
      ? {
          feeTarget: tipAmount,
          feeDestinations: [
            {
              address: tipDestinationAddress,
              weight: 100,
            },
          ],
        }
      : {}),
    parentTxs: parent
      ? [
          {
            vin: {
              txid: parent.txid,
              vout: parent.index,
            },
            value: parent.amount,
            secKey: get_seckey(Buffer.from(parent.secKey, "hex")),
            destinationAddress: parent.destinationAddress,
          },
        ]
      : [],
  });
  const { hex: revealTx, minerFee, platformFee, underpriced } = revealResponse;
  // console.log(`Reveal tx: ${revealTx}`);
  console.log(`Miner fee: ${minerFee}`);
  console.log(`Platform fee: ${platformFee}`);
  console.log(`Underpriced: ${!!underpriced}`);
  let revealTxId: string | null = null;
  try {
    revealTxId = await sendRawTransaction({
      network,
      rawtx: revealTx,
    });
    console.log(`Reveal tx id: ${revealTxId}`);
  } catch (e) {
    console.error(e);
    // Decode and print the reveal tx
    const revealTxSkeleton = Tx.decode(Buffer.from(revealTx, "hex"));
    await fs.promises.writeFile(
      "reveal.json",
      JSON.stringify(
        {
          ...revealTxSkeleton,
          hex: revealTx,
          funded,
          response,
        },
        function (this: any, key: string, value: any) {
          if (typeof value === "bigint") {
            return satsToBitcoin(value);
          }
          return value;
        },
        2,
      ),
    );
    throw new Error("Failed to broadcast reveal tx");
  }
  return {
    revealTxId,
    revealTx,
    minerFee,
    platformFee,
    underpriced,
    inscriptions,
  };
}
