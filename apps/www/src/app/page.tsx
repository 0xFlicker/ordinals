import { baseUrl } from "@/utils/config";
import { Metadata } from "next";
import Client from "./client";
import { gql } from "graphql-tag";
import { getUserIdFromSession, getUserHandle } from "./actions";
import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";

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

gql`
  query handle($id: ID!) {
    user(id: $id) {
      handle
    }
  }
`;

gql`
  query getAppInfo {
    appInfo {
      pubKey
    }
  }
`;

export default async function Page() {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return <Client />;
    }
    const handle = await getUserHandle(userId);
    if (!handle) {
      return (
        <Client appRight={<WalletConnectButton user={{ userId, handle }} />} />
      );
    }
    return (
      <Client
        appRight={
          <WalletConnectButton
            user={{
              handle,
              userId,
            }}
          />
        }
      />
    );
  } catch (error) {
    console.error(error);
    return <Client />;
  }
}
