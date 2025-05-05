import { MintRoute } from "@/routes/Mint";

export default function Page({
  params: { collectionId, destinationAddress },
}: {
  params: { collectionId: string; destinationAddress: string };
}) {
  return (
    <MintRoute
      collectionId={collectionId}
      destinationAddress={destinationAddress}
    />
  );
}
