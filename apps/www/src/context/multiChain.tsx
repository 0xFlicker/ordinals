import { FC, PropsWithChildren } from "react";
import { Provider as XverseProvider } from "../features/xverse/Context";
import { AddressPurpose, BitcoinNetwork } from "sats-connect";
import { Provider as Web3Provider } from "@/features/web3";
import { Provider as AuthProvider } from "@/features/auth";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { wagmiConfig } from "@/features/web3/wagmi";

const queryClient = new QueryClient();

export const MultiChainProvider: FC<
  PropsWithChildren<{
    autoLogin?: boolean;
    bitcoinNetwork: BitcoinNetwork["type"];
    bitcoinPurpose: AddressPurpose[];
  }>
> = ({ children, autoLogin, bitcoinNetwork, bitcoinPurpose }) => {
  return (
    <WagmiProvider config={wagmiConfig.get()}>
      <QueryClientProvider client={queryClient}>
        <XverseProvider network={bitcoinNetwork} purpose={bitcoinPurpose}>
          <Web3Provider>
            <AuthProvider autoLogin={autoLogin}>{children}</AuthProvider>
          </Web3Provider>
        </XverseProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
