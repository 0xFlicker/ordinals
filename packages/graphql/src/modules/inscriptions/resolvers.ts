import { InscriptionsModule } from "./generated-types/module-types";

export const resolvers: InscriptionsModule.Resolvers = {
  Query: {
    inscriptions: async (_, { query }, { fundingDao, userDao }) => {
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
      const inscriptions = await fundingDao.getAllInscriptionsByCreatorUserId(
        userId,
      );
      throw new Error("Not implemented");
    },
  },
};
