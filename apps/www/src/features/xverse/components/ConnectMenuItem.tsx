import { BitcoinIcon } from "@/components/BitcoinIcon";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";

import { FC, useCallback, useState } from "react";
import { useXverse } from "../Context";
import { BitcoinSwitchNetworks } from "./BitcoinSwitchNetworks";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { BitcoinNetworkType } from "sats-connect";

export enum EFlow {
  Idle = "idle",
  Connecting = "connecting",
  Connected = "connected",
  SignatureRequesting = "signature-requesting",
  SignatureObtained = "signature-obtained",
  SignatureDeclined = "signature-declined",
  Error = "error",
}

type FlowUpdate =
  | {
      flow:
        | EFlow.Idle
        | EFlow.Connecting
        | EFlow.Connected
        | EFlow.SignatureRequesting
        | EFlow.SignatureDeclined
        | EFlow.SignatureObtained;
    }
  | {
      flow: EFlow.Error;
      error: unknown;
      message?: string;
    };

export const ConnectMenuItem: FC<{
  onUpdateFlow?: (flow: FlowUpdate) => void;
}> = ({ onUpdateFlow }) => {
  const {
    connect: xverseConnect,
    isConnected,
    isConnecting,
    state: { ordinalsAddress },
    siwb,
  } = useXverse();

  const handleBitcoinConnect = useCallback(async () => {
    try {
      onUpdateFlow?.({ flow: EFlow.Connecting });
      const { ordinalsAddress } = await xverseConnect({
        message: "Connect to bitflick",
      });

      if (ordinalsAddress) {
        onUpdateFlow?.({ flow: EFlow.SignatureRequesting });
        try {
          await siwb(ordinalsAddress);
          onUpdateFlow?.({ flow: EFlow.SignatureObtained });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Signature was declined"
          ) {
            onUpdateFlow?.({ flow: EFlow.SignatureDeclined });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      onUpdateFlow?.({
        flow: EFlow.Error,
        error,
        message,
      });
    }
  }, [onUpdateFlow, xverseConnect, siwb]);

  return (
    <MenuItem onClick={handleBitcoinConnect}>
      <ListItemIcon>
        <BitcoinIcon />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography textAlign="right" noWrap>
            {!isConnected || isConnecting ? "connect" : ordinalsAddress}
          </Typography>
        }
      />
      <CheckCircleIcon
        color={isConnected ? "success" : "disabled"}
        sx={{
          ml: 2,
        }}
      />
      <BitcoinSwitchNetworks
        sx={{
          ml: 1,
        }}
      />
    </MenuItem>
  );
};
