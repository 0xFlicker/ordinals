import { base as wagmiBase } from "@wagmi/core/chains";
import { lazySingleton } from "../lazy.js";
import { TAdminChain } from "../types.js";
import { zeroAddress } from "viem";

export const baseEnsAdmin = lazySingleton(() => {
  if (!process.env.BASE_ENS_ADMIN) {
    console.warn("BASE_ENS_ADMIN not set");
    return zeroAddress;
  }
  return process.env.BASE_ENS_ADMIN;
});

export const baseRpcUrl = lazySingleton(() => {
  if (!process.env.BASE_RPC_URL) {
    console.warn("BASE_RPC_URL not set");
    return wagmiBase.rpcUrls.default.http[0];
  }
  return process.env.BASE_RPC_URL;
});

export const baseWsRpcUrl = lazySingleton(() => {
  if (!process.env.BASE_WS_RPC_URL) {
    console.warn("BASE_WS_RPC_URL not set");
    return wagmiBase.rpcUrls.default.http[0].replace("http", "ws");
  }
  return process.env.BASE_WS_RPC_URL;
});

export const base: TAdminChain<typeof wagmiBase> = {
  ...wagmiBase,
  get ensAdmin() {
    return baseEnsAdmin.get();
  },
};
