import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { useBitflickWallet } from "../hooks/useBitflickWallet";
import {
  BtcWalletProvider,
  EvmWalletProvider,
  WalletProvider,
  WalletProviderType,
  isBtcProvider,
  isEvmProvider,
  WalletStandardIntent,
} from "../ducks";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";

export enum CloseReason {
  CONNECT = "CONNECT",
  LOGIN = "LOGIN",
  CLOSE = "CLOSE",
}

interface WalletPickerProps {
  onProviderSelected?: (provider: WalletProvider) => void;
  onClose?: (reason: CloseReason) => void;
  intent?: WalletStandardIntent;
}

export const WalletPicker: FC<WalletPickerProps> = ({
  onProviderSelected,
  onClose,
  intent,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const paperRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [loginAttempted, setLoginAttempted] = useState<boolean>(false);

  const {
    availableProviders,
    setActiveBtcProvider,
    setActiveEvmProvider,
    setIntent,
    isConnected,
    isLoggedIn,
    needsBitcoinSelection,
    needsEvmSelection,
    setNeedsConnect,
    setNeedsLogin,
  } = useBitflickWallet();

  const pickBtc = needsBitcoinSelection;
  const pickEvm = needsEvmSelection;

  // Filter providers by type
  const btcProviders = availableProviders.filter(
    (provider) =>
      provider.type === WalletProviderType.MAGIC_EDEN ||
      provider.type === WalletProviderType.SATS_CONNECT
  );

  const evmProviders = availableProviders.filter(
    (provider) =>
      provider.type === WalletProviderType.COINBASE ||
      provider.type === WalletProviderType.METAMASK ||
      provider.type === WalletProviderType.WALLET_CONNECT ||
      provider.type === WalletProviderType.INJECTED ||
      provider.type === WalletProviderType.SAFE
  );

  const handleProviderClick = useCallback(
    async (provider: WalletProvider) => {
      if (intent) {
        setIntent(intent);
      }

      if (isBtcProvider(provider)) {
        await setActiveBtcProvider(provider);
      } else {
        await setActiveEvmProvider(provider);
      }

      onProviderSelected?.(provider);

      // If we're connected and the intent is login, trigger login
      if (isConnected && intent === "login" && !loginAttempted) {
        setLoginAttempted(true);
        setNeedsLogin(true);
      } else if (!isConnected) {
        console.log("handleProviderClick setNeedsConnect(true)");
        setNeedsConnect(true);
      }
    },
    [
      isConnected,
      intent,
      loginAttempted,
      setActiveBtcProvider,
      setActiveEvmProvider,
      setIntent,
      setLoginAttempted,
      setNeedsConnect,
      setNeedsLogin,
      onProviderSelected,
    ]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.(CloseReason.CLOSE);
      } else if (e.key === "Tab") {
        // Let the default tab behavior handle focus
        return;
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const allProviders = [...btcProviders, ...evmProviders];
        setFocusedIndex((prev) =>
          prev < allProviders.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const allProviders = [...btcProviders, ...evmProviders];
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : allProviders.length - 1
        );
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        const allProviders = [...btcProviders, ...evmProviders];
        if (focusedIndex < allProviders.length) {
          const newProvider = allProviders[focusedIndex];
          handleProviderClick(newProvider);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    btcProviders,
    evmProviders,
    focusedIndex,
    handleProviderClick,
    onClose,
    onProviderSelected,
    setActiveBtcProvider,
    setActiveEvmProvider,
  ]);

  // Focus the first provider when the component mounts
  useEffect(() => {
    if (btcProviders.length > 0 || evmProviders.length > 0) {
      setFocusedIndex(0);
    }
  }, [btcProviders.length, evmProviders.length]);

  useEffect(() => {
    if (isConnected && isLoggedIn && intent === "login") {
      onClose?.(CloseReason.LOGIN);
    } else if (isConnected && intent === "connect") {
      onClose?.(CloseReason.CONNECT);
    }
  }, [isConnected, isLoggedIn, onClose, intent]);

  const renderProviderButton = (provider: WalletProvider, index: number) => {
    const isFocused = focusedIndex === index;

    return (
      <Box
        key={`${provider.type}-${provider.name}`}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          border: isFocused
            ? `2px solid ${theme.palette.primary.main}`
            : "2px solid transparent",
          borderRadius: 1,
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            bgcolor: "action.hover",
          },
          width: isMobile ? "100%" : "150px",
          height: "150px",
        }}
        onClick={() => handleProviderClick(provider)}
        onFocus={() => setFocusedIndex(index)}
        tabIndex={0}
      >
        {provider.icon && (
          <Box
            sx={{
              mb: 1,
              position: "relative",
              width: "80%",
              height: "80%",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provider.icon}
              alt={provider.name}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          </Box>
        )}
        <Typography variant="body2" align="center">
          {provider.name}
        </Typography>
      </Box>
    );
  };

  // If both pickBtc and pickEvm are false, return null
  if (!pickBtc && !pickEvm) {
    return null;
  }

  return (
    <Paper
      ref={paperRef}
      elevation={3}
      sx={{
        p: 3,
        minWidth: isMobile ? "100%" : "600px",
        maxWidth: isMobile ? "100%" : "600px",
        height: "fit-content",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Connect Wallet
      </Typography>

      {pickBtc && btcProviders.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Bitcoin
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 2,
              p: 1,
            }}
          >
            {btcProviders.map((provider, index) =>
              renderProviderButton(provider, index)
            )}
          </Box>
        </Box>
      )}

      {pickEvm && evmProviders.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            EVM
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 2,
              p: 1,
            }}
          >
            {evmProviders.map((provider, index) =>
              renderProviderButton(provider, btcProviders.length + index)
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
