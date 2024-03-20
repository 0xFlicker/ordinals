import { createDynamoDbFundingDao } from "@0xflick/ordinals-backend";
import { ID_Collection } from "@0xflick/ordinals-models";

export async function expireAllFundings({
  collectionId,
}: {
  collectionId: string;
}) {
  const fundingDao = createDynamoDbFundingDao();
  for await (const funding of await fundingDao.listAllFundingsByStatus({
    id: collectionId as ID_Collection,
    fundingStatus: "funding",
  })) {
    await fundingDao.expire({ id: funding.id });
  }

  for await (const { id } of await fundingDao.listAllFundingsByStatus({
    id: collectionId as ID_Collection,
    fundingStatus: "genesis",
  })) {
    const funding = await fundingDao.getFunding(id);
    if (funding.revealTxids === undefined) {
      console.log("Expiring funding", funding.id);
      await fundingDao.expire({ id: funding.id });
    }
  }
}
