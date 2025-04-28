import { FC } from "react";

import { AgreementModal } from "../AgreementModal";
import { ActiveClaim } from "../ActiveClaim";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import { Start } from "../Start/Start";

export const Content: FC<{
  collectionId: string;
  initialBitcoinNetwork: BitcoinNetworkType;
  step: "start" | "agreement" | "claim" | "pay" | "done";
}> = ({ collectionId, initialBitcoinNetwork, step }) => {
  const router = useRouter();

  if (step === "start") {
    // return <Typography>CLOSED</Typography>;
    return (
      <Start
        collectionId={collectionId}
        onInscribe={() => {
          router.push(
            `${
              initialBitcoinNetwork === BitcoinNetworkType.Testnet
                ? "/testnet"
                : ""
            }/agreement/${collectionId}`,
            {}
          );
        }}
      />
    );
  }

  if (step === "agreement") {
    return (
      <AgreementModal
        onClose={() => {
          router.push(
            `${
              initialBitcoinNetwork === BitcoinNetworkType.Testnet
                ? "/testnet"
                : ""
            }/start/${collectionId}`
          );
        }}
        onAgree={() => {
          router.push(
            `${
              initialBitcoinNetwork === BitcoinNetworkType.Testnet
                ? "/testnet"
                : ""
            }/claim/${collectionId}`
          );
        }}
      />
    );
  }

  if (step === "claim") {
    return (
      <ActiveClaim
        network={initialBitcoinNetwork}
        collectionId={collectionId}
      />
    );
  }

  if (step === "pay") {
    return (
      <ActiveClaim
        network={initialBitcoinNetwork}
        collectionId={collectionId}
      />
    );
  }
  return null;
};
