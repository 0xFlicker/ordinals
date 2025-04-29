import { Inter } from "next/font/google";
import { utils } from "ethers";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

const NEXT_PUBLIC_FRAME_URL = "https://frame.bitflick.xyz";
const NEXT_PUBLIC_WWW_URL = "https://www.bitflick.xyz";

export async function generateMetadata({
  params: { collectionId },
}: {
  params: { collectionId: string };
}): Promise<Metadata> {
  const seed = utils.hexlify(utils.randomBytes(32));

  return {
    title: "Bitflick",
    description: "Bitflick inscription launchpad",
    openGraph: {
      siteName: "bitflick",
      title: "Axolotl Valley",
      description: "mint an axolotl on bitcoin",
      images: [{ url: "https://www.bitflick.xyz/images/axolotl.png" }],
    },
    twitter: {
      title: "Axolotl Valley",
      description: "mint an axolotl on bitcoin",
      card: "summary_large_image",
      creator: "@0xflick",
      images: ["https://www.bitflick.xyz/images/axolotl.png"],
    },
    verification: {
      other: {
        lr: "LR1011",
      },
    },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": `${NEXT_PUBLIC_FRAME_URL}/frame-og/axolotl/${seed}`,
      "fc:frame:button:1": "CLOSED",
      // Uncomment these if needed
      // "fc:frame:input:text": "Enter a BTC taproot address",
      // "fc:frame:button:1": "mint 1",
      // "fc:frame:button:2": "mint 3",
      // "fc:frame:button:3": "mint 5",
      // "fc:frame:button:4": "mint 10",
      // "fc:frame:post_url": `${NEXT_PUBLIC_WWW_URL}/api/frame/${collectionId}/axolotl/address`,
    },
  };
}

export default function RootLayout({
  children,
}: {
  params: { collectionId: string };
  children: React.ReactNode;
}) {
  return children;
}
