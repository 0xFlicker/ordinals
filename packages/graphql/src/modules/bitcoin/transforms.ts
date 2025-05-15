import { BitcoinNetworkNames } from "@0xflick/ordinals-models";
import { BitcoinNetwork, FeeLevel } from "../../generated-types/graphql.js";
import { IFeesRecommended } from "@0xflick/ordinals-backend";

export function toBitcoinNetworkName(
  bitcoinNetworkName: BitcoinNetwork,
): BitcoinNetworkNames {
  switch (bitcoinNetworkName) {
    case "MAINNET":
      return "mainnet";
    case "TESTNET":
      return "testnet";
    case "REGTEST":
      return "regtest";
    case "TESTNET4":
      return "testnet4";
    default:
      throw new Error(`Unsupported network: ${bitcoinNetworkName}`);
  }
}

export function toGraphqlBitcoinNetworkName(
  bitcoinNetworkName: BitcoinNetworkNames,
): BitcoinNetwork {
  switch (bitcoinNetworkName) {
    case "mainnet":
      return "MAINNET";
    case "testnet":
      return "TESTNET";
    case "regtest":
      return "REGTEST";
    case "testnet4":
      return "TESTNET4";
    default:
      throw new Error(`Unsupported network: ${bitcoinNetworkName}`);
  }
}

export function toFeeLevel(feeLevel: FeeLevel, fees: IFeesRecommended) {
  switch (feeLevel) {
    case "GLACIAL":
      return fees.minimumFee;
    case "LOW":
      return fees.hourFee;
    case "MEDIUM":
      return fees.halfHourFee;
    case "HIGH":
      return fees.fastestFee;
    default:
      throw new Error(`Unsupported fee level: ${feeLevel}`);
  }
}

export function feeLevelToBlocks(feeLevel: FeeLevel) {
  switch (feeLevel) {
    case "GLACIAL":
      return 12;
    case "LOW":
      return 6;
    case "MEDIUM":
      return 3;
    case "HIGH":
      return 1;
    default:
      throw new Error(`Unsupported fee level: ${feeLevel}`);
  }
}
