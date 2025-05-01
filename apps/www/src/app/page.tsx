import { baseUrl } from "@/utils/config";
import { Metadata } from "next";
import Client from "./client";
import { gql } from "graphql-tag";
import { getUserIdFromSession, getUserHandle, getFullUser } from "./actions";
import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";
import { MultiChainProvider } from "@/features/wallet-standard";
import { BitcoinNetworkType } from "sats-connect";
import { AddressPurpose } from "sats-connect";

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
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return <Client />;
    }
    const user = await getFullUser(userId);

    return (
      <MultiChainProvider
        initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
        initialBitcoinPurpose={[AddressPurpose.Payment]}
        initialUser={user}
      >
        <Client appRight={<WalletConnectButton user={user} />} />
      </MultiChainProvider>
    );
  } catch (error) {
    console.error(error);
    return (
      <MultiChainProvider
        initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
        initialBitcoinPurpose={[AddressPurpose.Payment]}
      >
        <Client appRight={<WalletConnectButton />} />
      </MultiChainProvider>
    );
  }
}
