"use client";
import MultiChainProvider from "@/context/multiChain";
import theme from "@/theme";
import { DefaultProvider } from "@/context/default";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { ReactNode } from "react";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";

export default function Context({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <DefaultProvider>
          <MultiChainProvider
            initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
            initialBitcoinPurpose={[AddressPurpose.Payment]}
          >
            {children}
          </MultiChainProvider>
        </DefaultProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
