import mempoolJS from "@mempool/mempool.js";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import { MempoolConfig } from "@mempool/mempool.js/lib/interfaces/index.js";

export type MempoolClient = ReturnType<typeof createMempoolClient>;
export function createMempoolClient({
  network,
  hostname,
  protocol,
  config,
}: {
  hostname: string;
  protocol: "http" | "https";
  network: BitcoinNetworkNames;
  config: MempoolConfig["config"];
}) {
  return mempoolJS({
    network,
    hostname,
    protocol,
    config,
  });
}
