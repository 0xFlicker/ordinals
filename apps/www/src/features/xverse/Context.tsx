import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
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
  createJweRequest,
  decodeJwtToken,
} from "@0xflick/ordinals-rbac-models";
import {
  useBitcoinNonceMutation,
  useSiwbMutation,
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
  const [fetchSiwb] = useSiwbMutation();
  const { data: appInfoData } = useGetAppInfoQuery();
  const issuer = appInfoData?.appInfo?.name;

  // Check for stored token on launch
  useEffect(() => {
    if (!state.ordinalsAddress || !issuer) return;

    const storedToken = localStorage.getItem("xverse_token");
    if (!storedToken) return;

    try {
      const authUser = decodeJwtToken(storedToken, issuer);
      if (authUser && authUser.address === state.ordinalsAddress) {
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
      console.error("Error decoding token:", err);
    }
  }, [state.ordinalsAddress, issuer]);

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
                  ...(addressToSign === state.ordinalsAddress
                    ? { ordinalsAddress: addressToSign }
                    : {}),
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

  const siwb = useCallback(async () => {
    if (!state.ordinalsAddress) {
      throw new Error("No ordinals address available");
    }

    const { data: nonceData } = await fetchNonce({
      variables: {
        address: state.ordinalsAddress,
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
      address: state.ordinalsAddress,
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

    const { data: tokenData } = await fetchSiwb({
      variables: {
        address: state.ordinalsAddress,
        jwe,
      },
    });

    if (!tokenData) {
      throw new Error("Failed to obtain SIWB token");
    }

    // Store the token in localStorage
    if (tokenData.siwb?.token) {
      localStorage.setItem("xverse_token", tokenData.siwb.token);
    }

    return {
      token: tokenData.siwb,
      address: state.ordinalsAddress,
    };
  }, [state.ordinalsAddress, network, sign, fetchNonce, fetchSiwb]);

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
