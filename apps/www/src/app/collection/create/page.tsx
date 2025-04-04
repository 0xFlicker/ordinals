import { CollectionCreate } from "@/routes/CollectionCreate";

import { AddressPurpose, BitcoinNetworkType } from "sats-connect";

export default function CollectionCreatePage() {
  return (
    <CollectionCreate
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Ordinals, AddressPurpose.Payment]}
    />
  );
}
