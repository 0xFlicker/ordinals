import WalletContext from "./context";

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletContext>{children}</WalletContext>;
}
