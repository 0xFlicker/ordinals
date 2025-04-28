import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  useAccount,
  useChainId,
  useChains,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import "@wagmi/core";
import "@wagmi/connectors";
import { defaultChain } from "@/utils/config";
import { appConnectors } from "./wagmi";
import { useDeferFirstRender } from "@/hooks/useDeferredRender";
import { Chain } from "viem";

export type TChain = Chain & {
  chainImageUrl: string;
};
export function decorateChainImageUrl(chain?: Chain): string {
  let chainImageUrl = "/images/chains/unknown.png";
  switch (chain?.id) {
    case 1:
      chainImageUrl = "/images/chains/homestead.png";
      break;
    case 111_55_111:
      chainImageUrl = "/images/chains/sepolia.png";
      break;
    case 5:
      chainImageUrl = "/images/chains/goerli.png";
      break;
    default:
      chainImageUrl = "/images/chains/unknown.png";
  }
  return chainImageUrl;
}

export const useLocalLastSeemNetwork = ({
  autoConnect = true,
}: {
  autoConnect?: boolean;
}) => {
  const { connector: activeConnector, isConnected } = useAccount();
  const { connectAsync } = useConnect();

  useEffect(() => {
    if (autoConnect && !isConnected) {
      const lastSeenConnector = localStorage.getItem("lastSeenConnector");
      if (lastSeenConnector) {
        const { connectorName } = JSON.parse(lastSeenConnector);
        if (connectorName) {
          const connector = appConnectors
            .get()
            .find((c) => c.name === connectorName);
          if (connector) {
            connectAsync({
              connector,
            }).then(() => {});
          }
        }
      }
    }
  }, [autoConnect, isConnected, activeConnector, connectAsync]);
};

export function useWeb3Context() {
  const [triedDefaultChain, setTriedDefaultChain] = useState(false);
  const { connector: activeConnector, isConnected, address } = useAccount();
  const { connect, data: provider } = useConnect();
  const { disconnect } = useDisconnect();
  // We don't want the address to be available on first load so that client render matches server render
  const isFirstLoad = useDeferFirstRender();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain } = useSwitchChain();
  useEffect(() => {
    if (isConnected && activeConnector?.name) {
      localStorage.setItem(
        "lastSeenConnector",
        JSON.stringify({
          connectorName: activeConnector.name,
        })
      );
    }
  }, [isConnected, activeConnector]);
  useEffect(() => {
    if (
      !triedDefaultChain &&
      chainId !== defaultChain.get().id &&
      switchChain
    ) {
      switchChain({
        chainId: defaultChain.get().id,
      });
      setTriedDefaultChain(true);
    }
  }, [isFirstLoad, chainId, triedDefaultChain, switchChain]);

  const result = {
    currentChain: isFirstLoad
      ? undefined
      : chains.find((c) => c.id === chainId),
    provider,
    selectedAddress: isFirstLoad ? undefined : address,
    connect,
    reset: disconnect,
    activeConnector,
    isConnected,
  };

  return result;
}

type TContext = ReturnType<typeof useWeb3Context>;
const Web3Provider = createContext<TContext | null>(null);

export const Provider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const context = useWeb3Context();
  return (
    <Web3Provider.Provider value={context}>{children}</Web3Provider.Provider>
  );
};

export function useWeb3() {
  const context = useContext(Web3Provider);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

const WALLET_FLAGS = [
  "isApexWallet",
  "isAvalanche",
  "isBackpack",
  "isBifrost",
  "isBitKeep",
  "isBitski",
  "isBlockWallet",
  "isBraveWallet",
  "isCoinbaseWallet",
  "isDawn",
  "isEnkrypt",
  "isExodus",
  "isFrame",
  "isFrontier",
  "isGamestop",
  "isHyperPay",
  "isImToken",
  "isKuCoinWallet",
  "isMathWallet",
  "isOkxWallet",
  "isOKExWallet",
  "isOneInchAndroidWallet",
  "isOneInchIOSWallet",
  "isOpera",
  "isPhantom",
  "isPortal",
  "isRabby",
  "isRainbow",
  "isStatus",
  "isTally",
  "isTokenPocket",
  "isTokenary",
  "isTrust",
  "isTrustWallet",
  "isUniswapWallet",
  "isXDEFI",
  "isZerion",
] as const;
// type WalletFlag = (typeof WALLET_FLAGS)[number];
