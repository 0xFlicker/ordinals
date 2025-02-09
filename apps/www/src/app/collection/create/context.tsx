"use client";

import { DefaultProvider } from "@/context/default";
import { AutoConnect } from "@/features/web3";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import type { AddressPurpose, BitcoinNetworkType } from "sats-connect";

export const Context = ({
  children,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
}: {
  children: React.ReactNode;
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose;
}) => {
  return (
    <DefaultProvider>
      <SwitchableNetwork
        title="bitflick"
        initialBitcoinNetwork={initialBitcoinNetwork}
        initialBitcoinPurpose={initialBitcoinPurpose}
        ethereumAutoConnect={false}
      >
        <AutoConnect>{children}</AutoConnect>
      </SwitchableNetwork>
    </DefaultProvider>
  );
};
