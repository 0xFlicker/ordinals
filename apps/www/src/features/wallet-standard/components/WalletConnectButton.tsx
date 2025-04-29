"use client";
import React, { FC, useEffect } from "react";
import { useBitflickWallet } from "../Context";
import Button from "@mui/material/Button";
import { BitcoinIcon } from "@/components/BitcoinIcon";
import { EthereumIcon } from "@/components/EthereumIcon";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";

export type WalletConnectIntent = "connect" | "login";

export const WalletConnectButton: FC<{
  pickBtc?: boolean;
  pickEvm?: boolean;
  intent?: WalletConnectIntent;
  user?: { handle: string };
}> = ({
  pickBtc = true,
  pickEvm = true,
  intent = "connect",
  user: propUser,
}) => {
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
    user: contextUser,
  } = useBitflickWallet();

  // Prioritize user from props over context user
  const user = propUser || contextUser;
  const handle = user?.handle;

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
    // If user is provided in props, don't do anything on click
    if (propUser) {
      return;
    }

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
        setNeedsConnect(true);
      }
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleConnect}
      startIcon={renderIcons()}
      disabled={propUser ? true : isLoggedIn}
      color={propUser || isLoggedIn ? "success" : "primary"}
    >
      {getButtonText()}
    </Button>
  );
};
