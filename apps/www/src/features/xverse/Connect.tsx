import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import { FC, useCallback, useState } from "react";
import { useXverseConnect } from "./hooks/useXverseConnect";
import { BitcoinIcon } from "@/components/BitcoinIcon";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { IUserWithRoles } from "@0xflick/ordinals-rbac-models";

export const Connect: FC<{
  onSignIn?: (user: IUserWithRoles) => void;
}> = ({ onSignIn }) => {
  const {
    handleBitcoinConnect,
    isConnected,
    isConnecting,
    ordinalsAddress,
    handle,
  } = useXverseConnect();

  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    try {
      setError(null);
      const { user } = (await handleBitcoinConnect()) ?? {};

      if (user) {
        onSignIn?.(user);
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [handleBitcoinConnect, onSignIn]);

  // Display address in a truncated format
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {error && (
        <Typography color="error" variant="caption" sx={{ mr: 2 }}>
          {error}
        </Typography>
      )}

      <Tooltip title={isConnected ? ordinalsAddress : "Connect to Xverse"}>
        <Button
          variant="contained"
          color="primary"
          onClick={onClick}
          disabled={isConnecting}
          startIcon={
            isConnected ? (
              <Avatar sx={{ width: 24, height: 24, bgcolor: "primary.dark" }}>
                <BitcoinIcon />
              </Avatar>
            ) : null
          }
          endIcon={
            isConnecting ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {isConnected
            ? handle || formatAddress(ordinalsAddress || "")
            : "Connect"}
        </Button>
      </Tooltip>
    </Box>
  );
};
