import { useCallback, useState } from "react";
import {
  IUser,
  IUserWithAddresses,
  IUserWithRoles,
  UserWithRolesModel,
  createJweRequest,
} from "@0xflick/ordinals-rbac-models";
import { useXverse } from "../Context";
import { useBitcoinNonceMutation } from "../graphql/nonce.generated";
import { BitcoinNetworkType } from "sats-connect";
import { useWeb3SiwbSignInMutation } from "@/features/auth/hooks/signin.generated";

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
    sign,
    siwb,
  } = useXverse();

  const [fetchNonce] = useBitcoinNonceMutation();
  const [fetchSiwb] = useWeb3SiwbSignInMutation();
  const [handle, setHandle] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (ordinalsAddress: string) => {
      try {
        onUpdateFlow?.({ flow: EFlow.SignatureRequesting });
        if (!ordinalsAddress) {
          setHandle(null);
          throw new Error("No ordinals address available");
        }

        const { data: nonceData } = await fetchNonce({
          variables: {
            address: ordinalsAddress,
          },
        });

        if (!nonceData) {
          setHandle(null);
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
          setHandle(null);
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
          setHandle(null);
          throw new Error("No SIWB data received");
        }

        if (!siwbData.siwb?.data?.token) {
          setHandle(null);
          throw new Error("No SIWB data received");
        }

        if (!siwbData.siwb.data.user) {
          setHandle(null);
          return {
            token: siwbData.siwb.data.token,
            ordinalsAddress,
          };
        }

        if (siwbData.siwb.data.user.handle) {
          setHandle(siwbData.siwb.data.user.handle);
        } else {
          setHandle(null);
        }
        return {
          token: siwbData.siwb.data.token,
          user: new UserWithRolesModel({
            userId: siwbData.siwb.data.user.id,
            handle: siwbData.siwb.data.user.handle,
            roleIds: siwbData.siwb.data.user.roles.map((role) => role.id),
          }),
          ordinalsAddress,
        };
      } catch (error) {
        setHandle(null);
        if (
          error instanceof Error &&
          error.message === "Signature was declined"
        ) {
          onUpdateFlow?.({ flow: EFlow.SignatureDeclined });
          return {
            ordinalsAddress,
          };
        }
        throw error;
      }
    },
    [onUpdateFlow, fetchNonce, sign, fetchSiwb]
  );

  const connect = useCallback(async () => {
    try {
      onUpdateFlow?.({ flow: EFlow.Connecting });
      return await xverseConnect({
        message: "Connect to bitflick",
      });
    } catch (error) {
      setHandle(null);
      console.error("error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      onUpdateFlow?.({
        flow: EFlow.Error,
        error,
        message,
      });
      throw error;
    }
  }, [onUpdateFlow, xverseConnect]);

  const handleBitcoinConnect: () => Promise<{
    token?: string;
    user?: IUserWithRoles;
    ordinalsAddress?: string;
  }> = useCallback(async () => {
    const { ordinalsAddress } = await connect();
    if (ordinalsAddress) {
      return handleLogin(ordinalsAddress);
    }
    setHandle(null);
    return { ordinalsAddress };
  }, [connect, handleLogin]);

  return {
    handleBitcoinConnect,
    connect,
    handleLogin,
    isConnected,
    isConnecting,
    ordinalsAddress,
    siwb,
    sign,
    handle,
  };
};
