import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { BtcAccount } from "./types";
import { AddressPurpose } from "sats-connect";

export enum WalletProviderType {
  MAGIC_EDEN = "magicEden",
  SATS_CONNECT = "satsConnect",
  INJECTED = "injected",
  COINBASE = "coinbase",
  WALLET_CONNECT = "walletConnect",
  METAMASK = "metamask",
  SAFE = "safe",
}

interface BaseWalletProvider {
  id: string;
  type: WalletProviderType;
  name: string;
  icon?: string;
}

export interface BtcWalletProvider extends BaseWalletProvider {
  chainType: "btc";
}

export interface EvmWalletProvider extends BaseWalletProvider {
  chainType: "evm";
}

export type WalletProvider = BtcWalletProvider | EvmWalletProvider;

export function isBtcProvider(
  provider: Omit<WalletProvider, "chainType">
): provider is BtcWalletProvider {
  return (
    provider.type === WalletProviderType.MAGIC_EDEN ||
    provider.type === WalletProviderType.SATS_CONNECT
  );
}

export function isEvmProvider(
  provider: Omit<WalletProvider, "chainType">
): provider is EvmWalletProvider {
  return !isBtcProvider(provider);
}

export interface EvmAccount {
  address: string;
}

export type WalletStandardIntent = "connect" | "login";

type WalletFlags =
  | "needsBitcoinSelection"
  | "needsEvmSelection"
  | "needsConnect"
  | "needsLogin";

export interface WalletStandardState {
  activeBtcProvider?: BtcWalletProvider;
  activeEvmProvider?: EvmWalletProvider;
  availableProviders: WalletProvider[];
  isConnected: boolean;
  isConnecting: boolean;
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  btcAccounts: BtcAccount[];
  evmAccounts: EvmAccount[];
  intendedBtcPurposes: AddressPurpose[];
  intent?: WalletStandardIntent;
  flags: Record<WalletFlags, boolean>;
}

export const initialState: WalletStandardState = {
  availableProviders: [
    // {
    //   type: WalletProviderType.SATS_CONNECT,
    //   name: "Xverse",
    //   icon: "/images/wallets/xverse.png",
    //   provider: null,
    // },
    // {
    //   type: WalletProviderType.CONNECT_KIT,
    //   name: "Connect Kit",
    //   icon: "/images/wallets/connectkit.jpeg",
    //   provider: null,
    // },
  ],
  isConnected: false,
  isConnecting: false,
  isLoggedIn: false,
  isLoggingIn: false,
  btcAccounts: [],
  evmAccounts: [],
  intendedBtcPurposes: [AddressPurpose.Ordinals],
  intent: undefined,
  flags: {
    needsBitcoinSelection: false,
    needsEvmSelection: false,
    needsConnect: false,
    needsLogin: false,
  },
};
export const walletStandardSlice = createSlice({
  name: "walletStandard",
  initialState,
  reducers: {
    setActiveBtcProvider: (state, action: PayloadAction<BtcWalletProvider>) => {
      state.activeBtcProvider = action.payload;
    },
    setActiveEvmProvider: (state, action: PayloadAction<EvmWalletProvider>) => {
      state.activeEvmProvider = action.payload;
    },
    registerProvider: (
      state,
      action: PayloadAction<Omit<WalletProvider, "chainType">>
    ) => {
      const exists = state.availableProviders.some(
        (provider) =>
          provider.type === action.payload.type &&
          provider.name === action.payload.name &&
          provider.icon === action.payload.icon
      );
      if (!exists) {
        state.availableProviders = [
          ...state.availableProviders,
          {
            ...action.payload,
            chainType: isBtcProvider(action.payload) ? "btc" : "evm",
          },
        ];
      }
    },
    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setIsConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
    },
    setIsLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    },
    setIsLoggingIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggingIn = action.payload;
    },
    setBtcAccounts: (state, action: PayloadAction<BtcAccount[]>) => {
      state.btcAccounts = action.payload;
    },
    setEvmAccounts: (state, action: PayloadAction<EvmAccount[]>) => {
      state.evmAccounts = action.payload;
    },
    setNeedsBitcoinSelection: (state, action: PayloadAction<boolean>) => {
      state.flags.needsBitcoinSelection = action.payload;
    },
    setNeedsEvmSelection: (state, action: PayloadAction<boolean>) => {
      state.flags.needsEvmSelection = action.payload;
    },
    setNeedsConnect: (state, action: PayloadAction<boolean>) => {
      state.flags.needsConnect = action.payload;
    },
    setNeedsLogin: (state, action: PayloadAction<boolean>) => {
      state.flags.needsLogin = action.payload;
    },
    setIntendedBtcPurposes: (
      state,
      action: PayloadAction<AddressPurpose[]>
    ) => {
      state.intendedBtcPurposes = action.payload;
    },
    setIntent: (
      state,
      action: PayloadAction<WalletStandardIntent | undefined>
    ) => {
      state.intent = action.payload;
    },
  },
});

export const actions = walletStandardSlice.actions;

export const reducer = walletStandardSlice.reducer;
