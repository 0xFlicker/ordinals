export type ID_Collection = string & { __id_collection: never };

export function toCollectionId(id: string): ID_Collection {
  return id as ID_Collection;
}

export type TCollectionParentInscription = {
  parentInscriptionId?: string;
  parentInscriptionFileName?: string;
  parentInscriptionContentType?: string;
  uploadUrl?: string;
  multipartUploadId?: string;
};

export type TCollectionModel<T = Record<string, any>> = {
  id: ID_Collection;
  name: string;
  maxSupply: number;
  pendingCount: number;
  totalCount: number;
  meta?: T;
  type: "collection";
};
