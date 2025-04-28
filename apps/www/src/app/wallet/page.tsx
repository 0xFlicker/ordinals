"use client";
import { AppBar } from "@/components/AppBar";
import Container from "@mui/material/Container";
import { WalletPicker } from "@/features/wallet-standard/components/WalletPicker";
import { useRouter } from "next/navigation";
import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";

export default function Page() {
  const router = useRouter();
  return (
    <>
      <AppBar left="Wallet" />
      <Container
        sx={{
          pt: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <WalletConnectButton pickBtc pickEvm intent="login" />
      </Container>
    </>
  );
}
