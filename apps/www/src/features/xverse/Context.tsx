"use client";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useEffect,
} from "react";
import Wallet, {
  signMessage,
  BitcoinNetwork,
  GetAddressPayload,
  AddressPurpose,
  SignMessagePayload,
  sendBtcTransaction,
} from "sats-connect";
import {
  actionCreators,
  AsyncStatus,
  initialState,
  xverseReducer,
} from "./ducks";
import {
  IUserAddress,
  createJweRequest,
  importSPKIKey,
  verifyJwtToken,
} from "@0xflick/ordinals-rbac-models";
import {
  useBitcoinNonceMutation,
  useSignInBitcoinMutation,
} from "./graphql/nonce.generated";
import { useGetAppInfoQuery } from "@/features/auth/hooks/app.generated";

function useXverseContext(opts: {
  network: BitcoinNetwork["type"];
  purpose: AddressPurpose[];
}) {
  const [state, dispatch] = useReducer(xverseReducer, {
    ...initialState,
    currentTarget: {
      network: opts.network,
      purpose: opts.purpose,
    },
  });

  const [fetchNonce] = useBitcoinNonceMutation();
  const [signInBitcoin] = useSignInBitcoinMutation();
  const { data: appInfoData } = useGetAppInfoQuery();
  const issuer = appInfoData?.appInfo?.name;

  // Check for stored token on launch
  useEffect(() => {
    if (!state.ordinalsAddress || !issuer) return;

    const storedToken = localStorage.getItem("xverse_token");
    if (!storedToken) return;

    async function verifyToken() {
      try {
        if (!storedToken) return;
        const pubKeyStr = appInfoData?.appInfo?.pubKey;
        if (!pubKeyStr) return;
        const authUser = await verifyJwtToken(
          storedToken,
          await importSPKIKey(pubKeyStr)
        );
        const authUserAddress = authUser.address as IUserAddress;
        if (
          state.ordinalsAddress &&
          authUserAddress.address === state.ordinalsAddress
        ) {
          console.log(
            "Found a token and the token addresses matches the ordinals address, setting verified address"
          );
          dispatch(
            actionCreators.setVerifiedOrdinalsAddress(state.ordinalsAddress)
          );
        } else {
          console.warn(`Unable to parse token for ${state.ordinalsAddress}`);
        }
      } catch (err) {
        localStorage.removeItem("xverse_token");
        console.error("Error decoding token:", err);
      }
    }
    verifyToken();
  }, [state.ordinalsAddress, issuer, appInfoData?.appInfo?.pubKey]);

  const actions = useMemo(
    () => ({
      connectInit: () => dispatch(actionCreators.connectInit()),
      connectFulfilled: ({
        paymentAddress,
        paymentPublicKey,
        ordinalsAddress,
        ordinalsPublicKey,
      }: {
        paymentAddress: string;
        paymentPublicKey: string;
        ordinalsAddress: string;
        ordinalsPublicKey: string;
      }) =>
        dispatch(
          actionCreators.connectFulfilled({
            paymentAddress,
            paymentPublicKey,
            ordinalsAddress,
            ordinalsPublicKey,
          })
        ),
      connectRejected: (errorMessage: string) =>
        dispatch(actionCreators.connectRejected(errorMessage)),
      clearVerifiedAddress: () => {
        localStorage.removeItem("xverse_token");
        dispatch(actionCreators.setVerifiedOrdinalsAddress(""));
      },
    }),
    []
  );
  const isConnected = state.connectionStatus === AsyncStatus.FULFILLED;
  const isConnecting = state.connectionStatus === AsyncStatus.PENDING;
  const network = state.currentTarget?.network;
  const purpose = state.currentTarget?.purpose;

  const connect = useCallback(
    async (opts?: Omit<GetAddressPayload, "network" | "purposes">) => {
      actions.connectInit();
      try {
        const response = await Wallet.request("getAccounts", {
          purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
          message: "Bitflick wants to know your addresses",
          ...opts,
        });
        if (response.status === "success") {
          const accounts = response.result;
          const paymentAccount = accounts.find(
            (account) => account.purpose === AddressPurpose.Payment
          );
          const ordinalsAccount = accounts.find(
            (account) => account.purpose === AddressPurpose.Ordinals
          );
          if (paymentAccount && ordinalsAccount) {
            actions.connectFulfilled({
              paymentAddress: paymentAccount.address,
              paymentPublicKey: paymentAccount.publicKey,
              ordinalsAddress: ordinalsAccount.address,
              ordinalsPublicKey: ordinalsAccount.publicKey,
            });
            return {
              paymentAddress: paymentAccount.address,
              paymentPublicKey: paymentAccount.publicKey,
              ordinalsAddress: ordinalsAccount.address,
              ordinalsPublicKey: ordinalsAccount.publicKey,
            };
          } else {
            throw new Error("No payment or ordinals account found");
          }
        } else {
          throw new Error(response.error.message);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          actions.connectRejected(error.message);
        }
        throw error;
      }
    },
    [actions]
  );

  const sign = useCallback(
    async ({
      messageToSign,
      network,
      address: addressToSign,
    }: {
      messageToSign: string;
      network: BitcoinNetwork;
      address: string;
    }) => {
      try {
        if (!network) {
          throw new Error("Network is required");
        }
        const signMessagePayload = {
          address: addressToSign,
          message: messageToSign,
          network,
        } as SignMessagePayload;
        dispatch(actionCreators.signatureRequestInit());
        const response = await new Promise<string>((resolve, reject) =>
          signMessage({
            payload: signMessagePayload,
            onFinish(response) {
              dispatch(
                actionCreators.signatureRequestFulfilled({
                  signature: response,
                  ordinalsAddress: addressToSign,
                })
              );
              resolve(response);
            },
            onCancel() {
              dispatch(
                actionCreators.signatureRequestRejected("User canceled")
              );
              reject(new Error("User canceled"));
            },
          })
        );
        return response;
      } catch (error: unknown) {
        if (error instanceof Error) {
          dispatch(actionCreators.signatureRequestRejected(error.message));
        }
      }
    },
    []
  );

  const networkSelect = useCallback(
    ({
      network,
      purpose,
    }: {
      network: BitcoinNetwork["type"];
      purpose: AddressPurpose[];
    }) => {
      dispatch(actionCreators.switchTarget({ network, purpose }));
    },
    []
  );

  const sendBtc = useCallback(
    ({
      paymentAddress,
      paymentAmountSats,
    }: {
      paymentAddress: string;
      paymentAmountSats: bigint | number;
    }) => {
      return new Promise((resolve, reject) => {
        if (!state.paymentAddress) {
          throw new Error("Address is required");
        }
        return sendBtcTransaction({
          payload: {
            network: {
              type: network,
            },
            recipients: [
              {
                address: paymentAddress,
                amountSats: BigInt(paymentAmountSats),
              },
            ],
            senderAddress: state.paymentAddress,
          },
          onCancel() {
            reject(new Error("User canceled"));
          },
          onFinish(response) {
            resolve(response);
          },
        });
      });
    },
    [network, state.paymentAddress]
  );

  const siwb = useCallback(
    async (address?: string) => {
      address = address ?? state.ordinalsAddress;
      if (!address) {
        throw new Error("No ordinals address available");
      }

      const { data: nonceData } = await fetchNonce({
        variables: {
          address,
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
        address,
        network: {
          type: network,
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

      const { data: tokenData } = await signInBitcoin({
        variables: {
          address,
          jwe,
        },
      });

      if (!tokenData || !tokenData.signInBitcoin?.user?.token) {
        dispatch(
          actionCreators.signatureRequestRejected("Failed to obtain SIWB token")
        );
        throw new Error("Failed to obtain SIWB token");
      }

      // Store the token in localStorage
      localStorage.setItem("xverse_token", tokenData.signInBitcoin.user.token);

      return {
        token: tokenData.signInBitcoin.user.token,
        address: state.ordinalsAddress!,
      };
    },
    [state.ordinalsAddress, fetchNonce, sign, network, signInBitcoin]
  );

  return {
    state,
    connect,
    sign,
    network,
    purpose,
    networkSelect,
    isConnected,
    isConnecting,
    sendBtc,
    siwb,
    clearVerifiedAddress: actions.clearVerifiedAddress,
  };
}

type TContext = ReturnType<typeof useXverseContext>;
const XverseProvider = createContext<TContext | null>(null);

export const Provider: FC<
  PropsWithChildren<{
    network: BitcoinNetwork["type"];
    purpose: AddressPurpose[];
  }>
> = ({ children, network, purpose }) => {
  const context = useXverseContext({
    network,
    purpose,
  });
  return (
    <XverseProvider.Provider value={context}>
      {children}
    </XverseProvider.Provider>
  );
};

export function useXverse() {
  const context = useContext(XverseProvider);
  if (!context) {
    throw new Error("useXverse must be used within a XverseProvider");
  }
  return context;
}
