"use client";
import { FC } from "react";

import { AgreementModal } from "../AgreementModal";
import { ActiveClaim } from "../ActiveClaim";
import { BitcoinNetworkType } from "sats-connect";
import { useRouter } from "next/navigation";
import { Start } from "../Start/Start";
import CardMedia from "@mui/material/CardMedia";
import NextImage from "next/image";
const RUG = "/images/rug.jpg";

export const Content: FC<{
  collectionId: string;
  initialBitcoinNetwork: BitcoinNetworkType;
  step: "start" | "agreement" | "claim" | "pay" | "done";
}> = ({ collectionId, initialBitcoinNetwork, step }) => {
  const router = useRouter();

  if (step === "start") {
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
      >
        <CardMedia
          component={NextImage}
          image={RUG}
          sx={{
            flexGrow: 1,
          }}
          alt="this is a rug"
        />
      </AgreementModal>
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
