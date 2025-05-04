import { FC } from "react";
import { BitCard } from "@/components/BitCard";
import { WalletConnectButton } from "@/features/wallet-standard";

export const ConnectOrSignup: FC = () => {
  return (
    <BitCard
      sx={{
        minWidth: {
          xs: "100%",
          md: 400,
        },
        maxWidth: 600,
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <WalletConnectButton />
    </BitCard>
  );
};
