import { BitcoinNetworkNames } from "@0xflick/inscriptions";
import { createMempoolBitcoinClient } from "../../mempool.js";
import { MempoolClient } from "@0xflick/ordinals-backend";

export async function runeIssue({
  network,
  symbol,
  decimals,
  supply,
  destinationAddress,
}: {
  network: BitcoinNetworkNames;
  symbol: string;
  decimals: number;
  supply: number;
  destinationAddress: string;
}) {
  const mempool: MempoolClient["bitcoin"] = createMempoolBitcoinClient({
    network,
  });

  // get unspent outputs
  const unspent = await mempool.listUnspent();
}
