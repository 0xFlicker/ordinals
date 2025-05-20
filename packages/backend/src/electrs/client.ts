import ElectrumClient from "@mempool/electrum-client";
import {
  mainnetElectrumHostname,
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
  ElectrumClientInstance,
  ElectrumClientConfig,
} from "../index.js";
import { lazySingleton } from "@0xflick/ordinals-models";

/**
 * Creates an Electrum client instance
 */
export async function createElectrumClient(
  config: ElectrumClientConfig,
): Promise<ElectrumClientInstance> {
  const { tls, hostname, port } = config;
  const protocol = tls ? "tls" : "tcp";
  const client = new ElectrumClient(
    port,
    hostname,
    protocol,
    {},
    {
      onConnect: () => {
        console.log(`Connected to Electrum server at ${hostname}:${port}`);
      },
      onClose: () => {
        console.log(`Disconnected from Electrum server at ${hostname}:${port}`);
      },
      onError: (err) => {
        console.error(`Electrum error: ${JSON.stringify(err)}`);
      },
      onLog: (str) => {
        console.log(`Electrum log: ${str}`);
      },
    },
  );

  return client
    .initElectrum({
      client: "nodejs",
      version: "1.4",
    })
    .then(() => {
      return {
        client,
        isConnected: true,
      };
    })
    .catch((err) => {
      console.error(
        `Error connecting to Electrum server at ${hostname}:${port}: ${err}`,
      );
      throw err;
    });
}

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
