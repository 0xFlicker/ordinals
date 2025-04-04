import { BitcoinIcon } from "@/components/BitcoinIcon";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";

import { FC, useCallback, useState } from "react";
import { useXverse } from "../Context";
import {
  BitcoinNonceMutation,
  useBitcoinNonceMutation,
  useSiwbMutation,
} from "../graphql/nonce.generated";
import { BitcoinSwitchNetworks } from "./BitcoinSwitchNetworks";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { createJweRequest } from "@0xflick/ordinals-rbac-models";
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
    state: { ordinalsAddress, paymentAddress },
    sign,
    network,
  } = useXverse();
  const [
    fetchNonce,
    { loading: fetchingNonce, error: nonceError, data: nonceData },
  ] = useBitcoinNonceMutation();
  const [
    fetchSiwb,
    { loading: fetchingSiwb, error: siwbError, data: siwbData },
  ] = useSiwbMutation();
  const handleBitcoinConnect = useCallback(async () => {
    try {
      onUpdateFlow?.({ flow: EFlow.Connecting });
      const { ordinalsAddress, ordinalsPublicKey } = await xverseConnect({
        message: "Connect to bitflick",
      });
      if (ordinalsAddress) {
        onUpdateFlow?.({ flow: EFlow.SignatureRequesting });
        const { data: nonceData } = await fetchNonce({
          variables: {
            address: ordinalsAddress,
          },
        });
        if (!nonceData) {
          return console.warn("No nonce data");
        }
        const {
          nonceBitcoin: { messageToSign, nonce, pubKey },
        } = nonceData;
        const signature = await sign({
          messageToSign,
          address: ordinalsAddress,
          network: {
            type: network,
          },
        });
        if (!signature) {
          return onUpdateFlow?.({ flow: EFlow.SignatureDeclined });
        }
        const jwe = await createJweRequest({
          signature,
          nonce,
          pubKeyStr: pubKey,
        });
        const { data: tokenData } = await fetchSiwb({
          variables: {
            address: ordinalsAddress,
            jwe,
          },
        });
        if (!tokenData) {
          return onUpdateFlow?.({ flow: EFlow.SignatureDeclined });
        }
        const { siwb: token } = tokenData;
        console.log("token", token);
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
  }, [fetchNonce, fetchSiwb, onUpdateFlow, sign, xverseConnect]);
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
