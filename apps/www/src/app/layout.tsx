import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { baseUrl } from "@/utils/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bitflick",
  description: "Bitflick inscription launchpad",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const imgUrl = baseUrl.get() + "/api/meta/axolotl";
  return (
    <html lang="en">
      <head>
        <meta property="og:site_name" content="bitflick" />
        <meta property="og:title" content="Bitflick Beta" />
        <meta
          property="og:description"
          content="a new way to inscribe on bitcoin"
        />
        <meta property="og:image" content={imgUrl} />
        <meta property="twitter:title" content="Axolotl Valley" />
        <meta
          property="twitter:description"
          content="mint an axolotl on bitcoin"
        />
        <meta content="verification" name="LR1011" />
        <meta property="twitter:image" content={imgUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@0xflick" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={imgUrl} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
