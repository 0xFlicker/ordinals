import { BitcoinNetworkNames } from "./bitcoin.js";
import { Address } from "@cmdcode/tapscript";
import { ID_Collection } from "./collection.js";
export type ID_AddressInscription = string & { __id_addressInscription: never };

export function toAddressInscriptionId(id: string): ID_AddressInscription {
  return id as ID_AddressInscription;
}

export type TFundingStatus =
  | "funding"
  | "funded"
  | "genesis" // DEPRECATED
  | "batch"
  | "batch_revealed"
  | "revealed"
  | "expired"
  | "failed"
  | "refunded";

export interface IAddressInscriptionModel<T = Record<string, any>> {
  address: string;
  network: BitcoinNetworkNames;
  id: ID_AddressInscription;
  creatorUserId?: string;
  collectionId?: ID_Collection;
  revealTxid?: string;
  fundingTxid?: string;
  fundingVout?: number;
  refundedTxid?: string;
  fundingStatus: TFundingStatus;
  fundedAt?: Date;
  createdAt: Date;
  lastChecked?: Date;
  nextCheckAt?: Date;
  timesChecked: number;
  fundingAmountBtc: string;
  fundingAmountSat: number;
  destinationAddress: string;
  tipAmountSat?: number;
  tipAmountDestination?: string;
  parentInscriptionId?: string;
  sizeEstimate: number;
  genesisScriptHash: string;
  batchId?: string;
  numberOfInscriptions: number;
  batchTransactionOffset?: number;
  meta: T;
  type: "address-inscription";
}

export function hashAddress(address: string) {
  return Buffer.from(Address.decode(address).data).toString("hex");
}

export class AddressInscriptionModel<T extends Record<string, any> = {}>
  implements IAddressInscriptionModel<T>
{
  public address: string;
  public network: BitcoinNetworkNames;
  public collectionId?: ID_Collection;
  public destinationAddress: string;
  public revealTxid?: string;
  public fundingTxid?: string;
  public fundingVout?: number;
  public refundedTxid?: string;
  public fundingStatus: TFundingStatus;
  public lastChecked?: Date;
  public nextCheckAt?: Date;
  public createdAt: Date;
  public fundedAt?: Date;
  public timesChecked: number;
  public fundingAmountBtc: string;
  public fundingAmountSat: number;
  public genesisScriptHash: string;
  public tipAmountSat?: number;
  public tipAmountDestination?: string;
  public sizeEstimate: number;
  public numberOfInscriptions: number;
  public batchTransactionOffset?: number;
  public meta: T;
  public type: "address-inscription" = "address-inscription";

  constructor(
    item: Omit<IAddressInscriptionModel<T>, "id" | "type"> & { id?: string },
  ) {
    this.address = item.address;
    this.network = item.network;
    if (item.id) {
      this._id = toAddressInscriptionId(item.id);
    }
    this.collectionId = item.collectionId;
    this.destinationAddress = item.destinationAddress;
    this.revealTxid = item.revealTxid;
    this.fundingTxid = item.fundingTxid;
    this.fundingVout = item.fundingVout;
    this.refundedTxid = item.refundedTxid;
    this.fundingStatus = item.fundingStatus;
    this.lastChecked = item.lastChecked;
    this.nextCheckAt = item.nextCheckAt ?? new Date();
    this.timesChecked = item.timesChecked;
    this.createdAt = item.createdAt;
    this.fundedAt = item.fundedAt;
    this.fundingAmountBtc = item.fundingAmountBtc;
    this.fundingAmountSat = item.fundingAmountSat;
    this.genesisScriptHash = item.genesisScriptHash;
    this.tipAmountSat = item.tipAmountSat;
    this.tipAmountDestination = item.tipAmountDestination;
    this.meta = item.meta;
    this.sizeEstimate = item.sizeEstimate;
    this.numberOfInscriptions = item.numberOfInscriptions;
    this.batchTransactionOffset = item.batchTransactionOffset;
  }

  private _id?: ID_AddressInscription;
  public get id(): ID_AddressInscription {
    if (!this._id) {
      this._id = toAddressInscriptionId(hashAddress(this.address));
    }
    return this._id;
  }
}
