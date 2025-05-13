import { useXverseConnect } from "@/features/xverse/hooks/useXverseConnect";
import { v4 as uuidv4 } from "uuid";
import { magicEdenIcon, useMagicEden } from "@/features/magic-eden/Context";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { useCallback, useEffect, useMemo, Dispatch, useState } from "react";
import {
  BtcWalletProvider,
  EvmAccount,
  EvmWalletProvider,
  WalletProvider,
  WalletProviderType,
  WalletStandardIntent,
  WalletStandardState,
  actions,
} from "../ducks";
import { BtcAccount } from "../types";
import {
  IUserWithRoles,
  TPermission,
  createJweRequest,
  IUserWithAddresses,
  TAllowedAction,
} from "@0xflick/ordinals-rbac-models";
import { useConnect, injected, useSignMessage } from "wagmi";
import { AnyAction } from "@reduxjs/toolkit";
import {
  useBitflickBtcNonceMutation,
  useBitflickEvmNonceMutation,
} from "./useBitflickWalletImpl.generated";
import gql from "graphql-tag";
import { useAuth } from "@/features/auth";
import { SiweResponseType } from "@/graphql/types";

gql`
  query BitflickSelf {
    self {
      id
      addresses {
        address
        type
      }
      roles {
        id
        name
      }
      allowedActions {
        action
        resource
        identifier
      }
      token
      handle
    }
  }
  mutation BitflickBtcNonce($address: ID!) {
    nonceBitcoin(address: $address) {
      nonce
      messageToSign
      pubKey
    }
  }
  mutation BitflickEvmNonce($address: ID!, $chainId: Int!) {
    nonceEthereum(address: $address, chainId: $chainId) {
      nonce
      messageToSign
      pubKey
    }
  }
`;

// Singleton service to manage async operations
class AsyncOperationManager {
  private static instance: AsyncOperationManager;
  private operations: Map<string, boolean> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private pendingOperations: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  > = new Map();

  private constructor() {}

  static getInstance(): AsyncOperationManager {
    if (!AsyncOperationManager.instance) {
      AsyncOperationManager.instance = new AsyncOperationManager();
    }
    return AsyncOperationManager.instance;
  }

  isOperationRunning(operationId: string): boolean {
    return this.operations.get(operationId) || false;
  }

  startOperation(operationId: string): boolean {
    if (this.operations.get(operationId)) {
      return false;
    }
    this.operations.set(operationId, true);
    return true;
  }

  endOperation(operationId: string): void {
    this.operations.set(operationId, false);
    this.clearTimeout(operationId);
    this.pendingOperations.delete(operationId);
  }

  setOperationTimeout(
    operationId: string,
    callback: () => void,
    ms: number
  ): void {
    this.clearTimeout(operationId);
    const timeoutId = setTimeout(callback, ms);
    this.timeouts.set(operationId, timeoutId);
  }

  private clearTimeout(operationId: string): void {
    const timeoutId = this.timeouts.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(operationId);
    }
  }

  mergeOperation(
    operationId: string,
    resolve: (value: any) => void,
    reject: (reason: any) => void
  ): void {
    const existingOperation = this.pendingOperations.get(operationId);
    if (existingOperation) {
      this.pendingOperations.set(operationId, {
        resolve: (value: any) => {
          existingOperation.resolve(value);
          resolve(value);
          return value;
        },
        reject: (reason: any) => {
          existingOperation.reject(reason);
          reject(reason);
          throw reason;
        },
      });
    } else {
      this.pendingOperations.set(operationId, { resolve, reject });
    }

    this.setOperationTimeout(
      operationId,
      () => {
        this.pendingOperations.delete(operationId);
        reject(new Error("Operation timed out"));
      },
      300000
    ); // 5 minutes timeout
  }

  resolveOperation(operationId: string, value: any): void {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      operation.resolve(value);
      this.endOperation(operationId);
    }
  }

  rejectOperation(operationId: string, reason: any): void {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      operation.reject(reason);
      this.endOperation(operationId);
    }
  }
}

// Get the singleton instance
const operationManager = AsyncOperationManager.getInstance();

