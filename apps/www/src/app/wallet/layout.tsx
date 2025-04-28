import { Inter } from "next/font/google";
import Context from "./context";
import { AddressPurpose } from "sats-connect";
import { BitcoinNetworkType } from "sats-connect";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bitflick: Testnet",
  description: "Admin panel for Bitflick",
};

export default function RootLayout({
  children,
}: {
  children: NonNullable<React.ReactNode>;
}) {
  return (
    <Context
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Ordinals]}
    >
      {children}
    </Context>
  );
}
