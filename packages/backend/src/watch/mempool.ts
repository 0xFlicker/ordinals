import Queue from "p-queue";
import { MempoolClient } from "../bitcoin/mempool.js";
import { createLogger } from "../index.js";
const processingQueue = new Queue({ concurrency: 24 });
const logger = createLogger({ name: "mempool" });
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
  try {
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
    logger.debug({ address }, `Funding not found for address`);
    throw new NoVoutFound({ address });
  } catch (error) {
    if (error instanceof NoVoutFound) {
      throw error;
    }
    logger.error(error, `Error fetching funding for address ${address}`);
    throw error;
  }
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
