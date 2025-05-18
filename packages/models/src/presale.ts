import { BitcoinNetworkNames } from "./bitcoin.js";
import { Address } from "@cmdcode/tapscript";
import { ID_Collection } from "./collection.js";

export type ID_Presale = string & { __id_presale: never };

export function toPresaleId(id: string): ID_Presale {
  return id as ID_Presale;
}

export type TPresaleStatus =
  | "pending"
  | "funding"
  | "funded"
  | "sweeping"
  | "swept";

export interface IPresaleModel {
  createdAt: Date;
  nextCheckAt?: Date;
  address: string;
  network: BitcoinNetworkNames;
  id: ID_Presale;
  secKey: string;
  collectionId: ID_Collection;
  fundingStatus: TPresaleStatus;
  fundedAt?: Date;
  lastChecked?: Date;
  timesChecked: number;
  fundingAmountBtc: string;
  fundingAmountSat: number;
  destinationAddress: string;
  tipAmountSat?: number;
  tipAmountDestination?: string;
  farcasterFid?: number;
  genesisScriptHash: string;
  sizeEstimate: number;
  numberOfInscriptions: number;
  batchTransactionOffset?: number;
}
