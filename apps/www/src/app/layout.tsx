import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { baseUrl } from "@/utils/config";
import Context from "./context";
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
  return (
    <html lang="en">
      <body className={inter.className}>
        <Context>{children}</Context>
      </body>
    </html>
  );
}
