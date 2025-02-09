import { Inter } from "next/font/google";
import { Context } from "./context";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bitflick",
  description: "Bitflick inscription launchpad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Context
          initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
          initialBitcoinPurpose={AddressPurpose.Ordinals}
        >
          {children}
        </Context>
      </body>
    </html>
  );
}
