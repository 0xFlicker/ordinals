import { Inscribe } from "@/routes/Inscribe";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { getUserIdFromSession, getFullUser } from "../actions";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { MultiChainProvider } from "@/features/wallet-standard";

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
        <Inscribe />
      </SwitchableNetwork>
    </MultiChainProvider>
  );
}
