import { AgreementRoute } from "@/routes/Agreement";
import { BitcoinNetworkType } from "sats-connect";

export default function Page({
  params: { collectionId },
}: {
  params: { collectionId: string };
}) {
  return (
    <AgreementRoute
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      collectionId={collectionId}
    />
  );
}
