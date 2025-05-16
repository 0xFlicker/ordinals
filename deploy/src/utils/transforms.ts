import { BitcoinNetwork } from "./types.js";

export function networkToBitcoinFlags(network: BitcoinNetwork) {
  switch (network) {
    case "testnet":
      return "-testnet";
    case "testnet4":
      return "-testnet4";
    case "mainnet":
      return "";
    case "regtest":
      return "-regtest";
  }
}

export function networkToElectrsNetwork(network: BitcoinNetwork) {
  switch (network) {
    case "testnet":
      return "testnet";
    case "testnet4":
      return "testnet4";
    case "mainnet":
      return "bitcoin";
    case "regtest":
      return "regtest";
    default:
      return network;
  }
}

export function networkToElectrsPort(network: BitcoinNetwork) {
  switch (network) {
    case "testnet":
      return 60001;
    case "testnet4":
      return 60002;
    case "mainnet":
      return 50001;
    case "regtest":
      return 50002;
  }
}

export function networkToRpcPort(network: BitcoinNetwork) {
  switch (network) {
    case "testnet":
      return 18332;
    case "testnet4":
      return 48332;
    case "mainnet":
      return 8332;
    case "regtest":
      return 18443;
  }
}

// Default P2P port for Bitcoin nodes
export function networkToP2pPort(network: BitcoinNetwork) {
  switch (network) {
    case "testnet":
      return 18333;
    case "testnet4":
      return 48333;
    case "mainnet":
      return 8333;
    case "regtest":
      return 18444;
  }
}