export const useBitflickWalletImpl = ({
  state,
  dispatch,
  connectors,
}: {
  state: WalletStandardState;
  dispatch: Dispatch<AnyAction>;
  connectors: {
    id: string;
    name: string;
    icon: string;
    provider: any;
  }[];
}) => {
  // EVM things
  const { connectAsync: wagmiConnectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  // Nonce things, for SIWE/SIWB
  const [fetchBtcNonce] = useBitflickBtcNonceMutation();
  const [fetchEvmNonce] = useBitflickEvmNonceMutation();

  // Bitcoin wallet things
  const magicEden = useMagicEden();
  const xverse = useXverseConnect();

  // Auth things
  const { userId, handle, signInWithSiwb, signInWithSiwe } = useAuth();
  const [requestedBitcoinNetwork, setRequestedBitcoinNetwork] = useState<
    BitcoinNetworkType | undefined
  >(undefined);

  useEffect(() => {
    if (userId && handle) {
      dispatch(actions.setHasLoggedIn(true));
    }
  }, [dispatch, userId, handle]);

  const registerProvider = useCallback(
    (provider: WalletProvider) => {
      dispatch(actions.registerProvider(provider));
    },
    [dispatch]
  );

  const setNeedsBitcoinSelection = useCallback(
    (needsBitcoinSelection: boolean) => {
      dispatch(actions.setNeedsBitcoinSelection(needsBitcoinSelection));
    },
    [dispatch]
  );

  const setNeedsEvmSelection = useCallback(
    (needsEvmSelection: boolean) => {
      dispatch(actions.setNeedsEvmSelection(needsEvmSelection));
    },
    [dispatch]
  );

  const setNeedsConnect = useCallback(
    (needsConnect: boolean) => {
      dispatch(actions.setNeedsConnect(needsConnect));
    },
    [dispatch]
  );

  const setNeedsLogin = useCallback(
    (needsLogin: boolean) => {
      dispatch(actions.setNeedsLogin(needsLogin));
    },
    [dispatch]
  );

  const setIntent = useCallback(
    (intent?: WalletStandardIntent) => {
      dispatch(actions.setIntent(intent));
    },
    [dispatch]
  );

  const needsBitcoinSelection = useMemo(() => {
    return (
      state.activeBtcProvider?.chainType === "btc" &&
      !state.hasLoggedIn &&
      !state.isConnected
    );
  }, [state.activeBtcProvider, state.hasLoggedIn, state.isConnected]);

  const needsEvmSelection = useMemo(() => {
    return (
      state.activeEvmProvider?.chainType === "evm" &&
      !state.hasLoggedIn &&
      !state.isConnected
    );
  }, [state.activeEvmProvider, state.hasLoggedIn, state.isConnected]);

  const connectBtcAsync = useCallback(
    async ({
      provider,
      network,
    }: {
      provider?: BtcWalletProvider;
      network?: BitcoinNetworkType;
    }): Promise<{
      provider: BtcWalletProvider;
      addresses: BtcAccount[];
    }> => {
      if (network) {
        setRequestedBitcoinNetwork(network);
      }
      provider = provider ?? state.activeBtcProvider;
      if (!provider && !needsBitcoinSelection) {
        // If we need to show a modal, create a promise that will resolve when the user completes the action
        return new Promise((resolve, reject) => {
          operationManager.mergeOperation("connect", resolve, reject);
          dispatch(actions.setNeedsBitcoinSelection(true));
        });
      }

      if (!provider) {
        throw new Error("No active BTC provider");
      }
      try {
        dispatch(actions.setIsConnected(true));
        switch (provider.type) {
          case WalletProviderType.MAGIC_EDEN: {
            const {
              ordinalsAddress,
              ordinalsPublicKey,
              paymentAddress,
              paymentPublicKey,
            } = await magicEden.connect({
              message: "Connect your Magic Eden wallet to Bitflick",
              purposes: state.intendedBtcPurposes,
            });
            const btcAddresses: BtcAccount[] = [
              ...(ordinalsAddress
                ? [
                    {
                      address: ordinalsAddress,
                      publicKey: ordinalsPublicKey,
                      purpose: AddressPurpose.Ordinals,
                    },
                  ]
                : []),
              ...(paymentAddress
                ? [
                    {
                      address: paymentAddress,
                      publicKey: paymentPublicKey,
                      purpose: AddressPurpose.Payment,
                    },
                  ]
                : []),
            ];
            dispatch(actions.setBtcAccounts(btcAddresses));
            dispatch(actions.setIsConnected(true));
            if (state.intent === "login") {
              dispatch(actions.setNeedsLogin(true));
            }
            return {
              provider,
              addresses: btcAddresses,
            };
          }
          case WalletProviderType.SATS_CONNECT: {
            const {
              ordinalsAddress,
              ordinalsPublicKey,
              paymentAddress,
              paymentPublicKey,
            } = await xverse.connect();
            if (ordinalsAddress) {
              const btcAddresses: BtcAccount[] = [
                ...(ordinalsAddress
                  ? [
                      {
                        address: ordinalsAddress,
                        publicKey: ordinalsPublicKey,
                        purpose: AddressPurpose.Ordinals,
                      },
                    ]
                  : []),
                ...(paymentAddress
                  ? [
                      {
                        address: paymentAddress,
                        publicKey: paymentPublicKey,
                        purpose: AddressPurpose.Payment,
                      },
                    ]
                  : []),
              ];
              dispatch(actions.setBtcAccounts(btcAddresses));
              dispatch(actions.setIsConnected(true));
              if (state.intent === "login") {
                dispatch(actions.setNeedsLogin(true));
              }
              return {
                provider,
                addresses: btcAddresses,
              };
            } else {
              throw new Error("No ordinals address returned by sats connect");
            }
          }
          case WalletProviderType.INJECTED:
          case WalletProviderType.METAMASK:
          case WalletProviderType.COINBASE:
          case WalletProviderType.WALLET_CONNECT:
          case WalletProviderType.SAFE:
          default:
            throw new Error("Unsupported provider");
        }
      } finally {
        dispatch(actions.setIsConnecting(false));
        dispatch(actions.setNeedsConnect(false));
        dispatch(actions.setNeedsBitcoinSelection(false));
        dispatch(actions.setNeedsEvmSelection(false));
      }
    },
    [
      needsBitcoinSelection,
      state.activeBtcProvider,
      state.intendedBtcPurposes,
      state.intent,
      dispatch,
      magicEden,
      xverse,
    ]
  );

  const connectEvmAsync = useCallback(
    async ({
      provider,
    }: {
      provider?: EvmWalletProvider;
    }): Promise<{
      provider: EvmWalletProvider;
      accounts: EvmAccount[];
    }> => {
      provider = provider ?? state.activeEvmProvider;
      if (!provider && !needsEvmSelection) {
        return new Promise((resolve, reject) => {
          operationManager.mergeOperation("connect", resolve, reject);
          dispatch(actions.setNeedsEvmSelection(true));
        });
      }
      if (!provider) {
        throw new Error("No active EVM provider");
      }
      try {
        dispatch(actions.setIsConnecting(true));
        for (const connector of connectors) {
          if (connector.id === provider.id) {
            const response = await wagmiConnectAsync({
              connector: injected({
                target: {
                  id: connector.id,
                  name: connector.name,
                  provider: connector.provider,
                },
              }),
            });
            if (!response) {
              throw new Error("Failed to connect");
            }
            const { accounts } = response;

            if (accounts && accounts.length > 0) {
              dispatch(actions.setIsConnected(true));
              dispatch(
                actions.setEvmAccounts(
                  accounts.map((account) => ({ address: account }))
                )
              );
              // if intent is login, set needs login
              if (state.intent === "login") {
                dispatch(actions.setNeedsLogin(true));
              }
              return {
                provider,
                accounts: accounts.map((account) => ({ address: account })),
              };
            }
          }
        }
        throw new Error("No connector found for provider");
      } finally {
        dispatch(actions.setIsConnecting(false));
        dispatch(actions.setNeedsConnect(false));
        dispatch(actions.setNeedsEvmSelection(false));
        dispatch(actions.setNeedsBitcoinSelection(false));
      }
    },
    [
      needsEvmSelection,
      state.activeEvmProvider,
      state.intent,
      dispatch,
      connectors,
      wagmiConnectAsync,
    ]
  );

  const loginBtcAsync = useCallback(
    async ({
      address,
      network,
    }: {
      address: string;
      network?: BitcoinNetworkType;
    }) => {
      if (!network) {
        network = requestedBitcoinNetwork;
      }
      // spin up our "sign" op
      if (!operationManager.startOperation("sign")) {
        throw new Error("Sign operation already in progress");
      }
      dispatch(actions.setIsLoggingIn(true));
      try {
        // 1) fetch a Bitcoin nonce + message
        const { data: nonceData } = await fetchBtcNonce({
          variables: { address },
        });
        if (!nonceData) throw new Error("No nonce");

        // 2) ask the wallet to sign
        const { messageToSign, nonce, pubKey } = nonceData.nonceBitcoin;
        let signature: string | null | undefined = null;
        switch (state.activeBtcProvider?.type) {
          case WalletProviderType.MAGIC_EDEN: {
            signature = await magicEden.sign({
              address,
              messageToSign,
            });
            break;
          }
          case WalletProviderType.SATS_CONNECT: {
            signature = await xverse.sign({
              address,
              messageToSign,
              network: {
                type: network ?? BitcoinNetworkType.Mainnet,
              },
            });
            break;
          }
          default:
            throw new Error("Unsupported provider");
        }

        if (!signature) throw new Error("User declined signature");

        // 3) build our JWE
        const jwe = await createJweRequest({
          signature,
          nonce,
          pubKeyStr: pubKey,
        });

        // 4) hand off to auth context (this will dispatch authSucceeded / authFailed)
        return await signInWithSiwb(address, jwe);
      } finally {
        dispatch(actions.setIsLoggingIn(false));
        dispatch(actions.setNeedsLogin(false));
        operationManager.endOperation("sign");
        setRequestedBitcoinNetwork(undefined);
      }
    },
    [
      dispatch,
      fetchBtcNonce,
      signInWithSiwb,
      magicEden,
      state.activeBtcProvider?.type,
      xverse,
      requestedBitcoinNetwork,
    ]
  );

  const loginEvmAsync = useCallback(
    async ({ address }: { address?: string }) => {
      if (!state.activeEvmProvider) throw new Error("No EVM provider");
      address = address ?? state.evmAccounts[0]?.address;
      if (!address) throw new Error("No EVM address");

      if (!operationManager.startOperation("sign")) {
        throw new Error("Sign operation already in progress");
      }
      dispatch(actions.setIsLoggingIn(true));
      try {
        const { data: nonceData } = await fetchEvmNonce({
          variables: { address, chainId: 1 },
        });
        if (!nonceData) throw new Error("No nonce");

        const { messageToSign, nonce, pubKey } = nonceData.nonceEthereum;
        const signature = await signMessageAsync({ message: messageToSign });
        const jwe = await createJweRequest({
          signature,
          nonce,
          pubKeyStr: pubKey,
        });

        return await signInWithSiwe(address, jwe);
      } finally {
        dispatch(actions.setIsLoggingIn(false));
        dispatch(actions.setNeedsLogin(false));
        operationManager.endOperation("sign");
      }
    },
    [
      dispatch,
      fetchEvmNonce,
      signInWithSiwe,
      signMessageAsync,
      state.activeEvmProvider,
      state.evmAccounts,
    ]
  );

  const loginAsync = useCallback(
    async ({
      address,
      btc,
      evm,
      btcOptions,
    }: {
      address?: string;
      btc?: boolean;
      evm?: boolean;
      btcOptions?: {
        network?: BitcoinNetworkType;
      };
    } = {}): Promise<{
      user:
        | (IUserWithAddresses &
            IUserWithRoles & {
              allowedActions: TAllowedAction[];
              permissions: TPermission[];
            })
        | undefined;
      token: string;
      type: SiweResponseType;
    }> => {
      if (btcOptions?.network) {
        setRequestedBitcoinNetwork(btcOptions.network);
      }
      let modalNeeded = false;
      if (btc && !state.flags.needsBitcoinSelection) {
        dispatch(actions.setNeedsBitcoinSelection(true));
        modalNeeded = true;
      }
      if (evm && !state.flags.needsEvmSelection) {
        dispatch(actions.setNeedsEvmSelection(true));
        modalNeeded = true;
      }
      if (modalNeeded) {
        return new Promise((resolve, reject) => {
          operationManager.mergeOperation("login", resolve, reject);
        });
      }

      if (btc || state.activeBtcProvider) {
        address = address ?? state.btcAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginBtcAsync({
          address,
          network: btcOptions?.network ?? requestedBitcoinNetwork,
        });
      } else if (evm || state.activeEvmProvider) {
        address = address ?? state.evmAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginEvmAsync({ address });
      }

      return new Promise((resolve, reject) => {
        operationManager.mergeOperation("login", resolve, reject);
      });
    },
    [
      state.flags.needsBitcoinSelection,
      state.flags.needsEvmSelection,
      state.activeBtcProvider,
      state.activeEvmProvider,
      state.btcAccounts,
      state.evmAccounts,
      dispatch,
      loginBtcAsync,
      requestedBitcoinNetwork,
      loginEvmAsync,
    ]
  );

  const connectAsync: (opts?: {
    btc?: boolean;
    btcOptions?: {
      network?: BitcoinNetworkType;
    };
    evm?: boolean;
  }) => Promise<
    | {
        provider: EvmWalletProvider;
        accounts: EvmAccount[];
      }
    | {
        provider: BtcWalletProvider;
        addresses: BtcAccount[];
      }
  > = useCallback(
    async ({
      btc,
      btcOptions,
      evm,
    }: {
      btc?: boolean;
      btcOptions?: {
        network?: BitcoinNetworkType;
      };
      evm?: boolean;
    } = {}) => {
      if (btcOptions?.network) {
        setRequestedBitcoinNetwork(btcOptions.network);
      }
      const bitcoinNetwork = btcOptions?.network ?? requestedBitcoinNetwork;
      const operationId = "connect";

      // Try to start the operation
      if (!operationManager.startOperation(operationId)) {
        // return the pending operation
        return new Promise((resolve, reject) => {
          operationManager.mergeOperation("connect", resolve, reject);
        });
      }

      try {
        // If BTC is specified, use connectBtcAsync
        if (btc) {
          return await connectBtcAsync({
            provider: state.activeBtcProvider,
            network: bitcoinNetwork,
          });
        }

        // If EVM is specified, use connectEvmAsync
        if (evm) {
          return await connectEvmAsync({
            provider: state.activeEvmProvider,
          });
        }

        // If no specific type is specified, use the active provider
        if (state.activeBtcProvider) {
          return await connectBtcAsync({
            provider: state.activeBtcProvider,
            network: bitcoinNetwork,
          });
        } else if (state.activeEvmProvider) {
          return await connectEvmAsync({
            provider: state.activeEvmProvider,
          });
        }

        // If no provider is active, show the selection modal for both
        return new Promise((resolve, reject) => {
          operationManager.mergeOperation("connect", resolve, reject);

          if (btc) {
            dispatch(actions.setNeedsBitcoinSelection(true));
          } else if (evm) {
            dispatch(actions.setNeedsEvmSelection(true));
          } else if (!evm && !btc) {
            dispatch(actions.setNeedsBitcoinSelection(true));
            dispatch(actions.setNeedsEvmSelection(true));
          }
        });
      } finally {
        operationManager.endOperation(operationId);
      }
    },
    [
      state.activeBtcProvider,
      state.activeEvmProvider,
      connectBtcAsync,
      requestedBitcoinNetwork,
      connectEvmAsync,
      dispatch,
    ]
  );

  // Use a stable ID for each operation
  const connectOperationId = "connect";
  const signOperationId = "sign";

  useEffect(() => {
    if (
      state.flags.needsLogin &&
      !operationManager.isOperationRunning(signOperationId)
    ) {
      dispatch(actions.setNeedsLogin(false));
      loginAsync().finally(() =>
        operationManager.endOperation(signOperationId)
      );
    }
  }, [state.flags.needsLogin, loginAsync, dispatch, signOperationId]);

  useEffect(() => {
    // Only run if needsConnect is true and the operation is not already running
    if (
      state.flags.needsConnect &&
      !operationManager.isOperationRunning(connectOperationId)
    ) {
      dispatch(actions.setNeedsConnect(false));

      // Execute the operation
      connectAsync().finally(() => {
        // Mark the operation as not running
        operationManager.endOperation(connectOperationId);
      });
    }
  }, [state.flags.needsConnect, dispatch, connectOperationId, connectAsync]);

  const signMessage = useCallback(
    async (address: string, message: string) => {
      if (!state.activeBtcProvider) {
        throw new Error("No active BTC provider");
      }
      switch (state.activeBtcProvider.type) {
        case WalletProviderType.MAGIC_EDEN: {
          return await magicEden.sign({
            address,
            messageToSign: message,
          });
        }
        case WalletProviderType.SATS_CONNECT: {
          return await xverse.sign({
            address,
            messageToSign: message,
            network: {
              type: BitcoinNetworkType.Mainnet,
            },
          });
        }
      }
    },
    [state.activeBtcProvider, magicEden, xverse]
  );

  useEffect(() => {
    if (magicEden && magicEden.isMagicEden) {
      registerProvider({
        id: uuidv4(),
        type: WalletProviderType.MAGIC_EDEN,
        name: "Magic Eden",
        icon: magicEdenIcon,
        chainType: "btc",
      });
    }
  }, [magicEden, registerProvider]);

  const connectorReadyStatesKey = connectors
    .map((connector) => `${connector.name}:${connector.provider.ready}`)
    .join(",");

  useEffect(() => {
    for (const connector of connectors) {
      registerProvider({
        id: connector.id ?? uuidv4(),
        type: WalletProviderType.INJECTED,
        name: connector.name,
        icon: connector.icon,
        chainType: "evm",
      });
    }
  }, [connectors, registerProvider, connectorReadyStatesKey]);

  useEffect(() => {
    const startTime = Date.now();
    const timeoutDuration = 10000;
    const intervalDuration = 500;

    const xverseProvider = (window as any).XverseProviders;
    if (xverseProvider) {
      registerProvider({
        id: uuidv4(),
        type: WalletProviderType.SATS_CONNECT,
        name: "Xverse",
        icon: "/images/wallets/xverse.png",
        chainType: "btc",
      });
      return;
    }

    const interval = setInterval(() => {
      if ((window as any).XverseProviders) {
        registerProvider({
          id: uuidv4(),
          type: WalletProviderType.SATS_CONNECT,
          name: "Xverse",
          icon: "/images/wallets/xverse.png",
          chainType: "btc",
        });
        clearInterval(interval);
        return;
      }

      if (Date.now() - startTime >= timeoutDuration) {
        clearInterval(interval);
      }
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [registerProvider]);

  const setActiveBtcProvider = useCallback(
    (activeBtcProvider: BtcWalletProvider, connect?: boolean) => {
      dispatch(actions.setActiveBtcProvider(activeBtcProvider));
      if (connect) {
        return connectBtcAsync({
          provider: activeBtcProvider,
          network: requestedBitcoinNetwork,
        });
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectBtcAsync, requestedBitcoinNetwork]
  );

  const setActiveEvmProvider = useCallback(
    (activeEvmProvider: EvmWalletProvider, connect?: boolean) => {
      dispatch(actions.setActiveEvmProvider(activeEvmProvider));
      if (connect) {
        return connectEvmAsync({
          provider: activeEvmProvider,
        });
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectEvmAsync]
  );

  return {
    connectAsync,
    connectBtcAsync,
    connectEvmAsync,
    loginAsync,
    loginBtcAsync,
    loginEvmAsync,
    signMessage,
    setNeedsBitcoinSelection,
    setNeedsEvmSelection,
    setNeedsConnect,
    setNeedsLogin,
    setActiveBtcProvider,
    setActiveEvmProvider,
    registerProvider,
    setIntent,
    ordinalsAddress: state.btcAccounts?.find(
      (account) => account.purpose === AddressPurpose.Ordinals
    )?.address,
    paymentAddress: state.btcAccounts?.find(
      (account) => account.purpose === AddressPurpose.Payment
    )?.address,
    evmAddress: state.evmAccounts[0]?.address,
    ...state,
    ...state.flags,
  };
};
