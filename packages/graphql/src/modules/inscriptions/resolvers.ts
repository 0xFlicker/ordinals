import { InscriptionsModule } from "./generated-types/module-types";
import { InscriptionModel } from "./models.js";
import { InscriptionDataLoader } from "./providers";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "inscriptions",
});

export const resolvers: InscriptionsModule.Resolvers = {
  Query: {
    inscriptions: async (
      _,
      { query },
      { fundingDao, userDao, fundingDocDao },
    ) => {
      let userId = query.userId;
      if (!userId && query.address) {
        const user = await userDao.getUserByAddress({ address: query.address });
        userId = user.userId;
      }
      if (!userId && query.handle) {
        const user = await userDao.getUserByHandle({ handle: query.handle });
        userId = user.userId;
      }
      if (!userId) {
        throw new Error("User not found");
      }
      const fundingIds = await fundingDao.getAllFundingsByCreatorUserId(userId);
      logger.info({ fundingIds }, "Found fundingIds for user");
      const dataLoader = new InscriptionDataLoader(fundingDocDao, fundingDao);
      const fundings = await Promise.all(
        fundingIds.map((fundingId) => dataLoader.getTransactionById(fundingId)),
      );
      logger.info({ fundings: fundings.length }, "Found fundings for user");
      const inscriptions: InscriptionModel[] = [];
      for (const funding of fundings) {
        for (let i = 0; i < funding.numberOfInscriptions; i++) {
          inscriptions.push(
            new InscriptionModel({
              funding,
              index: i,
              batchTransactionOffset: funding.batchTransactionOffset ?? 0,
              inscriptionDataLoader: dataLoader,
            }),
          );
        }
      }
      return inscriptions;
    },
  },
};
