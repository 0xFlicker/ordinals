import { ConnectionStatusProvider } from "@/features/wallet-standard/ConnectionStatus";

export default function WalletContext({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConnectionStatusProvider>{children ?? ""}</ConnectionStatusProvider>;
}
