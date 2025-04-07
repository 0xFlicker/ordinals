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
import { sendBitcoin, sendRawTransaction } from "../bitcoin.js";
import { createMempoolBitcoinClient } from "../mempool.js";

export async function mintChildMany({
  address,
  network,
  files,
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
  files: string[];
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
  let inscriptionAddresses: string[] = [];
  let inscriptionPrivateKeys: string[] = [];

  if (address === "auto") {
    // Generate 3 separate key pairs and addresses for inscriptions
    for (let i = 0; i < 3; i++) {
      const privKey = generatePrivKey();
      const secKey = new KeyPair(privKey);
      const pubkey = secKey.pub.x;
      const [tseckey] = Tap.getSecKey(secKey);
      const [tpubkey, cblock] = Tap.getPubKey(pubkey);
      const addr = Address.p2tr.encode(
        tpubkey,
        networkNamesToTapScriptName(network),
      );

      console.log(`\nInscription Address ${i + 1}:`);
      console.log(`Private key: ${privKey}`);
      console.log(`Address: ${addr}`);
      console.log(`TapRoot secret key: ${tseckey}`);
      console.log(`TapRoot public key: ${tpubkey}`);
      console.log(`Control block: ${cblock}`);

      inscriptionAddresses.push(addr);
      inscriptionPrivateKeys.push(privKey);
    }
  } else {
    inscriptionAddresses.push(address);
    inscriptionPrivateKeys.push(generatePrivKey());
  }

  if (destinationParentAddress === "auto") {
    const privKey = generatePrivKey();
    const secKey = new KeyPair(privKey);
    const pubkey = secKey.pub.x;
    const [tseckey] = Tap.getSecKey(secKey);
    const [tpubkey, cblock] = Tap.getPubKey(pubkey);
    const addr = Address.p2tr.encode(
      tpubkey,
      networkNamesToTapScriptName(network),
    );

    console.log(`\nParent Destination Address:`);
    console.log(`Private key: ${privKey}`);
    console.log(`Address: ${addr}`);
    console.log(`TapRoot secret key: ${tseckey}`);
    console.log(`TapRoot public key: ${tpubkey}`);
    console.log(`Control block: ${cblock}`);

    destinationParentAddress = addr;
  }

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

  const inscriptions = await Promise.all(
    files.map(async (file) => ({
      content: await fs.promises.readFile(file),
      mimeType: (mimeType ?? lookup(file)) || "application/octet-stream",
      ...(metadata ? { metadata: JSON.parse(metadata) } : {}),
      compress,
    })),
  );

  console.log(`Writing ${inscriptions.length} inscriptions`);

  const responses = await Promise.all(
    inscriptionAddresses.map((address) =>
      generateFundableGenesisTransaction({
        address,
        inscriptions,
        padding,
        tip: tipAmount ?? 0,
        network,
        privKey: generatePrivKey(),
        feeRate,
        parentInscriptions,
      }),
    ),
  );

  const mempoolClient = createMempoolBitcoinClient({
    network,
  });

  // Fund all transactions
  const totalAmount = responses.reduce((sum, r) => sum + Number(r.amount), 0);
  console.log(`Pay ${totalAmount} total to fund all transactions`);

  const fundingOutputs: [string, string][] = responses.map((r) => [
    r.fundingAddress,
    r.amount,
  ]);

  if (!noSend) {
    await sendBitcoin({
      fee_rate: feeRate,
      network,
      outputs: fundingOutputs,
      rpcpassword,
      rpcuser,
      rpcwallet,
      generate: network === "regtest",
    });
  }

  console.log(
    `Waiting for funding on the following addresses: ${responses
      .map((r) => r.fundingAddress)
      .join(", ")}`,
  );

  // Wait for all transactions to be funded and collect their inputs
  const inputs = await Promise.all(
    responses.map(async (response, i) => {
      let funded = [null, null, null] as const;
      do {
        funded = await addressReceivedMoneyInThisTx(
          response.fundingAddress,
          network,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } while (funded[0] == null);
      console.log(
        `Writing ${response.inscriptionsToWrite.length} inscriptions`,
      );
      const [txid, vout, amount] = funded;
      return {
        leaf: response.genesisLeaf,
        tapkey: response.genesisTapKey,
        cblock: response.genesisCblock,
        script: response.genesisScript,
        vout,
        txid,
        amount,
        secKey: response.secKey,
        padding: response.padding,
        inscriptions: response.inscriptionsToWrite,
      };
    }),
  );

  console.log(`All transactions funded!`);

  const { fastestFee, halfHourFee } =
    await mempoolClient.fees.getFeesRecommended();

  // Generate single reveal transaction with all inputs
  const revealResponse = generateRevealTransaction({
    feeRateRange: feeRate ? [feeRate, feeRate] : [fastestFee, halfHourFee],
    inputs,
    ...(tipDestinationAddress && tipAmount
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

  console.log(`\nReveal transaction:`);
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

    await fs.promises.writeFile(
      "reveal.json",
      JSON.stringify(
        {
          ...revealTxSkeleton,
          hex: revealTx,
          inputs,
          outputs: fundingOutputs,
          responses,
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

    const revealTxId = await sendRawTransaction({
      network,
      rawtx: revealTx,
    });
    console.log(`Reveal tx id: ${revealTxId}`);
  }
}
