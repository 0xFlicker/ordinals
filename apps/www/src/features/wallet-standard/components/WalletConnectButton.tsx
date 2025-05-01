"use client";
import React, { FC, useEffect } from "react";
import { useBitflickWallet } from "../Context";
import Button from "@mui/material/Button";
import { BitcoinIcon } from "@/components/BitcoinIcon";
import { EthereumIcon } from "@/components/EthereumIcon";
import Box from "@mui/material/Box";
import { Avatar } from "@mui/material";
import { useAuth } from "@/features/auth";

export type WalletConnectIntent = "connect" | "login";

// Type assertion for untyped module
const createStellarIdenticon = require("stellar-identicon-js") as (
  address: string
) => HTMLCanvasElement;

// AvatarGroup component for displaying 1-2 elements with proper sizing
const AvatarGroup: FC<{
  children: React.ReactNode[];
  size?: number;
  overlap?: number;
}> = ({ children, size = 16, overlap = 12 }) => {
  // Ensure we only have 1-2 children
  const elements = React.Children.toArray(children).slice(0, 2);

  // Calculate container width based on number of elements
  const containerWidth = elements.length === 1 ? size : size + (size - overlap);

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        width: containerWidth,
        height: size,
        mr: 2,
        alignItems: "center",
      }}
    >
      {elements.map((child, index) => (
        <Box
          key={index}
          sx={{
            position: "absolute",
            left: index * (size - overlap),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid black",
            borderRadius: "50%",
            padding: "6px",
            background: "white",
            zIndex: elements.length - index,
            width: size,
            height: size,
          }}
        >
          {child}
        </Box>
      ))}
    </Box>
  );
};

export const WalletConnectButton: FC<{
  pickBtc?: boolean;
  pickEvm?: boolean;
  intent?: WalletConnectIntent;
  user?: { handle?: string; userId?: string };
}> = ({ pickBtc = true, pickEvm = true, intent = "login", user: propUser }) => {
  const {
    isConnected,
    setNeedsBitcoinSelection,
    setNeedsEvmSelection,
    setNeedsConnect,
    setNeedsLogin,
    activeBtcProvider,
    activeEvmProvider,
    setIntent,
    ordinalsAddress,
    evmAddress,
  } = useBitflickWallet();

  const { userId, handle, isLoggedIn } = useAuth();

  // Prioritize user from props over context user
  const resolvedUser = propUser || { userId, handle };

  useEffect(() => {
    if (typeof intent === "string") {
      setIntent(intent);
    }
  }, [intent, setIntent]);

  const renderIcons = (userId: string) => {
    if (userId) {
      const canvas = createStellarIdenticon(userId);
      return (
        <Avatar
          src={canvas.toDataURL()}
          variant="circular"
          sizes="small"
          sx={{
            width: 10,
            height: 10,
            border: "2px solid #FFCC80",
            background: "background",
            padding: 1,
            borderRadius: "50%",
            ml: 1,
            mr: 1,
          }}
        />
      );
    }

    if (pickBtc && !pickEvm) {
      return <BitcoinIcon size={16} />;
    }

    if (pickEvm && !pickBtc) {
      return <EthereumIcon size={16} />;
    }

    if (pickBtc && pickEvm) {
      return (
        <AvatarGroup size={8}>
          <BitcoinIcon size={20} />
          <EthereumIcon size={20} />
        </AvatarGroup>
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
    if (propUser?.userId) {
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

  const isLoggedInOrPropUser = propUser?.userId || isLoggedIn;

  return (
    <Button
      variant="contained"
      onClick={handleConnect}
      startIcon={renderIcons(
        resolvedUser.userId ?? ordinalsAddress ?? evmAddress ?? ""
      )}
      disabled={resolvedUser.userId ? true : isLoggedIn}
      color={isLoggedInOrPropUser ? "success" : "primary"}
      sx={{
        textTransform: "none",
        color: isLoggedInOrPropUser ? "primary.main" : "background.paper",
        "&.Mui-disabled": {
          color: "primary.main",
        },
        pr: 2,
      }}
    >
      {getButtonText()}
    </Button>
  );
};
