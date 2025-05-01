import { Inter, Roboto } from "next/font/google";
import type { Metadata } from "next";
import { baseUrl } from "@/utils/config";
import Context from "./context";
import { ReactNode } from "react";
const inter = Inter({ subsets: ["latin"] });

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Bitflick",
  description: "Bitflick inscription launchpad",
};

export default async function RootLayout({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <head></head>
      <body className={inter.className}>
        <Context>{children}</Context>
      </body>
    </html>
  );
}
