import mempoolJS from "@mempool/mempool.js";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import Queue from "p-queue";
import { MempoolConfig } from "@mempool/mempool.js/lib/interfaces/index.js";
import {
  mainnetMempoolAuth,
  mainnetMempoolUrl,
  regtestMempoolUrl,
  testnetMempoolAuth,
  testnetMempoolUrl,
} from "../index.js";

export type MempoolClient = ReturnType<typeof createMempoolClient>;
export function createMempoolClient({
  network,
  hostname,
  protocol,
  config,
}: {
  hostname: string;
  protocol: "http" | "https";
  network: BitcoinNetworkNames;
  config: MempoolConfig["config"];
}) {
  return mempoolJS({
    network,
    hostname,
    protocol,
    config,
  });
}

export interface IBitcoinContext {
  createMempoolBitcoinClient: (opts: {
    network: BitcoinNetworkNames;
  }) => MempoolClient["bitcoin"];
}
const urlForNetworkName = (
  network: BitcoinNetworkNames,
): [string | null, string | null] => {
  switch (network) {
    case "regtest":
      return [regtestMempoolUrl.get(), null];
    case "testnet":
      return [testnetMempoolUrl.get(), testnetMempoolAuth.get()];
    case "mainnet":
      return [mainnetMempoolUrl.get(), mainnetMempoolAuth.get()];
    default:
      throw new Error(`Unknown Bitcoin network: ${network}`);
  }
};

export function createMempoolBitcoinClient({
  network,
}: {
  network: BitcoinNetworkNames;
}): MempoolClient["bitcoin"] {
  const [u, auth] = urlForNetworkName(network);
  if (!u) {
    throw new Error(`No mempool URL for network: ${network}`);
  }
  const url = new URL(u);
  const protocol = url.protocol.slice(0, -1);
  if (!["http", "https"].includes(protocol)) {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }

  return createMempoolClient({
    network,
    hostname: url.host,
    protocol: protocol as "http" | "https",
    config: {
      ...(auth && {
        headers: {
          Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
        },
      }),
    },
  }).bitcoin as MempoolClient["bitcoin"];
}

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
