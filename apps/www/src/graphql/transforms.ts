import { BitcoinNetworkType } from "sats-connect";
import { BitcoinNetwork } from "./types";

export const toGraphqlBitcoinNetwork = (
  network: BitcoinNetworkType
): BitcoinNetwork => {
  switch (network) {
    case BitcoinNetworkType.Mainnet:
      return BitcoinNetwork.Mainnet;
    case BitcoinNetworkType.Testnet:
      return BitcoinNetwork.Testnet;
    case BitcoinNetworkType.Regtest:
      return BitcoinNetwork.Regtest;
    case BitcoinNetworkType.Testnet4:
      return BitcoinNetwork.Testnet4;
    default:
      throw new Error(`Invalid Bitcoin network: ${network}`);
  }
};

export const fromGraphqlBitcoinNetwork = (
  network: BitcoinNetwork
): BitcoinNetworkType => {
  switch (network) {
    case BitcoinNetwork.Mainnet:
      return BitcoinNetworkType.Mainnet;
    case BitcoinNetwork.Testnet:
      return BitcoinNetworkType.Testnet;
    case BitcoinNetwork.Regtest:
      return BitcoinNetworkType.Regtest;
    case BitcoinNetwork.Testnet4:
      return BitcoinNetworkType.Testnet4;
    default:
      throw new Error(`Invalid Bitcoin network: ${network}`);
  }
};
