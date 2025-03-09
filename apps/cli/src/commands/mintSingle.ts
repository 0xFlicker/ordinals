import {
  addressReceivedMoneyInThisTx,
  generateFundableGenesisTransaction,
  generatePrivKey,
  broadcastTx,
  generateRevealTransaction,
  BitcoinNetworkNames,
} from "@0xflick/inscriptions";
import { lookup } from "mime-types";
import fs from "fs";
import { sendBitcoin } from "../bitcoin.js";
import { createMempoolBitcoinClient } from "@0xflick/ordinals-backend";

export async function mintSingle({
  address,
  network,
  file,
  mimeType,
  feeRate,
  rpcuser,
  rpcpassword,
  rpcwallet,
  noSend,
  metadataFile,
  compress,
  padding = 546,
}: {
  address: string;
  file: string;
  mimeType?: string;
  network: BitcoinNetworkNames;
  feeRate: number;
  rpcuser: string;
  rpcpassword: string;
  rpcwallet: string;
  noSend: boolean;
  metadataFile?: string;
  compress?: boolean;
  padding?: number;
}) {
  const content = await fs.promises.readFile(file);
  const metadata = metadataFile
    ? await fs.promises.readFile(metadataFile, "utf8")
    : undefined;

  const privKey = generatePrivKey();
  console.log(`privKey: ${privKey}`);
  const response = await generateFundableGenesisTransaction({
    address,
    inscriptions: [
      {
        content,
        mimeType: (mimeType ?? lookup(file)) || "application/octet-stream",
        ...(metadata ? { metadata: JSON.parse(metadata) } : {}),
        compress,
      },
    ],
    padding,
    tip: 0,
    network,
    privKey,
    feeRate,
  });
  console.log(`Pay ${response.amount} to ${response.fundingAddress}`);
  let funded: readonly [string, number, number] | readonly [null, null, null] =
    [null, null, null];
  if (!noSend) {
    await sendBitcoin({
      fee_rate: feeRate,
      network,
      outputs: [[response.fundingAddress, response.amount]],
      rpcpassword,
      rpcuser,
      rpcwallet,
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
  const mempoolClient = createMempoolBitcoinClient({
    network,
  });
  const { fastestFee, halfHourFee } =
    await mempoolClient.fees.getFeesRecommended();
  const revealTx = generateRevealTransaction({
    feeRateRange: feeRate ? [feeRate, feeRate] : [fastestFee, halfHourFee],
    inputs: [
      {
        leaf: response.genesisLeaf,
        tapkey: response.genesisTapKey,
        cblock: response.genesisCblock,
        script: response.genesisScript,
        vout,
        txid,
        amount,
        address,
        secKey: response.secKey,
        padding: response.padding,
        inscriptions: response.inscriptionsToWrite,
      },
    ],
  });
  console.log(`Reveal miner fee: ${revealTx.minerFee}`);
  console.log(`Reveal platform fee: ${revealTx.platformFee}`);
  console.log(`Reveal underpriced: ${!!revealTx.underpriced}`);
  const revealTxId = await broadcastTx(revealTx.hex, network);
  console.log(`Reveal tx id: ${revealTxId}`);
}
