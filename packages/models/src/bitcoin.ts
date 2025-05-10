export type BitcoinNetworkNames =
  | "mainnet"
  | "testnet"
  | "regtest"
  | "testnet4";

export function toBitcoinNetworkName(name: string): BitcoinNetworkNames {
  switch (name.toLowerCase()) {
    case "mainnet":
      return "mainnet";
    case "testnet":
      return "testnet";
    case "regtest":
      return "regtest";
    case "testnet4":
      return "testnet4";
    default:
      throw new Error(`Unknown Bitcoin network name: ${name}`);
  }
}

export function isBitcoinNetworkName(
  name: string,
): name is BitcoinNetworkNames {
  try {
    toBitcoinNetworkName(name);
    return true;
  } catch (e) {
    return false;
  }
}
