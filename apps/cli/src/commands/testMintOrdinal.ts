import {
  addressReceivedMoneyInThisTx,
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  generatePrivKey,
  broadcastTx,
  BitcoinNetworkNames,
} from "@0xflick/inscriptions";
import { createMempoolBitcoinClient } from "@0xflick/ordinals-backend";

function str2ab(text: string) {
  return new TextEncoder().encode(text);
}
const testInscriptions = [
  {
    content: str2ab("Hello World 1"),
    mimeType: "text/plain;charset=utf-8",
  },
  {
    content: str2ab("Hello World 2"),
    mimeType: "text/plain;charset=utf-8",
  },
];

export async function testMintOrdinals({
  address,
  network,
  feeRate,
}: {
  address: string;
  network: BitcoinNetworkNames;
  feeRate?: number;
}) {
  const privKey = generatePrivKey();
  console.log(`privKey: ${privKey}`);
  const response = await generateFundableGenesisTransaction({
    address,
    inscriptions: testInscriptions,
    padding: 10000,
    tip: 0,
    network,
    privKey,
    feeRate: 1,
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
  });
  console.log(`Reveal tx: ${revealTx}`);
  console.log(`Reveal miner fee: ${revealTx.minerFee}`);
  console.log(`Reveal platform fee: ${revealTx.platformFee}`);
  console.log(`Reveal underpriced: ${revealTx.underpriced}`);
  const revealTxId = await broadcastTx(revealTx.hex, network);
  console.log(`Reveal tx id: ${revealTxId}`);
}
