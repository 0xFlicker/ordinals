import { AppBar } from "@/components/AppBar";
import Container from "@mui/material/Container";
import { MultiChainProvider } from "@/features/wallet-standard";
import { BitcoinNetworkType, AddressPurpose } from "sats-connect";
import { getFullUser } from "../actions";
import { getUserIdFromSession } from "../actions";
import { redirect } from "next/navigation";
import { OnboardingCard } from "@/features/auth/components/OnboardingCard";

export default async function Signup({
  searchParams,
}: {
  searchParams: { r: string };
}) {
  const userId = await getUserIdFromSession();
  const user = userId ? await getFullUser(userId) : undefined;
  const redirectPath = searchParams.r;
  if (redirectPath && user) {
    return redirect(redirectPath);
  }

  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
    >
      <AppBar left="Sign Up" />
      <Container
        sx={{
          pt: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <OnboardingCard redirectPath={redirectPath} initialUser={user} />
      </Container>
    </MultiChainProvider>
  );
}
