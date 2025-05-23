import { Chain, mainnet as wagmiMainnet } from "@wagmi/core/chains";
import { lazySingleton } from "../lazy.js";
import { TAdminChain } from "../types.js";
import { zeroAddress } from "viem";
export const mainnetEnsAdmin = lazySingleton(() => {
  if (!process.env.MAINNET_ENS_ADMIN) {
    console.warn("MAINNET_ENS_ADMIN not set");
    return zeroAddress;
  }
  return process.env.MAINNET_ENS_ADMIN;
});

export const mainnetRpcUrl = lazySingleton(() => {
  if (!process.env.MAINNET_RPC_URL) {
    console.warn("MAINNET_RPC_URL not set");
    return wagmiMainnet.rpcUrls.default.http[0];
  }
  return process.env.MAINNET_RPC_URL;
});

export const mainnet: TAdminChain<typeof wagmiMainnet> = {
  ...wagmiMainnet,
  get ensAdmin() {
    return mainnetEnsAdmin.get();
  },
};
