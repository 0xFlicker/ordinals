import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { StatusRoute } from "@/routes/Status";

export default function Page({
  params: { fundingId },
}: {
  params: { fundingId: string };
}) {
  return (
    <StatusRoute
      initialBitcoinNetwork={BitcoinNetworkType.Testnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
      fundingId={fundingId}
    />
  );
}
