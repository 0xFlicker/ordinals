import { Inter } from "next/font/google";
import Context from "./context";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { ReactNode } from "react";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bitflick",
  description: "Bitflick inscription launchpad",
};

export default function RootLayout({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Context
          initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
          initialBitcoinPurpose={[
            AddressPurpose.Ordinals,
            AddressPurpose.Payment,
          ]}
        >
          {children}
        </Context>
      </body>
    </html>
  );
}
