import { baseUrl } from "@/utils/config";
import { cookies } from "next/headers";
import { Metadata } from "next";
import Client from "./client";
import { MockConnectClient } from "./MockConnectClient";
import {
  importSPKIKey,
  verifyJwtForLogin,
} from "@0xflick/ordinals-rbac-models";
import { getSdk } from "./page.generated";
import { createGraphqlClient } from "@/apiGraphql/client";
import { gql } from "graphql-tag";
import { appInfo } from "./actions";

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
  const cookieStore = cookies();
  const cookieName = "bitflick.session";
  const session = cookieStore.get(cookieName);
  const token = session?.value;
  if (!token) {
    return <Client />;
  }
  try {
    const { pubKey } = await appInfo();
    const { userId } = await verifyJwtForLogin(
      token,
      await importSPKIKey(pubKey)
    );
    const sdk = getSdk(createGraphqlClient());
    const { user } = await sdk.handle({ id: userId });
    if (!user) {
      return <Client />;
    }
    return <Client appRight={<MockConnectClient user={user} />} />;
  } catch (error) {
    console.error(error);
    return <Client />;
  }
}
