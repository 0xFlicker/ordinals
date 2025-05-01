"use client";
import { AppBar } from "@/components/AppBar";
import Container from "@mui/material/Container";
import { SignupCard } from "@/features/auth/components/SignupCard";
import { useRouter, useSearchParams } from "next/navigation";
import { MultiChainProvider } from "@/features/wallet-standard";
import { BitcoinNetworkType, AddressPurpose } from "sats-connect";
import { BitflickHome } from "@/components/BitflickHome";
export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("r");

  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
    >
      <AppBar left={<BitflickHome />} />
      <Container
        sx={{
          pt: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SignupCard
          onSignup={() => {
            router.push(redirectPath || `/`);
          }}
        />
      </Container>
    </MultiChainProvider>
  );
}
