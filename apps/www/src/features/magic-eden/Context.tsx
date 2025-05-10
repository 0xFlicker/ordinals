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
import * as jsontokens from "jsontokens";
import {
  actionCreators,
  AsyncStatus,
  initialState,
  magicEdenReducer,
} from "./ducks";
import {
  AddressResponse,
  ProviderAPI,
  SignMessagePayload,
  getBtcProvider,
} from "./types";
import { AddressPurpose, BitcoinNetwork } from "sats-connect";

export const magicEdenIcon =
  "data:image/png+xml;base64,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";

function useMagicEdenContext(opts: {
  network: BitcoinNetwork["type"];
  purpose: AddressPurpose[];
}) {
  const [state, dispatch] = useReducer(magicEdenReducer, {
    ...initialState,
    network: opts.network,
    purpose: opts.purpose,
  });

  const actions = useMemo(
    () => ({
      connectInit: () => dispatch(actionCreators.connectInit()),
      connectFulfilled: ({
        paymentAddress,
        paymentPublicKey,
        ordinalsAddress,
        ordinalsPublicKey,
      }: {
        paymentAddress?: string;
        paymentPublicKey?: string;
        ordinalsAddress?: string;
        ordinalsPublicKey?: string;
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
        localStorage.removeItem("magic_eden_token");
        dispatch(actionCreators.setVerifiedOrdinalsAddress(""));
      },
    }),
    []
  );

  const isConnected = state.connectionStatus === AsyncStatus.FULFILLED;
  const isConnecting = state.connectionStatus === AsyncStatus.PENDING;
  const network = state.network;
  const purpose = state.purpose;

  const connect = useCallback(
    async (opts?: { message?: string; purposes?: AddressPurpose[] }) => {
      actions.connectInit();
      try {
        const btcProvider = getBtcProvider();
        if (!btcProvider) {
          throw new Error("Magic Eden wallet not found");
        }

        const token = jsontokens.createUnsecuredToken({
          purposes: opts?.purposes || purpose,
          message: opts?.message || "Bitflick wants to know your addresses",
        });

        const response = await btcProvider.connect(token);
        const { addresses } = response;

        if (addresses && addresses.length > 0) {
          const paymentAccount = addresses.find(
            (account: AddressResponse) =>
              account.purpose === AddressPurpose.Payment
          );
          const ordinalsAccount = addresses.find(
            (account: AddressResponse) =>
              account.purpose === AddressPurpose.Ordinals
          );

          if (paymentAccount || ordinalsAccount) {
            actions.connectFulfilled({
              paymentAddress: paymentAccount?.address,
              paymentPublicKey: paymentAccount?.publicKey,
              ordinalsAddress: ordinalsAccount?.address,
              ordinalsPublicKey: ordinalsAccount?.publicKey,
            });
            return {
              paymentAddress: paymentAccount?.address,
              paymentPublicKey: paymentAccount?.publicKey,
              ordinalsAddress: ordinalsAccount?.address,
              ordinalsPublicKey: ordinalsAccount?.publicKey,
            };
          } else {
            throw new Error("No payment or ordinals account found");
          }
        } else {
          throw new Error("No accounts returned from Magic Eden wallet");
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          actions.connectRejected(error.message);
        }
        throw error;
      }
    },
    [actions, purpose]
  );

  const sign = useCallback(
    async ({
      messageToSign,
      address: addressToSign,
    }: {
      messageToSign: string;
      address: string;
    }) => {
      try {
        const btcProvider = getBtcProvider();
        if (!btcProvider) {
          throw new Error("Magic Eden wallet not found");
        }

        const signMessagePayload: SignMessagePayload = {
          address: addressToSign,
          message: messageToSign,
        };

        dispatch(actionCreators.signatureRequestInit());

        const token = jsontokens.createUnsecuredToken({
          ...signMessagePayload,
        });
        const signature = await btcProvider.signMessage(token);

        dispatch(
          actionCreators.signatureRequestFulfilled({
            signature,
            ordinalsAddress: addressToSign,
          })
        );

        return signature;
      } catch (error: unknown) {
        if (error instanceof Error) {
          dispatch(actionCreators.signatureRequestRejected(error.message));
        }
        throw error;
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
      dispatch(actionCreators.setNetwork(network));
      dispatch(actionCreators.setPurpose(purpose));
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
        const btcProvider = getBtcProvider();
        if (!btcProvider) {
          reject(new Error("Magic Eden wallet not found"));
          return;
        }

        if (!state.paymentAddress) {
          reject(new Error("Address is required"));
          return;
        }

        const payload = {
          recipients: [
            {
              address: paymentAddress,
              amountSats: paymentAmountSats.toString(),
            },
          ],
          senderAddress: state.paymentAddress,
        };

        const token = jsontokens.createUnsecuredToken(payload);

        btcProvider.sendBtcTransaction(token).then(resolve).catch(reject);
      });
    },
    [state.paymentAddress]
  );

  const btcProvider = getBtcProvider();

  return {
    isMagicEden: !!btcProvider,
    btcProvider,
    state,
    connect,
    sign,
    network,
    purpose,
    networkSelect,
    isConnected,
    isConnecting,
    sendBtc,
    clearVerifiedAddress: actions.clearVerifiedAddress,
  };
}

type TContext = ReturnType<typeof useMagicEdenContext>;
const MagicEdenContext = createContext<TContext | null>(null);

export const MagicEdenProvider: FC<
  PropsWithChildren<{
    network: BitcoinNetwork["type"];
    purpose: AddressPurpose[];
  }>
> = ({ children, network, purpose }) => {
  const context = useMagicEdenContext({
    network,
    purpose,
  });
  return (
    <MagicEdenContext.Provider value={context}>
      {children}
    </MagicEdenContext.Provider>
  );
};

export function useMagicEden() {
  const context = useContext(MagicEdenContext);
  if (!context) {
    throw new Error("useMagicEden must be used within a MagicEdenProvider");
  }
  return context;
}
