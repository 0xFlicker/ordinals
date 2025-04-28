"use client";
import { FC, PropsWithChildren, ReactNode } from "react";
import {
  AddressPurpose,
  BitcoinNetwork,
  BitcoinNetworkType,
} from "sats-connect";
import { MultiChainProvider } from "@/context/multiChain";
import { DefaultProvider } from "@/context/default";
import { WalletStandardProvider } from "@/features/wallet-standard/Context";
import { MagicEdenProvider } from "@/features/magic-eden/Context";

export default function Context({
  children,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
}: {
  children: NonNullable<ReactNode>;
  initialBitcoinNetwork: BitcoinNetwork["type"];
  initialBitcoinPurpose: AddressPurpose[];
}) {
  return (
    <MultiChainProvider
      bitcoinNetwork={initialBitcoinNetwork}
      bitcoinPurpose={initialBitcoinPurpose}
    >
      <DefaultProvider>
        <MultiChainProvider
          bitcoinNetwork={initialBitcoinNetwork}
          bitcoinPurpose={initialBitcoinPurpose}
        >
          <MagicEdenProvider
            network={initialBitcoinNetwork}
            purpose={initialBitcoinPurpose}
          >
            <WalletStandardProvider>{children}</WalletStandardProvider>
          </MagicEdenProvider>
        </MultiChainProvider>
      </DefaultProvider>
    </MultiChainProvider>
  );
}
