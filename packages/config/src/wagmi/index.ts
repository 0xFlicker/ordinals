import { createConfig, http, webSocket, fallback } from "@wagmi/core";
import { sepolia, sepoliaRpcUrl } from "./sepolia.js";
import { base, baseRpcUrl, baseWsRpcUrl } from "./base.js";
import { mainnet, mainnetRpcUrl } from "./mainnet.js";
import { lazySingleton } from "../lazy.js";

export const chains = {
  [mainnet.id]: mainnet,
  [sepolia.id]: sepolia,
  [base.id]: base,
};

const configFactory = lazySingleton(() =>
  createConfig({
    chains: [mainnet, sepolia, base],
    transports: {
      [mainnet.id]: fallback([http(mainnetRpcUrl.get())]),
      [sepolia.id]: fallback([http(sepoliaRpcUrl.get())]),
      [base.id]: fallback([
        webSocket(baseWsRpcUrl.get()),
        http(baseRpcUrl.get()),
      ]),
    },
  }),
);

export const config = () => configFactory.get();
