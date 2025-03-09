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
  destinationParentAddress,
  parentTxid,
  parentIndex,
  parentInscription,
  parentSecKey,
  parentAmount,
  tipDestinationAddress,
  tipAmount,
}: {
  address: string;
  file: string;
  mimeType?: string;
  network: BitcoinNetworkNames;
  feeRate?: number;
  rpcuser: string;
  rpcpassword: string;
  rpcwallet: string;
  noSend: boolean;
  metadataFile?: string;
  compress?: boolean;
  padding?: number;
  parentAmount: number;
  parentInscription: string;
  parentTxid: string;
  parentIndex: number;
  parentSecKey: string;
  tipDestinationAddress?: string;
  tipAmount?: number;
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

  const parentInscriptions: { txid: string; index: number }[] = [
    parentInscription.split("i").reduce(
      (acc, curr, index) => {
        if (index === 0) {
          return { txid: curr, index: null };
        }
        return { txid: acc.txid, index: Number(curr) };
      },
      { txid: null, index: null },
    ),
  ];

  const inscriptions = [
    {
      content,
      mimeType: (mimeType ?? lookup(file)) || "application/octet-stream",
      ...(metadata ? { metadata: JSON.parse(metadata) } : {}),
      compress,
    },
  ];
  inscriptions.push(inscriptions[0]);
  inscriptions.push(inscriptions[0]);
  inscriptions.push(inscriptions[0]);
  inscriptions.push(inscriptions[0]);
  inscriptions.push(inscriptions[0]);
  inscriptions.push(inscriptions[0]);

  const privKey = generatePrivKey();
  const response = await generateFundableGenesisTransaction({
    address,
    inscriptions,
    padding,
    tip: tipAmount,
    network,
    privKey,
    feeRate,
    parentInscriptions,
  });
  const mempoolClient = createMempoolBitcoinClient({
    network,
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
  const { fastestFee, halfHourFee } =
    await mempoolClient.fees.getFeesRecommended();
  const revealResponse = generateRevealTransaction({
    // feeRateRange: feeRate ? [feeRate, feeRate] : [fastestFee, halfHourFee],
    feeRateRange: [5, 3],
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
    feeTarget: tipAmount,
    feeDestinations: [
      {
        address: tipDestinationAddress,
        percentage: 100,
      },
    ],
    parentTxs: [
      {
        vin: {
          txid: parentTxid,
          vout: parentIndex,
        },
        value: parentAmount,
        secKey: new SecretKey(Buffer.from(parentSecKey, "hex")),
        destinationAddress: destinationParentAddress,
      },
    ],
  });
  const { hex: revealTx, minerFee, platformFee, underpriced } = revealResponse;
  // console.log(`Reveal tx: ${revealTx}`);
  console.log(`Miner fee: ${minerFee}`);
  console.log(`Platform fee: ${platformFee}`);
  console.log(`Underpriced: ${!!underpriced}`);

  try {
    const revealTxId = await broadcastTx(revealTx, network);
    console.log(`Reveal tx id: ${revealTxId}`);
  } catch (e) {
    console.error(e);
    // Decode and print the reveal tx
    const revealTxSkeleton = Tx.decode(Buffer.from(revealTx, "hex"));
    console.log(revealTx);
    console.log(
      JSON.stringify(
        revealTxSkeleton,
        function (this: any, key: string, value: any) {
          if (typeof value === "bigint") {
            return satsToBitcoin(value);
          }
          return value;
        },
        2,
      ),
    );
  }
}
