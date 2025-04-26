import { Inter } from "next/font/google";
import { SignupProvider } from "./context";

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
    <html lang="en">
      <body className={inter.className}>
        <SignupProvider>{children}</SignupProvider>
      </body>
    </html>
  );
}
