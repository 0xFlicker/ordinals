"use client";
import { FC, PropsWithChildren } from "react";
import {
  AddressPurpose,
  BitcoinNetwork,
  BitcoinNetworkType,
} from "sats-connect";
import { MultiChainProvider } from "@/context/multiChain";
import { DefaultProvider } from "@/context/default";
import { WalletStandardProvider } from "@/features/wallet-standard/Context";
import { MagicEdenProvider } from "@/features/magic-eden/Context";

export const SignupProvider: FC<
  PropsWithChildren<{
    initialBitcoinNetwork: BitcoinNetwork["type"];
    initialBitcoinPurpose: AddressPurpose[];
    ethereumAutoConnect?: boolean;
  }>
> = ({ children, initialBitcoinNetwork, initialBitcoinPurpose }) => {
  return (
    <DefaultProvider>
      <MultiChainProvider
        bitcoinNetwork={initialBitcoinNetwork}
        bitcoinPurpose={initialBitcoinPurpose}
      >
        <MagicEdenProvider
          network={initialBitcoinNetwork}
          purpose={initialBitcoinPurpose}
        >
          <WalletStandardProvider>
            <SignupRoute
              initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
              initialBitcoinPurpose={[
                AddressPurpose.Ordinals,
                AddressPurpose.Payment,
              ]}
            >
              {children}
            </SignupRoute>
          </WalletStandardProvider>
        </MagicEdenProvider>
      </MultiChainProvider>
    </DefaultProvider>
  );
};

const SignupRoute: FC<
  PropsWithChildren<{
    initialBitcoinNetwork: BitcoinNetwork["type"];
    initialBitcoinPurpose: AddressPurpose[];
    ethereumAutoConnect?: boolean;
  }>
> = ({ children, initialBitcoinNetwork, initialBitcoinPurpose }) => {
  return (
    <MultiChainProvider
      bitcoinNetwork={initialBitcoinNetwork}
      bitcoinPurpose={initialBitcoinPurpose}
    >
      {children}
    </MultiChainProvider>
  );
};
