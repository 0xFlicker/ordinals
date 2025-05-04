"use client";

import { ReactNode } from "react";

import { DefaultProvider } from "@/context/default";
import { WalletStandardProvider } from "@/features/wallet-standard/Context";
import { MagicEdenProvider } from "@/features/magic-eden/Context";
import { Provider as XverseProvider } from "@/features/xverse/Context";
import { AddressPurpose, BitcoinNetwork } from "sats-connect";
import { AuthProvider } from "@/features/auth";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { wagmiConfig } from "@/features/web3/wagmi";
import { TFullUser } from "@/utils/transforms";

const queryClient = new QueryClient();

function InnerContext({
  children,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
}: {
  children: NonNullable<ReactNode>;
  initialBitcoinNetwork: BitcoinNetwork["type"];
  initialBitcoinPurpose: AddressPurpose[];
}) {
  return (
    <DefaultProvider>
      <MagicEdenProvider
        network={initialBitcoinNetwork}
        purpose={initialBitcoinPurpose}
      >
        <WalletStandardProvider>{children}</WalletStandardProvider>
      </MagicEdenProvider>
    </DefaultProvider>
  );
}

export function MultiChainProvider({
  children,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
  initialUser,
}: {
  children: NonNullable<ReactNode>;
  initialUser?: TFullUser;
  initialBitcoinNetwork: BitcoinNetwork["type"];
  initialBitcoinPurpose: AddressPurpose[];
}) {
  return (
    <WagmiProvider config={wagmiConfig.get()}>
      <QueryClientProvider client={queryClient}>
        <XverseProvider
          network={initialBitcoinNetwork}
          purpose={initialBitcoinPurpose}
        >
          <AuthProvider user={initialUser}>
            <InnerContext
              initialBitcoinNetwork={initialBitcoinNetwork}
              initialBitcoinPurpose={initialBitcoinPurpose}
            >
              {children}
            </InnerContext>
          </AuthProvider>
        </XverseProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { WalletConnectButton } from "./components/WalletConnectButton";
