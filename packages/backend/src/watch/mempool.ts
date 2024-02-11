import Queue from "p-queue";
import { MempoolClient } from "../bitcoin/mempool.js";

const processingQueue = new Queue({ concurrency: 24 });

export class NoVoutFound extends Error {
  constructor({ address }: { address: string }) {
    super(`No vout found for address ${address}`);
  }
}

const checkTxo = async ({
  address,
  mempoolBitcoinClient,
  findValue,
}: {
  address: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  findValue?: number;
}) => {
  const { txid, vout, amount } = await fetchFunding({
    address,
    mempoolBitcoinClient,
    findValue,
  });
  return {
    address,
    txid,
    vout,
    amount,
  };
};

async function fetchFunding({
  address,
  mempoolBitcoinClient,
  findValue,
}: {
  address: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  findValue?: number;
}) {
  const txs = await mempoolBitcoinClient.addresses.getAddressTxs({ address });
  for (const tx of txs) {
    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];
      if (output.scriptpubkey_address === address) {
        if (
          (findValue !== undefined && output.value === findValue) ||
          findValue === undefined
        ) {
          return {
            txid: tx.txid,
            vout: i,
            amount: output.value,
          };
        }
      }
    }
  }
  throw new NoVoutFound({ address });
}

export const enqueueCheckTxo = ({
  address,
  mempoolBitcoinClient,
  findValue,
}: {
  address: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  findValue?: number;
}) => {
  return processingQueue.add(() =>
    checkTxo({ address, mempoolBitcoinClient, findValue }),
  );
};
