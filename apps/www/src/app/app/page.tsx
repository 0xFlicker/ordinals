import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { getUserIdFromSession, getFullUser } from "../actions";
import { MultiChainProvider } from "@/features/wallet-standard";
import Container from "@mui/material/Container";
import { AppHeader } from "./AppHeader";
export default async function InscribePage() {
  const userId = await getUserIdFromSession();
  const user = userId ? await getFullUser(userId) : undefined;
  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
      initialUser={user}
    >
      <Container
        maxWidth="md"
        sx={{
          pt: 8,
        }}
      >
        <AppHeader user={user} />
      </Container>
    </MultiChainProvider>
  );
}
