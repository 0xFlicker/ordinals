import { Inscribe } from "@/routes/Inscribe";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { getUserIdFromSession, getFullUser } from "../actions";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { MultiChainProvider } from "@/features/wallet-standard";
import Container from "@mui/material/Container";

export default async function InscribePage() {
  const userId = await getUserIdFromSession();
  const user = userId ? await getFullUser(userId) : undefined;
  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
      initialUser={user}
    >
      <SwitchableNetwork title="Inscribe" user={user ?? undefined}>
        <Container maxWidth="md">
          <Inscribe />
        </Container>
      </SwitchableNetwork>
    </MultiChainProvider>
  );
}
