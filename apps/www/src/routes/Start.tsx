"use client";
import { FC } from "react";
import { DefaultProvider } from "@/context/default";
import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { Flow } from "@/features/inscription";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { AutoConnect } from "@/features/web3";

export const StartRoute: FC<{
  collectionId: string;
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose[];
}> = ({ collectionId, initialBitcoinNetwork, initialBitcoinPurpose }) => {
  return (
    <DefaultProvider>
      <SwitchableNetwork
        title="bitflick"
        initialBitcoinNetwork={initialBitcoinNetwork}
        initialBitcoinPurpose={initialBitcoinPurpose}
        ethereumAutoConnect={false}
      >
        <AutoConnect>
          <Grid2 container spacing={2} sx={{ mt: 10 }} columns={12}>
            <Grid2 size={12}>
              <Flow
                collectionId={collectionId}
                initialBitcoinNetwork={initialBitcoinNetwork}
                step="start"
              />
            </Grid2>
          </Grid2>
        </AutoConnect>
      </SwitchableNetwork>
    </DefaultProvider>
  );
};
