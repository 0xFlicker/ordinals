import {
  createDynamoDbFundingDao,
  createStorageFundingDocDao,
  inscriptionBucket,
  watchForGenesis,
} from "@0xflick/ordinals-backend";
import { createMempoolBitcoinClient } from "./mempool.js";

export async function start(network: "mainnet" | "testnet" = "testnet") {
  console.log("🚀 starting genesis event watcher");
  const fundingDao = createDynamoDbFundingDao();
  const fundingDocDao = createStorageFundingDocDao({
    bucketName: inscriptionBucket.get(),
  });
  const allCollections = await fundingDao.getAllCollections();
  for (const collection of allCollections) {
    watchForGenesis({
      collectionId: collection.id,
      fundingDao,
      fundingDocDao,
      mempoolBitcoinClient: createMempoolBitcoinClient({ network }),
      pollInterval: 60000,
    });
  }
}
