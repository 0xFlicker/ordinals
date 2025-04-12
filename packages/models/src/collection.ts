export type ID_Collection = string & { __id_collection: never };

export function toCollectionId(id: string): ID_Collection {
  return id as ID_Collection;
}

export type TCollectionParentInscription = {
  parentInscriptionUploadId?: string;
  parentInscriptionFileName?: string;
  parentInscriptionId?: string;
  parentInscriptionAddress?: string;
  parentInscriptionContentExists?: boolean;
  parentInscriptionFundingId?: string;
  parentInscriptionVout?: number;
  parentInscriptionTxid?: string;
};

export type TCollectionModel<T = Record<string, any>> = {
  id: ID_Collection;
  name: string;
  maxSupply?: number;
  pendingCount: number;
  totalCount: number;
  meta: T;
  type: "collection";
};
