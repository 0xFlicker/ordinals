import {
  ID_Collection,
  TCollectionModel,
  TCollectionParentInscription,
} from "@0xflick/ordinals-models";

export class CollectionModel {
  public id: ID_Collection;
  public name: string;
  public totalCount: number;
  public maxSupply?: number;
  public pendingCount: number;
  public meta: Record<string, any>;
  public parentInscription?: TCollectionParentInscription;

  constructor(
    model: TCollectionModel,
    parentInscription?: TCollectionParentInscription,
  ) {
    this.id = model.id;
    this.name = model.name;
    this.totalCount = model.totalCount;
    this.maxSupply = model.maxSupply;
    this.pendingCount = model.pendingCount;
    this.meta = model.meta ?? {};
    this.parentInscription = parentInscription;
  }
}
