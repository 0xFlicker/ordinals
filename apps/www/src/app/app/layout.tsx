import { ReactNode } from "react";

export const metadata = {
  title: "Bitflick",
  description: "Bitflick inscription launchpad",
};

export default function RootLayout({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return children;
}
