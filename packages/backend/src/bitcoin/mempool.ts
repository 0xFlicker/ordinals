import mempoolJS from "@mempool/mempool.js";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import Queue from "p-queue";
import { MempoolConfig } from "@mempool/mempool.js/lib/interfaces/index.js";
import {
  mainnetElectrumHostname,
  mainnetMempoolAuth,
  mainnetMempoolUrl,
  regtestMempoolUrl,
  testnetMempoolAuth,
  testnetMempoolUrl,
  mainnetElectrumPort,
  testnetElectrumPort,
  testnetElectrumHostname,
  testnet4ElectrumPort,
  testnet4ElectrumHostname,
  regtestElectrumPort,
  regtestElectrumHostname,
  testnetElectrumProtocol,
  testnet4ElectrumProtocol,
  mainnetElectrumProtocol,
  regtestElectrumProtocol,
} from "../index.js";
import { createLogger } from "../index.js";
import { lazySingleton } from "@0xflick/ordinals-models";
import {
  createElectrumClient,
  electrumGetAddressTransactions,
} from "../electrs/transactions.js";
const logger = createLogger({ name: "mempool" });
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
  constructor({
    address,
    scriptHash,
  }: {
    address?: string;
    scriptHash?: string;
  }) {
    super(
      address && scriptHash
        ? `No vout found for address ${address} and scriptHash ${scriptHash}`
        : address
        ? `No vout found for address ${address}`
        : scriptHash
        ? `No vout found for scriptHash ${scriptHash}`
        : "No vout found",
    );
  }
}

const checkTxo = async ({
  scriptHash,
  findValue,
  network,
}: {
  scriptHash: string;
  findValue?: number;
  network: BitcoinNetworkNames;
}) => {
  const { txid, vout, amount } = await pullElectrumTransactionsForAddress({
    scriptHash,
    findValue,
    network,
  });
  return {
    txid,
    vout,
    amount,
  };
};

export const mainnetElectrumClientFactory = lazySingleton(() => {
  return createElectrumClient({
    tls: mainnetElectrumProtocol.get(),
    hostname: mainnetElectrumHostname.get(),
    port: mainnetElectrumPort.get(),
  });
});

export const testnetElectrumClientFactory = lazySingleton(() => {
  return createElectrumClient({
    tls: testnetElectrumProtocol.get(),
    hostname: testnetElectrumHostname.get(),
    port: testnetElectrumPort.get(),
  });
});

export const testnet4ElectrumClientFactory = lazySingleton(() => {
  return createElectrumClient({
    tls: testnet4ElectrumProtocol.get(),
    hostname: testnet4ElectrumHostname.get(),
    port: testnet4ElectrumPort.get(),
  });
});

export const regtestElectrumClientFactory = lazySingleton(() => {
  return createElectrumClient({
    tls: regtestElectrumProtocol.get(),
    hostname: regtestElectrumHostname.get(),
    port: regtestElectrumPort.get(),
  });
});

export const electrumClientForNetwork = (network: BitcoinNetworkNames) => {
  switch (network) {
    case "mainnet":
      return mainnetElectrumClientFactory.get();
    case "testnet":
      return testnetElectrumClientFactory.get();
    case "testnet4":
      return testnet4ElectrumClientFactory.get();
    case "regtest":
      return regtestElectrumClientFactory.get();
    default:
      throw new Error(`Unknown Bitcoin network: ${network}`);
  }
};

export async function pullElectrumTransactionsForAddress({
  address,
  scriptHash,
  findValue,
  network,
}: {
  address?: string;
  scriptHash: string;
  findValue?: number;
  network: BitcoinNetworkNames;
}) {
  const txs = await electrumGetAddressTransactions({
    scriptHash,
    client: await electrumClientForNetwork(network),
  });
  for (const tx of txs) {
    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];
      if (
        output.scriptpubkey_address === address &&
        (findValue === undefined || output.value === findValue)
      ) {
        return {
          txid: tx.txid,
          vout: i,
          amount: output.value,
        };
      }
    }
  }
  throw new NoVoutFound({ address, scriptHash });
}

export const enqueueCheckTxo = ({
  scriptHash,
  findValue,
  network,
}: {
  scriptHash: string;
  network: BitcoinNetworkNames;
  mempoolBitcoinClient?: MempoolClient["bitcoin"];
  findValue?: number;
}) => {
  return processingQueue.add(() =>
    checkTxo({ scriptHash, findValue, network }),
  );
};

export const submitTx = async ({
  txhex,
  mempoolBitcoinClient,
}: {
  txhex: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
}): Promise<string> => {
  return processingQueue.add(() =>
    mempoolBitcoinClient.transactions.postTx({
      txhex,
    }),
  ) as Promise<string>;
};
