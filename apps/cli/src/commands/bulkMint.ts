import fs from "fs";
import { globIterate } from "glob";
import { lookup } from "mime-types";
import {
  addressReceivedMoneyInThisTx,
  generateFundableGenesisTransaction,
  generatePrivKey,
  broadcastTx,
  generateRevealTransaction,
  BitcoinNetworkNames,
  InscriptionContent,
  loopTilAddressReceivesMoney,
  bitcoinToSats,
} from "@0xflick/inscriptions";
import { createMempoolBitcoinClient } from "@0xflick/ordinals-backend";

export async function bulkMint({
  address,
  network,
  globStr,
  outputFile,
  privKey,
  feeRate,
}: {
  address: string;
  network: BitcoinNetworkNames;
  globStr: string;
  outputFile: string;
  privKey?: string;
  feeRate: number;
}) {
  privKey = privKey ?? generatePrivKey();
  console.log(`privKey: ${privKey}`);
  const inscriptions: (InscriptionContent & {
    path: string;
  })[] = [];
  for await (const path of globIterate(globStr)) {
    const content = await fs.promises.readFile(path);
    const mimeType = lookup(path) || "application/octet-stream";
    inscriptions.push({
      content,
      mimeType,
      path,
    });
  }

  console.log(`Found ${inscriptions.length} inscriptions`);
  const padding = 540;
  const response = await generateFundableGenesisTransaction({
    address,
    inscriptions,
    padding: padding,
    tip: 0,
    network,
    privKey,
    feeRate,
  });
  console.log(`Pay ${response.amount} to ${response.fundingAddress}`);
  let funded: readonly [string, number, number] | readonly [null, null, null] =
    [null, null, null];
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
  await loopTilAddressReceivesMoney(response.fundingAddress, true, network);

  console.log(`Revealing....`);
  const inscriptionIds: string[] = [];
  const mempoolClient = createMempoolBitcoinClient({ network });
  const { fastestFee, hourFee } = await mempoolClient.fees.getFeesRecommended();
  const revealTx = generateRevealTransaction({
    feeRateRange: [fastestFee, hourFee],
    inputs: [
      {
        amount: Number(bitcoinToSats(response.amount)),
        cblock: response.genesisCblock,
        leaf: response.genesisLeaf,
        script: response.genesisScript,
        tapkey: response.genesisTapKey,
        vout,
        txid,
        secKey: response.secKey,
        padding,
        inscriptions: response.inscriptionsToWrite,
      },
    ],
  });
  console.log(`Reveal tx: ${revealTx.hex}`);
  console.log(`Reveal tx miner fee: ${revealTx.minerFee}`);
  const revealTxId = await broadcastTx(revealTx.hex, network);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  for (let i = 0; i < response.inscriptionsToWrite.length; i++) {
    inscriptionIds[i] = `${revealTxId}i${i}`;
    console.log(`Reveal tx id: ${revealTxId}`);
  }

  // map inscriptions to file paths
  const commonPrefix = longestCommonPrefix(inscriptions.map((i) => i.path));
  const inscriptionMap: Record<string, string> = {};
  inscriptionIds.forEach((id, i) => {
    const path = inscriptions[i].path.replace(commonPrefix, "");
    inscriptionMap[path] = id;
  });

  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(inscriptionMap, null, 2),
  );
}

function longestCommonPrefix(choices: string[]): string {
  if (!choices.length) return "";

  let prefix = choices[0];
  for (let i = 1; i < choices.length; i++) {
    while (choices[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return "";
    }
  }
  return prefix;
}
