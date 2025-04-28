"use client";
import { FC } from "react";
import { DefaultProvider } from "@/context/default";
import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { ActiveMint } from "@/features/inscription";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { AutoConnect } from "@/features/web3";

export const MintRoute: FC<{
  collectionId: string;
  destinationAddress: string;
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose[];
}> = ({
  collectionId,
  destinationAddress,
  initialBitcoinNetwork,
  initialBitcoinPurpose,
}) => {
  return (
    <DefaultProvider>
      <SwitchableNetwork
        title="bitflick"
        initialBitcoinNetwork={initialBitcoinNetwork}
        initialBitcoinPurpose={initialBitcoinPurpose}
        ethereumAutoConnect={false}
      >
        <AutoConnect>
          <Grid2 container spacing={2} columns={12}>
            <Grid2 size={12}>
              <ActiveMint
                collectionId={collectionId}
                destinationAddress={destinationAddress}
              />
            </Grid2>
          </Grid2>
        </AutoConnect>
      </SwitchableNetwork>
    </DefaultProvider>
  );
};
