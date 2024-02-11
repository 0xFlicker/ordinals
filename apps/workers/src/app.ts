import { start as startFundingEvents } from "./watchFundingEvents.js";
import { start as startFundedEvents } from "./watchFundedEvents.js";
import { start as startGenesisEvents } from "./watchGenesisEvents.js";
import { axolotl, decorate } from "./axolotl.js";
// import { expireAllFundings } from "./expire.js";

const network = process.env.NETWORK as "mainnet" | "testnet" | undefined;

// await expireAllFundings({
//   collectionId: "7d33db3a-8d0f-4fe0-a781-74d314953aae",
// });
await decorate({ collectionId: "7d33db3a-8d0f-4fe0-a781-74d314953aae" });
// startGenesisEvents(network);
// startFundingEvents(network);
// startFundedEvents(network);
