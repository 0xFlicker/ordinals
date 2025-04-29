"use client";
import { ReactNode } from "react";
import { AddressPurpose, BitcoinNetwork } from "sats-connect";
import { MultiChainProvider } from "@/context/multiChain";

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
      {children}
    </MultiChainProvider>
  );
}
