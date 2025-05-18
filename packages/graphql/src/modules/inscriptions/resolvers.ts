import { InscriptionsModule } from "./generated-types/module-types";
import { InscriptionModel } from "./models.js";
import { InscriptionDataLoader } from "./providers";

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
      const dataLoader = new InscriptionDataLoader(fundingDocDao, fundingDao);
      const fundings = await Promise.all(
        fundingIds.map((fundingId) => dataLoader.getTransactionById(fundingId)),
      );
      const inscriptions: InscriptionModel[] = [];
      for (const funding of fundings) {
        if (typeof funding.batchTransactionOffset !== "number") {
          continue;
        }
        for (let i = 0; i < funding.numberOfInscriptions; i++) {
          inscriptions.push(
            new InscriptionModel({
              funding,
              index: funding.batchTransactionOffset + i,
              inscriptionDataLoader: dataLoader,
            }),
          );
        }
      }
      return inscriptions;
    },
  },
};
