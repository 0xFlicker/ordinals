"use client";
import { UiWallet, useWallets } from "@wallet-standard/react";
import * as jsontokens from "jsontokens";
import { AddressPurpose } from "sats-connect";
import classNames from "classnames";
import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectionStatusContext } from "@/features/wallet-standard/ConnectionStatus";
import { Purpose } from "@/features/wallet-standard/types";

function isSatsConnectCompatibleWallet(wallet: UiWallet) {
  return wallet.features.includes("sats-connect:");
  // return "sats-connect:" in wallet.features;
}
const getBtcProvider = () => {
  if ("magicEden" in window) {
    const anyWindow: any = window;
    if (anyWindow.magicEden.bitcoin && anyWindow.magicEden.bitcoin.isMagicEden)
      return anyWindow.magicEden.bitcoin;
  }
};

export default function Connect() {
  const [wallet, setWallet] = useState<UiWallet | null>(null);
  const wallets = useWallets();
  const connectionStatus = useContext(ConnectionStatusContext);

  useEffect(() => {
    async function connectOrDeselect() {
      try {
        // const providers = getProviders();
        const btcProvider = getBtcProvider();
        // Inspect the btcProvider at runtime to determine the runtime type of the provider
        console.log("btcProvider", btcProvider);
        const payload = {
          purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        };
        const response = await btcProvider.connect(
          jsontokens.createUnsecuredToken(payload)
        );
        console.log("response", response);

        connectionStatus?.setAccounts(
          response.addresses.map((address: any) => ({
            address: address.address,
            publicKey: address.publicKey,
            purpose: address.purpose as Purpose,
          }))
        );
      } catch (err) {
        console.error(err);
        setWallet(null);
      }
    }
    console.log("wallets", wallets, connectionStatus?.isConnected);
    if (wallet && !connectionStatus?.isConnected) {
      connectOrDeselect();
    }
  }, [connectionStatus?.isConnected, connectionStatus, wallets, wallet]);

  if (connectionStatus?.isConnected) {
    return <Link href="/wallet">Back</Link>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[0f0f0f]">
      <h1 className="mb-4 text-lg font-medium uppercase tracking-wide">
        Connect Wallet
      </h1>
      <ul className="mb-8 flex flex-col">
        {wallets.filter(isSatsConnectCompatibleWallet).map((wallet, index) => (
          <li key={wallet.name}>
            <button
              className={classNames(
                "w-full rounded-md bg-[#e93a88] px-2 py-1 text-xs uppercase tracking-wide text-white",
                {
                  "mb-2": index !== wallets.length - 1,
                }
              )}
              type="button"
              onClick={() => setWallet(wallet)}
            >
              {wallet.name}
            </button>
          </li>
        ))}
      </ul>
      <Link className="text-sm underline" href="/wallet">
        Back
      </Link>
    </div>
  );
}
