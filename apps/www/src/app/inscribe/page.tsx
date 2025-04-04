import { Inscribe } from "@/routes/Inscribe";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";

export default function InscribePage() {
  return (
    <Inscribe
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={AddressPurpose.Ordinals}
    />
  );
}
