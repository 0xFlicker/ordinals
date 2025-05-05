import { ClaimRoute } from "@/routes/Claim";
import { BitcoinNetworkType } from "sats-connect";

export default function Page({
  params: { collectionId },
}: {
  params: { collectionId: string };
}) {
  return (
    <ClaimRoute
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      collectionId={collectionId}
    />
  );
}
