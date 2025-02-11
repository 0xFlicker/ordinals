import {
  addressReceivedMoneyInThisTx,
  generatePrivKey,
  broadcastTx,
  BitcoinNetworkNames,
  waitForInscriptionFunding,
  networkNamesToTapScriptName,
  generateFundableGenesisTransaction,
  bitcoinToSats,
  generateRevealTransaction,
} from "@0xflick/inscriptions";
import { lookup } from "mime-types";
import fs from "fs";
import { Address, Tx, Tap } from "@0xflick/tapscript";
import { SecretKey, KeyPair } from "@0xflick/crypto-utils";
import { sendBitcoin } from "../bitcoin.js";
import { createMempoolBitcoinClient } from "../mempool.js";

export async function mintChild({
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
  parentInscription,
  destinationParentAddress,
  parentTxid,
  parentIndex,
  parentSecKey,
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
  parentInscription: string;
  parentTxid: string;
  parentIndex: number;
  parentSecKey: string;
  destinationParentAddress: string;
}) {
  if (destinationParentAddress === "auto") {
    const privKey = generatePrivKey();
    const secKey = new KeyPair(privKey);
    const pubkey = secKey.pub.x;
    const [tseckey] = Tap.getSecKey(secKey);
    const [tpubkey, cblock] = Tap.getPubKey(pubkey);
    const address = Address.p2tr.encode(
      tpubkey,
      networkNamesToTapScriptName(network),
    );

    console.log(`privKey: ${privKey}`);
    console.log(`address: ${address}`);
    console.log(`tseckey: ${tseckey}`);
    console.log(`tpubkey: ${tpubkey}`);
    console.log(`cblock: ${cblock}`);
    destinationParentAddress = address;
  }
  const content = await fs.promises.readFile(file);
  const metadata = metadataFile
    ? await fs.promises.readFile(metadataFile, "utf8")
    : undefined;

  const privKey = generatePrivKey();
  const mempoolClient = createMempoolBitcoinClient({
    network,
  });

  const r = await mempoolClient.transactions.getTx({
    txid: parentTxid,
  });
  const { vout: parentVout } = r;
  const voutAmount = parentVout[parentIndex].value;
  const destinationParentAddressScript = Address.decode(
    destinationParentAddress,
  ).script;

  const parentTxs = [
    {
      parentVout: {
        value: voutAmount,
        scriptPubKey: destinationParentAddressScript,
      },
      secKey: new SecretKey(Buffer.from(parentSecKey, "hex")),
      txid: parentTxid,
      value: voutAmount,
      vout: parentIndex,
      inscriptionId: parentInscription,
    },
  ];

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
    parentInscriptions: parentTxs.map((tx) => ({
      txid: tx.txid,
      index: tx.vout,
    })),
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

  const { fastestFee, hourFee } = await mempoolClient.fees.getFeesRecommended();
  const revealTx = generateRevealTransaction({
    feeRateRange: [fastestFee, hourFee],
    inputs: [
      {
        address: address,
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
    parentTxs,
  });

  console.log(`Reveal tx: ${revealTx.hex}`);
  console.log(`Reveal tx miner fee: ${revealTx.minerFee}`);
  const revealTxId = await broadcastTx(revealTx.hex, network);
  console.log(`Reveal tx id: ${revealTxId}`);
}
