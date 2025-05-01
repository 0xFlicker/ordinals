import { useXverseConnect } from "@/features/xverse/hooks/useXverseConnect";
import { v4 as uuidv4 } from "uuid";
import { magicEdenIcon, useMagicEden } from "@/features/magic-eden/Context";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { useCallback, useEffect, useMemo, useState, Dispatch } from "react";
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
import { createJweRequest } from "@0xflick/ordinals-rbac-models";
import { useConnect, injected, useSignMessage } from "wagmi";
import { AnyAction } from "@reduxjs/toolkit";
import {
  useBitflickBtcNonceMutation,
  useBitflickEvmNonceMutation,
  useBitflickSiwbSignInMutation,
  useBitflickSiweSignInMutation,
} from "./useBitflickWalletImpl.generated";
import gql from "graphql-tag";
import { mapSelfToUser } from "@/utils/transforms";
import { useAuth } from "@/features/auth";

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
  mutation BitflickSiweSignIn($address: ID!, $jwe: String!) {
    siwe(address: $address, jwe: $jwe) {
      data {
        token
        user {
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
          handle
        }
      }
      problems {
        message
      }
    }
  }

  mutation BitflickSiwbSignIn($address: ID!, $jwe: String!) {
    siwb(address: $address, jwe: $jwe) {
      data {
        token
        user {
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
          handle
        }
      }
      problems {
        message
      }
    }
  }
