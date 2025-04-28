import type { WalletWithFeatures } from "@wallet-standard/base";
import type { BitcoinConnectFeature } from "@exodus/bitcoin-wallet-standard-features";
import type { StandardEventsFeature } from "@wallet-standard/features";
import { AddressPurpose } from "sats-connect";

export type BtcAccount = {
  address: string;
  publicKey?: string;
  purpose: AddressPurpose;
};

/** Type of all Bitcoin features. */
export type BitcoinFeatures = BitcoinConnectFeature & StandardEventsFeature;

/** Wallet with Bitcoin features. */
export type WalletWithBitcoinFeatures = WalletWithFeatures<BitcoinFeatures>;
