// Reveals a funded funding inddivudally

import {
  BitcoinNetworkNames,
  bitcoinToSats,
  generateRevealTransaction,
} from "@0xflick/inscriptions";
import {
  createDynamoDbFundingDao,
  createMempoolBitcoinClient,
  createMempoolClient,
  createStorageFundingDocDao,
  enqueueCheckTxo,
  inscriptionBucket,
} from "@0xflick/ordinals-backend";
import { sendRawTransaction } from "../bitcoin";

export async function revealFunding({
  fundingId,
  feeRateRange,
  network,
}: {
  fundingId: string;
  feeRateRange: [number, number];
  network: BitcoinNetworkNames;
}) {
  const fundingDao = createDynamoDbFundingDao();
  const fundingDocDao = createStorageFundingDocDao({
    bucketName: inscriptionBucket.get(),
  });

  const funding = await fundingDao.getFunding(fundingId);

  if (!funding) {
    throw new Error(`Funding ${fundingId} not found`);
  }

  const fundingDoc = await fundingDocDao.getInscriptionTransaction({
    fundingAddress: funding.address,
    id: fundingId,
  });

  if (!fundingDoc) {
    throw new Error(`Funding doc ${fundingId} not found`);
  }

  // get the funding tx and vout
  const mempoolClient = createMempoolBitcoinClient({
    network,
  });

  const utxo = await enqueueCheckTxo({
    scriptHash: funding.genesisScriptHash,
    mempoolBitcoinClient: mempoolClient,
    findValue: Number(bitcoinToSats(fundingDoc.fundingAmountBtc)),
  });

  if (!utxo) {
    throw new Error(`UTXO not found for funding ${fundingId}`);
  }

  const { vout, txid } = utxo;

  const revealTx = await generateRevealTransaction({
    feeRateRange,
    inputs: [
      {
        amount: Number(bitcoinToSats(fundingDoc.fundingAmountBtc)),
        cblock: fundingDoc.genesisCBlock,
        leaf: fundingDoc.genesisLeaf,
        rootTapKey: fundingDoc.rootTapKey,
        script: fundingDoc.genesisScript,
        tapkey: fundingDoc.genesisTapKey,
        txid,
        vout,
        secKey: Buffer.from(fundingDoc.secKey, "hex"),
        padding: fundingDoc.padding,
        inscriptions: [
          {
            destinationAddress: funding.destinationAddress,
          },
        ],
      },
    ],
    ...(funding.tipAmountDestination && funding.tipAmountSat
      ? {
          feeDestinations: [
            { address: funding.tipAmountDestination, weight: 1 },
          ],
          feeTarget: funding.tipAmountSat,
        }
      : {}),
  });

  console.log(revealTx.hex);
}
