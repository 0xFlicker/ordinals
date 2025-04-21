import type {
  BitcoinScriptData,
  WritableInscription,
} from "@0xflick/inscriptions";
import { BitcoinNetworkNames } from "../bitcoin.js";
import { ID_AddressInscription } from "../addressInscription.js";
import { ID_Collection } from "../collection.js";

export {
  WritableInscription,
  InscriptionFile,
  InscriptionId,
  InscriptionContent,
} from "@0xflick/inscriptions";

export interface IInscriptionDocCommon {
  id: ID_AddressInscription;
  collectionId?: ID_Collection;
  network: BitcoinNetworkNames;
  fundingAddress: string;
  fundingAmountBtc: string;
  genesisTapKey: string;
  genesisLeaf: string;
  genesisCBlock: string;
  genesisScript: BitcoinScriptData[];
  refundTapKey: string;
  refundLeaf: string;
  refundCBlock: string;
  rootTapKey: string;
  refundScript: BitcoinScriptData[];
  secKey: string;
  totalFee: number;
  overhead: number;
  padding: number;
  writableInscriptions: WritableInscription[];
  tip: number;
  tipAmountDestination: string;
  parentInscriptionId?: string;
}

export type TInscriptionDoc = IInscriptionDocCommon;