`;
// Singleton service to manage async operations
class AsyncOperationManager {
  private static instance: AsyncOperationManager;
  private operations: Map<string, boolean> = new Map();

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
  }
}

// Get the singleton instance
const operationManager = AsyncOperationManager.getInstance();

type PendingOperationState = {
  connect?: {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  };
  login?: {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  };
};

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
  // const wallets = useWallets();
  const { connectAsync: wagmiConnectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [fetchBtcNonce] = useBitflickBtcNonceMutation();
  const [fetchEvmNonce] = useBitflickEvmNonceMutation();
  const [fetchSiwb] = useBitflickSiwbSignInMutation();
  const [fetchSiwe] = useBitflickSiweSignInMutation();

  const [operationTimeoutId, setOperationTimeoutId] =
    useState<NodeJS.Timeout | null>(null);
  const [pendingConnectOperation, setPendingConnectOperation] =
    useState<PendingOperationState>({});

  const magicEden = useMagicEden();
  const xverse = useXverseConnect();

  const { userId, handle } = useAuth();
  useEffect(() => {
    if (userId && handle) {
      dispatch(actions.setIsLoggedIn(true));
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
      !state.isLoggedIn &&
      !state.isConnected
    );
  }, [state.activeBtcProvider, state.isLoggedIn, state.isConnected]);

  const needsEvmSelection = useMemo(() => {
    return (
      state.activeEvmProvider?.chainType === "evm" &&
      !state.isLoggedIn &&
      !state.isConnected
    );
  }, [state.activeEvmProvider, state.isLoggedIn, state.isConnected]);

  const expireOperation = useCallback((reject: (reason: any) => void) => {
    // Set up a timeout to reject the promise if it takes too long
    const timeoutId = setTimeout(() => {
      setPendingConnectOperation({});
      reject(new Error("Operation timed out"));
    }, 300000); // 5 minutes timeout

    // Store the timeout ID in local state
    setOperationTimeoutId((existingOperationTimeoutId) => {
      if (existingOperationTimeoutId) {
        clearTimeout(existingOperationTimeoutId);
      }
      return timeoutId;
    });
  }, []);

  const mergeOperation = useCallback(
    ({
      resolve,
      reject,
      operation: newOperationMode,
    }: {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      operation: "connect" | "login";
    }) => {
      const otherMode = newOperationMode === "connect" ? "login" : "connect";

      setPendingConnectOperation((existingOperation) => {
        if (newOperationMode === "connect" && existingOperation.login) {
          reject(new Error("Login operation already in progress"));
        }
        if (existingOperation[newOperationMode]) {
          return {
            [newOperationMode]: {
              resolve: (value: any) => {
                existingOperation[newOperationMode]?.resolve(value);
                resolve(value);
                return value;
              },
              reject: (reason: any) => {
                existingOperation[newOperationMode]?.reject(reason);
                reject(reason);
                throw reason;
              },
            },
            ...(existingOperation[otherMode]
              ? { [otherMode]: existingOperation[otherMode] }
              : {}),
          };
        }
        return {
          [newOperationMode]: {
            resolve,
            reject,
          },
          ...(existingOperation[otherMode]
            ? { [otherMode]: existingOperation[otherMode] }
            : {}),
        };
      });

      expireOperation(reject);
    },
    [expireOperation]
  );

  // Async version of connectBtc that returns the result
  const connectBtcAsync = useCallback(
    async (
      provider?: BtcWalletProvider
    ): Promise<{
      provider: BtcWalletProvider;
      addresses: BtcAccount[];
    }> => {
      if (!provider && !needsBitcoinSelection) {
        // If we need to show a modal, create a promise that will resolve when the user completes the action
        return new Promise((resolve, reject) => {
          mergeOperation({
            resolve,
            reject,
            operation: "connect",
          });

          // Show the modal
          dispatch(actions.setNeedsBitcoinSelection(true));
        });
      }

      provider = provider ?? state.activeBtcProvider;
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
        dispatch(actions.setIsConnected(false));
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
      mergeOperation,
      magicEden,
      xverse,
    ]
  );

  // Async version of connectEvm that returns the result
  const connectEvmAsync = useCallback(
    async (
      provider?: EvmWalletProvider
    ): Promise<{
      provider: EvmWalletProvider;
      accounts: EvmAccount[];
    }> => {
      if (!provider && !needsEvmSelection) {
        // If we need to show a modal, create a promise that will resolve when the user completes the action
        return new Promise((resolve, reject) => {
          // Store the pending operation in local state
          mergeOperation({
            resolve,
            reject,
            operation: "connect",
          });
          // Show the modal
          dispatch(actions.setNeedsEvmSelection(true));
        });
      }

      provider = provider ?? state.activeEvmProvider;
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
      }
    },
    [
      needsEvmSelection,
      state.activeEvmProvider,
      state.intent,
      mergeOperation,
      dispatch,
      connectors,
      wagmiConnectAsync,
    ]
  );

  // Async version of connect that returns the result
  const connectAsync = useCallback(
    async ({ btc, evm }: { btc?: boolean; evm?: boolean } = {}) => {
      const operationId = "connect";

      // Try to start the operation
      if (!AsyncOperationManager.getInstance().startOperation(operationId)) {
        // return the pending operation
        return new Promise((resolve, reject) => {
          // Store the pending operation in local state
          mergeOperation({
            resolve,
            reject,
            operation: "connect",
          });
        });
      }

      try {
        // If BTC is specified, use connectBtcAsync
        if (btc) {
          return await connectBtcAsync();
        }

        // If EVM is specified, use connectEvmAsync
        if (evm) {
          return await connectEvmAsync();
        }

        // If no specific type is specified, use the active provider
        if (state.activeBtcProvider) {
          return await connectBtcAsync();
        } else if (state.activeEvmProvider) {
          return await connectEvmAsync();
        }

        // If no provider is active, show the selection modal for both
        return new Promise((resolve, reject) => {
          // Store the pending operation in local state
          mergeOperation({
            resolve,
            reject,
            operation: "connect",
          });

          if (btc) {
            dispatch(actions.setNeedsBitcoinSelection(true));
          } else if (evm) {
            dispatch(actions.setNeedsEvmSelection(true));
          }
        });
      } finally {
        AsyncOperationManager.getInstance().endOperation(operationId);
      }
    },
    [
      mergeOperation,
      state.activeBtcProvider,
      state.activeEvmProvider,
      connectBtcAsync,
      connectEvmAsync,
      dispatch,
    ]
  );

  const loginBtcAsync = useCallback(
    async (address: string) => {
      if (!state.activeBtcProvider) {
        throw new Error("No active BTC provider");
      }

      const lock = AsyncOperationManager.getInstance().startOperation("login");
      if (!lock) {
        throw new Error("Login operation already in progress");
      }

      try {
        dispatch(actions.setIsLoggingIn(true));
        switch (state.activeBtcProvider.type) {
          case WalletProviderType.SATS_CONNECT: {
            const result = await xverse.handleLogin(address);
            dispatch(actions.setIsLoggedIn(true));
            return result;
          }
          case WalletProviderType.MAGIC_EDEN: {
            if (!magicEden.isConnected) {
              throw new Error("Magic Eden is not connected");
            }
            const { data: nonceData } = await fetchBtcNonce({
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

            const signature = await magicEden.sign({
              address,
              messageToSign,
            });

            if (!signature) {
              throw new Error("Signature was declined");
            }

            const jwe = await createJweRequest({
              signature,
              nonce,
              pubKeyStr: pubKey,
            });

            const { data: siwbData } = await fetchSiwb({
              variables: {
                address,
                jwe,
              },
            });

            if (!siwbData) {
              throw new Error("No SIWB data received");
            }

            dispatch(actions.setIsLoggedIn(true));
            const user = siwbData.siwb.data?.user
              ? mapSelfToUser(siwbData.siwb.data?.user)
              : null;
            if (user) {
              return {
                token: siwbData.siwb.data?.token,
                user,
              };
            }
            return {
              token: siwbData.siwb.data?.token,
              user: null,
            };
          }
        }
      } finally {
        dispatch(actions.setIsLoggingIn(false));
        dispatch(actions.setNeedsLogin(false));
        AsyncOperationManager.getInstance().endOperation("login");
      }
    },
    [
      state.activeBtcProvider,
      xverse,
      dispatch,
      magicEden,
      fetchBtcNonce,
      fetchSiwb,
    ]
  );

  // Async version of loginEvm that returns the result
  const loginEvmAsync = useCallback(
    async (address?: string) => {
      if (!state.activeEvmProvider) {
        throw new Error("No active EVM provider");
      }
      if (!address) {
        address = state.evmAccounts[0]?.address;
      }
      if (!address) {
        throw new Error("No address provided");
      }

      const lock = AsyncOperationManager.getInstance().startOperation("login");
      if (!lock) {
        throw new Error("Login operation already in progress");
      }

      try {
        dispatch(actions.setIsLoggingIn(true));
        const { data: nonceData } = await fetchEvmNonce({
          variables: {
            address,
            chainId: 1,
          },
        });
        if (!nonceData) {
          throw new Error("No nonce data received");
        }
        const {
          nonceEthereum: { messageToSign, nonce, pubKey },
        } = nonceData;

        const signature = await signMessageAsync({
          message: messageToSign,
        });

        const jwe = await createJweRequest({
          signature,
          nonce,
          pubKeyStr: pubKey,
        });

        const { data: siweData } = await fetchSiwe({
          variables: {
            address,
            jwe,
          },
        });

        if (!siweData) {
          throw new Error("No SIWE data received");
        }
        if (!siweData.siwe.data?.user) {
          return {
            token: siweData.siwe.data?.token,
            user: null,
          };
        }
        dispatch(actions.setIsLoggedIn(true));
        const user = mapSelfToUser(siweData.siwe.data?.user);
        if (!user) {
          throw new Error("No user data received");
        }
        return {
          token: siweData.siwe.data?.token,
          user,
        };
      } finally {
        dispatch(actions.setIsLoggingIn(false));
        dispatch(actions.setNeedsLogin(false));
        AsyncOperationManager.getInstance().endOperation("login");
      }
    },
    [
      state.activeEvmProvider,
      state.evmAccounts,
      fetchEvmNonce,
      signMessageAsync,
      fetchSiwe,
      dispatch,
    ]
  );

  // Async version of login that returns the result
  const loginAsync = useCallback(
    async ({
      address,
      btc,
      evm,
    }: {
      address?: string;
      btc?: boolean;
      evm?: boolean;
    } = {}) => {
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
        return;
      }

      if (btc || state.activeBtcProvider) {
        address = address ?? state.btcAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginBtcAsync(address);
      } else if (evm || state.activeEvmProvider) {
        address = address ?? state.evmAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginEvmAsync(address);
      }

      return new Promise((resolve, reject) => {
        mergeOperation({
          resolve,
          reject,
          operation: "login",
        });
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
      loginEvmAsync,
      mergeOperation,
    ]
  );

  // Use a stable ID for each operation
  const connectOperationId = useMemo(() => "connect", []);
  const loginOperationId = useMemo(() => "login", []);

  useEffect(() => {
    // Only run if needsLogin is true and the operation is not already running
    if (
      state.flags.needsLogin &&
      !operationManager.isOperationRunning(loginOperationId)
    ) {
      // Immediately set the flag to false to prevent multiple executions
      dispatch(actions.setNeedsLogin(false));

      // Execute the operation
      loginAsync().finally(() => {
        // Mark the operation as not running
        operationManager.endOperation(loginOperationId);
      });
    }
  }, [state.flags.needsLogin, loginAsync, dispatch, loginOperationId]);

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
        return connectBtcAsync(activeBtcProvider);
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectBtcAsync]
  );

  const setActiveEvmProvider = useCallback(
    (activeEvmProvider: EvmWalletProvider, connect?: boolean) => {
      dispatch(actions.setActiveEvmProvider(activeEvmProvider));
      if (connect) {
        return connectEvmAsync(activeEvmProvider);
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectEvmAsync]
  );

  // Effect to handle provider selection and connection
  useEffect(() => {
    // If a provider was selected and we have a pending connect operation
    if (
      (state.activeBtcProvider || state.activeEvmProvider) &&
      (pendingConnectOperation.connect || pendingConnectOperation.login)
    ) {
      // Clear any existing timeout
      if (operationTimeoutId) {
        clearTimeout(operationTimeoutId);
        setOperationTimeoutId(null);
      }

      // Execute the appropriate connect function
      const executeConnect = async () => {
        try {
          let result;
          if (state.activeBtcProvider) {
            result = await connectBtcAsync(state.activeBtcProvider);
          } else if (state.activeEvmProvider) {
            result = await connectEvmAsync(state.activeEvmProvider);
          }

          // Resolve the pending operation with the result
          pendingConnectOperation.connect?.resolve(result);
        } catch (error) {
          // Reject the pending operation with the error
          pendingConnectOperation.connect?.reject(error);
        } finally {
          setPendingConnectOperation(({ login }) => ({ login }));
        }
      };

      executeConnect();
    }
  }, [
    state.activeBtcProvider,
    state.activeEvmProvider,
    connectBtcAsync,
    connectEvmAsync,
    operationTimeoutId,
    pendingConnectOperation,
    setPendingConnectOperation,
  ]);

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
