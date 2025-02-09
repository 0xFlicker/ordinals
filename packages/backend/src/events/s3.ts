import { ID_Collection } from "@0xflick/ordinals-models";
import { createDynamoDbFundingDao } from "../index.js";

export async function handleUploadedParentInscription(
  collectionId: ID_Collection,
) {
  const collectionFundingDao = createDynamoDbFundingDao<
    {},
    {
      parentInscriptionContentExists?: boolean;
    }
  >();
  await collectionFundingDao.updateCollectionMeta(collectionId, {
    parentInscriptionContentExists: true,
  });
}
