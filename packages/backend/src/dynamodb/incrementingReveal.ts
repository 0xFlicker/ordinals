import { ID_Collection } from "@0xflick/ordinals-models";
import { FundingDao } from "./funding.js";

export class IncrementingRevealDao<
  ItemMeta extends Record<string, any> = {},
  CollectionMeta extends Record<string, any> = {},
> {
  private fundingDao: FundingDao<ItemMeta, CollectionMeta>;
  public collectionId: ID_Collection;

  constructor(
    collectionId: ID_Collection,
    fundingDao: FundingDao<ItemMeta, CollectionMeta>,
  ) {
    this.fundingDao = fundingDao;
    this.collectionId = collectionId;
  }

  public async nextTokenId() {
    const nextTokenId = await this.fundingDao.incrementCollectionTotalCount(
      this.collectionId,
    );
    return { tokenId: nextTokenId };
  }

  public async getCollection(id: ID_Collection) {
    return this.fundingDao.getCollection(id);
  }
}
