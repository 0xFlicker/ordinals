"use client";
import { FC, PropsWithChildren } from "react";
import {
  AddressPurpose,
  BitcoinNetwork,
  BitcoinNetworkType,
} from "sats-connect";
import { MultiChainProvider } from "@/context/multiChain";
import { DefaultProvider } from "@/context/default";

export const SignupProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <DefaultProvider>
      <SignupRoute
        initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
        initialBitcoinPurpose={[
          AddressPurpose.Ordinals,
          AddressPurpose.Payment,
        ]}
      >
        {children}
      </SignupRoute>
    </DefaultProvider>
  );
};

const SignupRoute: FC<
  PropsWithChildren<{
    initialBitcoinNetwork: BitcoinNetwork["type"];
    initialBitcoinPurpose: AddressPurpose[];
    ethereumAutoConnect?: boolean;
  }>
> = ({
  children,
  ethereumAutoConnect,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
}) => {
  return (
    <MultiChainProvider
      bitcoinNetwork={initialBitcoinNetwork}
      bitcoinPurpose={initialBitcoinPurpose}
      ethereumAutoConnect={ethereumAutoConnect}
    >
      {children}
    </MultiChainProvider>
  );
};
