import { mainnet, polygon, optimism, arbitrum, base } from "@wagmi/chains";
import {
  Connector,
  CreateConnectorFn,
  createConfig,
  fallback,
  http,
  webSocket,
} from "wagmi";
import {
  metaMask,
  coinbaseWallet,
  walletConnect,
  injected,
  safe,
} from "wagmi/connectors";
import "@wagmi/core";
import { webConnectProjectId } from "@/utils/config";
import { lazySingleton } from "@/utils/factory";
import { HttpTransportConfig, WebSocketTransportConfig, custom } from "viem";

export type TConnector<createConnectorFn extends CreateConnectorFn> =
  Connector<createConnectorFn>;

export const appConnectors = lazySingleton(() => {
  return [
    metaMask(),
    coinbaseWallet(),
    walletConnect({
      projectId: webConnectProjectId.get(),
    }),
    injected(),
    safe(),
  ];
});

type Providers = "drpc";

function transportFor({
  protocol,
  provider,
  network,
  config,
}: {
  provider: Providers;
  network: string;
} & (
  | {
      protocol: "http";
      config?: HttpTransportConfig<undefined, false>;
    }
  | {
      protocol: "ws";
      config?: WebSocketTransportConfig;
    }
)) {
  let url: string;
  switch (provider) {
    case "drpc":
      url = `${protocol === "http" ? "https" : "wss"}://lb.drpc.org/og${
        protocol === "http" ? "rpc" : "ws"
      }?network=${network}&dkey=${process.env.NEXT_PUBLIC_DRPC_API_KEY!}`;
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  return protocol === "http"
    ? http(url, {
        batch: true,
        ...config,
      })
    : webSocket(url, {
        ...config,
      });
}

export const wagmiConfig = lazySingleton(() => {
  return createConfig({
    connectors: appConnectors.get(),
    chains: [mainnet, polygon, optimism, arbitrum, base],
    transports: {
      [mainnet.id]: fallback([
        custom({
          request: async (args) => {
            if ("ethereum" in window) {
              return await (window.ethereum as any).request(args);
            }
            throw new Error("No Ethereum provider found");
          },
        }),
        transportFor({
          protocol: "ws",
          provider: "drpc",
          network: "ethereum",
        }),
        transportFor({
          protocol: "http",
          provider: "drpc",
          network: "ethereum",
        }),
      ]),
      [polygon.id]: fallback([
        custom({
          request: async (args) => {
            if ("ethereum" in window) {
              return await (window.ethereum as any).request(args);
            }
            throw new Error("No Ethereum provider found");
          },
        }),
        transportFor({
          protocol: "ws",
          provider: "drpc",
          network: "polygon",
        }),
        transportFor({
          protocol: "http",
          provider: "drpc",
          network: "polygon",
        }),
      ]),
      [optimism.id]: fallback([
        custom({
          request: async (args) => {
            if ("ethereum" in window) {
              return await (window.ethereum as any).request(args);
            }
            throw new Error("No Ethereum provider found");
          },
        }),
        transportFor({
          protocol: "ws",
          provider: "drpc",
          network: "optimism",
        }),
        transportFor({
          protocol: "http",
          provider: "drpc",
          network: "optimism",
        }),
      ]),
      [arbitrum.id]: fallback([
        custom({
          request: async (args) => {
            if ("ethereum" in window) {
              return await (window.ethereum as any).request(args);
            }
            throw new Error("No Ethereum provider found");
          },
        }),
        transportFor({
          protocol: "ws",
          provider: "drpc",
          network: "arbitrum",
        }),
        transportFor({
          protocol: "http",
          provider: "drpc",
          network: "arbitrum",
        }),
      ]),
      [base.id]: fallback([
        custom({
          request: async (args) => {
            if ("ethereum" in window) {
              return await (window.ethereum as any).request(args);
            }
            throw new Error("No Ethereum provider found");
          },
        }),
        transportFor({
          protocol: "ws",
          provider: "drpc",
          network: "base",
        }),
        transportFor({
          protocol: "http",
          provider: "drpc",
          network: "base",
        }),
      ]),
    },
  });
});

export function isSafeConnector(connector: TConnector<CreateConnectorFn>) {
  return connector.id === "safe";
}

export function isMetaMaskConnector(connector: TConnector<CreateConnectorFn>) {
  return connector.id === "metaMask";
}

export function isCoinbaseWalletConnector(
  connector: TConnector<CreateConnectorFn>
) {
  return connector.id === "coinbaseWallet";
}

export function isWalletConnectConnector(
  connector: TConnector<CreateConnectorFn>
) {
  return connector.id === "walletConnect";
}

export function isInjectedConnector(connector: TConnector<CreateConnectorFn>) {
  return connector.id === "injected";
}

export type WagmiConfiguredClient = ReturnType<typeof wagmiConfig.get>;
