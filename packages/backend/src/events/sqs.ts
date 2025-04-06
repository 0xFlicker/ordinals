import { BitcoinNetworkNames } from "@0xflick/ordinals-models";

export type InsufficientFundsEvent = {
  fundingId: string;
  address: string;
  fundingAmountSat: number;
  txid: string;
  vout: number;
  fundedAmount: number;
  network: BitcoinNetworkNames;
};

export type InvalidFundingEvent = InsufficientFundsEvent;

export type FundedEvent = {
  fundingId: string;
  address: string;
  fundingAmountSat: number;
  txid: string;
  vout: number;
  fundedAmount: number;
  network: BitcoinNetworkNames;
};

export type GenesisEvent = {
  fundingId: string;
  genesisTxid: string;
  fundingTxid: string;
  fundedAmount: number;
  fundedAddress: string;
  network: BitcoinNetworkNames;
};

export type RevealEvent = {
  fundingId: string;
  fundingTxid: string;
  genesisTxid: string;
  revealTxid: string;
  minerFee: number;
  platformFee: number;
  inscriptionFee: number;
  network: BitcoinNetworkNames;
};
