import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { baseUrl } from "@/utils/config";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Bitflick Fee Report",
    description: "brought to you buy Axolotl Valley",
    openGraph: {},
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const imgUrl = baseUrl.get() + "/api/meta/axolotl/fees/static";
  const currentTimeMod30Seconds = Math.floor(Date.now() / 30000);
  return (
    <html lang="en">
      <head>
        <meta property="og:site_name" content="bitflick" />
        <meta property="og:title" content="Bitflick Fee Report" />
        <meta
          property="og:description"
          content="brought to you buy Axolotl Valley"
        />
        <meta property="og:image" content={imgUrl} />
        <meta property="twitter:title" content="Axolotl Valley" />
        <meta
          property="twitter:description"
          content="brought to you buy Axolotl Valley"
        />
        <meta content="verification" name="LR1011" />
        <meta property="twitter:image" content={imgUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@0xflick" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={imgUrl} />
        <meta property="fc:frame:button:1" content="BITCOIN FEE REPORT" />
        <meta
          property="fc:frame:post_url"
          content={`${baseUrl.get()}/api/frame/fees?a=${currentTimeMod30Seconds}`}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
