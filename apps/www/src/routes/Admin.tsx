"use client";
import { FC } from "react";
import { DefaultProvider } from "@/context/default";
import Grid from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { AdminPanel } from "@/features/admin";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { AutoConnect } from "@/features/web3";

export const AdminRoute: FC<{
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose[];
}> = ({ initialBitcoinNetwork, initialBitcoinPurpose }) => {
  return (
    <DefaultProvider>
      <SwitchableNetwork
        title="home"
        initialBitcoinNetwork={initialBitcoinNetwork}
        initialBitcoinPurpose={initialBitcoinPurpose}
        ethereumAutoConnect={false}
      >
        <AutoConnect>
          <Grid container spacing={2} columns={12}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4,
              }}
            >
              <AdminPanel />
            </Grid>
          </Grid>
        </AutoConnect>
      </SwitchableNetwork>
    </DefaultProvider>
  );
};
