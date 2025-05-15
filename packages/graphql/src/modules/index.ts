import { resolvers as authResolver } from "./auth/resolvers.js";
import { resolvers as axolotlResolver } from "./axolotl/resolvers.js";
import { resolvers as bitcoinResolver } from "./bitcoin/resolvers.js";
import { resolvers as collectionsResolver } from "./collections/resolvers.js";
import { resolvers as inscriptionRequestResolver } from "./inscriptionRequest/resolvers.js";
import { resolvers as inscriptionFundingResolver } from "./inscriptionFunding/resolvers.js";
import { resolvers as permissionResolver } from "./permissions/resolvers.js";
import { resolvers as userResolver } from "./user/resolvers.js";

export const resolvers = [
  authResolver,
  axolotlResolver,
  bitcoinResolver,
  collectionsResolver,
  inscriptionFundingResolver,
  inscriptionRequestResolver,
  permissionResolver,
  userResolver,
];
