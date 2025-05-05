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
  collectionId?: string;
  creatorId?: string;
};
