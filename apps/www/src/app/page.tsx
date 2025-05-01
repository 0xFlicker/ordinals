import { baseUrl } from "@/utils/config";
import { Metadata } from "next";
import Client from "./client";
import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";
import { MultiChainProvider } from "@/features/wallet-standard";
import { BitcoinNetworkType } from "sats-connect";
import { AddressPurpose } from "sats-connect";
import { Hero } from "./Hero";
import Box from "@mui/material/Box";

export const metadata: Metadata = {
  title: "Bitflick",
  metadataBase: new URL(baseUrl.get()),
  openGraph: {
    title: "Bitflick",
    description: "Bitflick inscription launchpad",
    images: [{ url: baseUrl.get() + "/api/meta/axolotl" }],
    siteName: "bitflick",
    locale: "en_US",
    type: "website",
    url: baseUrl.get(),
  },
  verification: {
    other: {
      lr: "LR1011",
    },
  },
  other: {
    "twitter:image": baseUrl.get() + "/api/meta/axolotl",
    "twitter:card": "summary_large_image",
    "twitter:creator": "@0xflick",
    "fc:frame": "vNext",
    "fc:frame:image": baseUrl.get() + "/api/meta/axolotl",
  },
};

export default async function Page() {
  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Hero />
        <Client appRight={<WalletConnectButton />} />
      </Box>
    </MultiChainProvider>
  );
}
