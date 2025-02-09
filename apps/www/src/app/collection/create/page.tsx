import { CollectionCreate } from "@/routes/CollectionCreate";
import { PayRoute } from "@/routes/Pay";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";

export default function CollectionCreatePage() {
  return (
    <CollectionCreate
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={AddressPurpose.Ordinals}
    />
  );
}
