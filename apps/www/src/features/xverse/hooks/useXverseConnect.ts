import { useCallback } from "react";
import { createJweRequest } from "@0xflick/ordinals-rbac-models";
import { useXverse } from "../Context";
import {
  useBitcoinNonceMutation,
  useSiwbMutation,
} from "../graphql/nonce.generated";
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

export type FlowUpdate =
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

export const useXverseConnect = (onUpdateFlow?: (flow: FlowUpdate) => void) => {
  const {
    connect: xverseConnect,
    isConnected,
    isConnecting,
    state: { ordinalsAddress },
    siwb,
    sign,
  } = useXverse();

  const [fetchNonce] = useBitcoinNonceMutation();
  const [fetchSiwb] = useSiwbMutation();

  const handleBitcoinConnect = useCallback(async () => {
    try {
      onUpdateFlow?.({ flow: EFlow.Connecting });
      const { ordinalsAddress } = await xverseConnect({
        message: "Connect to bitflick",
      });

      if (ordinalsAddress) {
        onUpdateFlow?.({ flow: EFlow.SignatureRequesting });
        try {
          if (!ordinalsAddress) {
            throw new Error("No ordinals address available");
          }

          const { data: nonceData } = await fetchNonce({
            variables: {
              address: ordinalsAddress,
            },
          });

          if (!nonceData) {
            throw new Error("No nonce data received");
          }

          const {
            nonceBitcoin: { messageToSign, nonce, pubKey },
          } = nonceData;

          const signature = await sign({
            messageToSign,
            address: ordinalsAddress,
            network: {
              type: BitcoinNetworkType.Mainnet,
            },
          });

          if (!signature) {
            throw new Error("Signature was declined");
          }

          const jwe = await createJweRequest({
            signature,
            nonce,
            pubKeyStr: pubKey,
          });
          onUpdateFlow?.({ flow: EFlow.SignatureObtained });

          const { data: siwbData } = await fetchSiwb({
            variables: {
              address: ordinalsAddress,
              jwe,
            },
          });

          if (!siwbData) {
            throw new Error("No SIWB data received");
          }

          if (!siwbData.siwb?.token) {
            throw new Error("No SIWB data received");
          }

          return siwbData.siwb.token;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Signature was declined"
          ) {
            onUpdateFlow?.({ flow: EFlow.SignatureDeclined });
            return null;
          }
          throw error;
        }
      }
      return null;
    } catch (error) {
      console.error("error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      onUpdateFlow?.({
        flow: EFlow.Error,
        error,
        message,
      });
    }
  }, [onUpdateFlow, xverseConnect, fetchNonce, sign, fetchSiwb]);

  return {
    handleBitcoinConnect,
    isConnected,
    isConnecting,
    ordinalsAddress,
    siwb,
  };
};
