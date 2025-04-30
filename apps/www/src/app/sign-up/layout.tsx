import { Inter } from "next/font/google";

export const metadata = {
  title: "Bitflick: Testnet",
  description: "Admin panel for Bitflick",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
