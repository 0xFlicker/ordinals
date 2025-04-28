import React, { FC } from "react";
import { useBitflickWallet } from "../hooks/useBitflickWallet";
import Button from "@mui/material/Button";
import { BitcoinIcon } from "@/components/BitcoinIcon";
import { EthereumIcon } from "@/components/EthereumIcon";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { WalletProviderType } from "../ducks";

export type WalletConnectIntent = "connect" | "login";

export const WalletConnectButton: FC<{
  pickBtc?: boolean;
  pickEvm?: boolean;
  intent?: WalletConnectIntent;
}> = ({ pickBtc = true, pickEvm = true, intent = "connect" }) => {
  const { connect, login } = useBitflickWallet();

  const renderIcons = () => {
    if (pickBtc && !pickEvm) {
      return <BitcoinIcon size={24} />;
    }

    if (pickEvm && !pickBtc) {
      return <EthereumIcon size={24} />;
    }

    if (pickBtc && pickEvm) {
      return (
        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
            width: 36,
            height: 24,
          }}
        >
          <BitcoinIcon size={24} />
          <Box sx={{ position: "absolute", left: 12 }}>
            <EthereumIcon size={24} />
          </Box>
        </Box>
      );
    }

    return null;
  };

  const handleConnect = () => {
    if (intent === "connect") {
      // Default to Bitcoin if both are enabled
      connect({
        btc: true,
        evm: true,
      });
    } else if (intent === "login") {
      login({
        btc: true,
        evm: true,
      });
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleConnect}
      startIcon={renderIcons()}
    >
      Connect
    </Button>
  );
};
