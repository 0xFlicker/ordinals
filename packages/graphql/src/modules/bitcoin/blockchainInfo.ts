import { getBlockchainInfo } from "@0xflick/ordinals-backend";
import { BitcoinNetwork } from "../../generated-types/graphql.js";
import { toBitcoinNetworkName } from "./transforms.js";

export const bitcoinNetworkStatus = async ({
  network,
}: {
  network: BitcoinNetwork;
}) => {
  const networkName = toBitcoinNetworkName(network);
  const {
    bestblockhash,
    headers,
    difficulty,
    mediantime,
    verificationprogress,
    chainwork,
    pruned,
    blocks,
    chain,
    initialblockdownload,
    warnings,
  } = await getBlockchainInfo(networkName);
  const status =
    initialblockdownload || verificationprogress < 0.99
      ? ("SYNCING" as const)
      : ("SYNCED" as const);
  return {
    status,
    height: blocks,
    bestBlockHash: bestblockhash,
    progress: verificationprogress,
  };
};
