import React, { FC, useEffect } from "react";
import { useBitflickWallet } from "../Context";
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
  const {
    isConnected,
    isLoggedIn,
    setNeedsBitcoinSelection,
    setNeedsEvmSelection,
    setNeedsConnect,
    setNeedsLogin,
    activeBtcProvider,
    activeEvmProvider,
    setIntent,
    handle,
  } = useBitflickWallet();

  useEffect(() => {
    if (typeof intent === "string") {
      setIntent(intent);
    }
  }, [intent, setIntent]);

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

  const getButtonText = () => {
    if (handle) {
      return handle;
    } else if (isLoggedIn) {
      return "Connected";
    } else if (isConnected) {
      return "Login";
    } else {
      return intent === "login" ? "Connect & Login" : "Connect";
    }
  };

  const handleConnect = () => {
    if (intent === "connect") {
      if (isConnected) {
        // Already connected, do nothing
        return;
      }
      if ((pickBtc && !activeBtcProvider) || (pickEvm && !activeEvmProvider)) {
        if (pickBtc) {
          setNeedsBitcoinSelection(true);
        }
        if (pickEvm) {
          setNeedsEvmSelection(true);
        }
      } else {
        console.log("WalletConnectButton setNeedsConnect(true)");
        setNeedsConnect(true);
      }
    } else if (intent === "login") {
      if (isLoggedIn) {
        // Already logged in, do nothing
        return;
      } else if (isConnected) {
        // Connected but not logged in, proceed to login
        setNeedsLogin(true);
      } else if (
        (pickBtc && !activeBtcProvider) ||
        (pickEvm && !activeEvmProvider)
      ) {
        if (pickBtc) {
          setNeedsBitcoinSelection(true);
        }
        if (pickEvm) {
          setNeedsEvmSelection(true);
        }
      } else {
        console.log("WalletConnectButton setNeedsConnect(true)");
        setNeedsConnect(true);
      }
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleConnect}
      startIcon={renderIcons()}
      disabled={isLoggedIn}
      color={isLoggedIn ? "success" : "primary"}
    >
      {getButtonText()}
    </Button>
  );
};
