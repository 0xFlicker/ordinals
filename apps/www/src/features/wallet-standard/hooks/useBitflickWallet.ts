import { useXverseConnect } from "@/features/xverse/hooks/useXverseConnect";
import { UiWallet, useWallets } from "@wallet-standard/react";
import { v4 as uuidv4 } from "uuid";
import { magicEdenIcon, useMagicEden } from "@/features/magic-eden/Context";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BtcWalletProvider,
  EvmWalletProvider,
  WalletProvider,
  WalletProviderType,
  actions,
} from "../ducks";
import { useWalletStandard } from "../Context";
import { BtcAccount } from "../types";
import { useWeb3SiwbSignInMutation } from "@/features/auth/hooks/signin.generated";
import { useBitcoinNonceMutation } from "@/features/xverse/graphql/nonce.generated";
import { createJweRequest } from "@0xflick/ordinals-rbac-models";
import { useConnect, injected, useSignMessage } from "wagmi";

export const useBitflickWallet = () => {
  const wallets = useWallets();
  const { connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [fetchNonce] = useBitcoinNonceMutation();
  const [fetchSiwb] = useWeb3SiwbSignInMutation();
  const [handle, setHandle] = useState<string | null>(null);

  const magicEden = useMagicEden();
  const xverse = useXverseConnect();
  const { state, dispatch, connectors } = useWalletStandard();

  const setIsConnected = useCallback(
    (isConnected: boolean) => {
      dispatch(actions.setIsConnected(isConnected));
    },
    [dispatch]
  );

  const setIsConnecting = useCallback(
    (isConnecting: boolean) => {
      dispatch(actions.setIsConnecting(isConnecting));
    },
    [dispatch]
  );

  const setIsLoggedIn = useCallback(
    (isLoggedIn: boolean) => {
      dispatch(actions.setIsLoggedIn(isLoggedIn));
    },
    [dispatch]
  );

  const setIsLoggingIn = useCallback(
    (isLoggingIn: boolean) => {
      dispatch(actions.setIsLoggingIn(isLoggingIn));
    },
    [dispatch]
  );

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

  const connectEvm = useCallback(
    async (provider?: EvmWalletProvider) => {
      if (!provider && !needsEvmSelection) {
        return dispatch(actions.setNeedsEvmSelection(true));
      }
      provider = provider ?? state.activeEvmProvider;
      if (!provider) {
        throw new Error("No active EVM provider");
      }
      try {
        setIsConnecting(true);
        for (const connector of connectors) {
          if (connector.id === provider.id) {
            const response = await connectAsync({
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
              console.log("accounts", accounts);
              dispatch(
                actions.setEvmAccounts(
                  accounts.map((account) => ({ address: account }))
                )
              );
              break;
            }
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsConnecting(false);
        setNeedsEvmSelection(false);
        setNeedsBitcoinSelection(false);
      }
    },
    [
      needsEvmSelection,
      state.activeEvmProvider,
      dispatch,
      setIsConnecting,
      connectors,
      connectAsync,
      setNeedsEvmSelection,
      setNeedsBitcoinSelection,
    ]
  );

  const connectBtc = useCallback(
    async (provider?: BtcWalletProvider) => {
      if (!provider && !needsBitcoinSelection) {
        return dispatch(actions.setNeedsBitcoinSelection(true));
      }
      provider = provider ?? state.activeBtcProvider;
      if (!provider) {
        throw new Error("No active BTC provider");
      }
      try {
        setIsConnecting(true);
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
            break;
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
            }
            break;
          }
          case WalletProviderType.INJECTED:
          case WalletProviderType.METAMASK:
          case WalletProviderType.COINBASE:
          case WalletProviderType.WALLET_CONNECT:
          case WalletProviderType.SAFE:
          default:
            throw new Error("Unsupported provider");
        }
        setIsConnected(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsConnecting(false);
        setNeedsBitcoinSelection(false);
        setNeedsEvmSelection(false);
      }
    },
    [
      needsBitcoinSelection,
      state.activeBtcProvider,
      state.intendedBtcPurposes,
      dispatch,
      setIsConnecting,
      setIsConnected,
      magicEden,
      xverse,
    ]
  );

  const connect = useCallback(
    async ({ btc, evm }: { btc: boolean; evm: boolean }) => {
      let modalNeeded = false;
      if (btc && !state.needsBitcoinSelection) {
        dispatch(actions.setNeedsBitcoinSelection(true));
        modalNeeded = true;
      }
      if (evm && !state.needsEvmSelection) {
        dispatch(actions.setNeedsEvmSelection(true));
        modalNeeded = true;
      }
      if (modalNeeded) {
        return;
      }
      if (btc) {
        return await connectBtc();
      }
      if (evm) {
        return await connectEvm();
      }
      throw new Error("Unsupported provider");
    },
    [
      connectBtc,
      connectEvm,
      dispatch,
      state.needsBitcoinSelection,
      state.needsEvmSelection,
    ]
  );

  const loginEvm = useCallback(
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
      try {
        setIsLoggingIn(true);
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

        const signature = await signMessageAsync({
          message: messageToSign,
        });

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

        setIsLoggedIn(true);
        return {
          token: siwbData.siwb.data?.token,
          user: siwbData.siwb.data?.user,
        };
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [
      fetchNonce,
      fetchSiwb,
      magicEden,
      setIsLoggedIn,
      setIsLoggingIn,
      state.activeEvmProvider,
    ]
  );
  const loginBtc = useCallback(
    async (address: string) => {
      if (!state.activeBtcProvider) {
        throw new Error("No active BTC provider");
      }
      setIsLoggingIn(true);
      switch (state.activeBtcProvider.type) {
        case WalletProviderType.SATS_CONNECT: {
          return await xverse.handleLogin(address);
        }
        case WalletProviderType.MAGIC_EDEN: {
          let wasLoaded = false;
          try {
            if (!magicEden.isConnected) {
              throw new Error("Magic Eden is not connected");
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
            setIsLoggedIn(true);
            wasLoaded = true;
            return {
              token: siwbData.siwb.data?.token,
              user: siwbData.siwb.data?.user,
            };
          } catch (error) {
            console.error(error, "magic eden error");
          } finally {
            if (!wasLoaded) {
              setHandle(null);
            }
            setIsLoggingIn(false);
          }
        }
      }
    },
    [
      fetchNonce,
      fetchSiwb,
      magicEden,
      setIsLoggedIn,
      setIsLoggingIn,
      state.activeBtcProvider,
      xverse,
    ]
  );

  const login = useCallback(
    async ({
      address,
      btc,
      evm,
    }: {
      address?: string;
      btc?: boolean;
      evm?: boolean;
    }) => {
      let modalNeeded = false;
      if (btc && !state.needsBitcoinSelection) {
        dispatch(actions.setNeedsBitcoinSelection(true));
        modalNeeded = true;
      }
      if (evm && !state.needsEvmSelection) {
        dispatch(actions.setNeedsEvmSelection(true));
        modalNeeded = true;
      }
      if (modalNeeded) {
        return;
      }
      if (btc) {
        address = address ?? state.btcAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginBtc(address);
      }
      if (evm) {
        address = address ?? state.evmAccounts[0]?.address;
        if (!address) {
          throw new Error("No address provided");
        }
        return await loginEvm(address);
      }
      throw new Error("Unsupported provider");
    },
    [
      dispatch,
      loginEvm,
      loginBtc,
      state.activeBtcProvider,
      state.activeEvmProvider,
    ]
  );
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

  // Check once for magic eden
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

  // Create a string representation of all connector ready states
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
      // }
    }
  }, [connectors, registerProvider, connectorReadyStatesKey]);

  useEffect(() => {
    const startTime = Date.now();
    const timeoutDuration = 10000; // 10 seconds
    const intervalDuration = 500; // 500ms

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
        return connectBtc(activeBtcProvider);
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectBtc]
  );

  const setActiveEvmProvider = useCallback(
    (activeEvmProvider: EvmWalletProvider, connect?: boolean) => {
      dispatch(actions.setActiveEvmProvider(activeEvmProvider));
      if (connect) {
        return connectEvm(activeEvmProvider);
      }
      return Promise.resolve(void 0);
    },
    [dispatch, connectEvm]
  );

  return {
    connect,
    connectBtc,
    connectEvm,
    login,
    loginBtc,
    loginEvm,
    signMessage,
    setNeedsBitcoinSelection,
    setNeedsEvmSelection,
    setActiveBtcProvider,
    setActiveEvmProvider,
    registerProvider,
    handle,
    ...state,
  };
};
