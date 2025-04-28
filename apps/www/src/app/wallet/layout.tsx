import { Inter } from "next/font/google";
import { SignupProvider } from "./context";
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
  children: React.ReactNode;
}) {
  return (
    <SignupProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Ordinals]}
    >
      {children}
    </SignupProvider>
  );
}
