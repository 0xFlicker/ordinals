"use client";

import type { Dispatch, FC, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useReducer,
} from "react";
import { reducer, initialState, WalletStandardState, actions } from "./ducks";

import React from "react";
import { EIP1193Provider } from "viem";
import { CloseReason, WalletPicker } from "./components/WalletPicker";
import { CustomModal } from "../../components/Modal";
import { useBitflickWalletImpl } from "./hooks/useBitflickWalletImpl";

const WalletStandardContext = createContext<ReturnType<
  typeof useBitflickWalletImpl
> | null>(null);

const WalletStandardModalProvider: FC<{ children: NonNullable<ReactNode> }> = ({
  children,
}) => {
  const {
    intent,
    flags,
    setNeedsBitcoinSelection,
    setNeedsEvmSelection,
    setIntent,
  } = useBitflickWallet();
  const isModalOpen = flags.needsBitcoinSelection || flags.needsEvmSelection;

  const handleCloseModal = (reason: CloseReason) => {
    // Always close the modal by resetting the selection flags
    setNeedsBitcoinSelection(false);
    setNeedsEvmSelection(false);

    // Handle different close reasons based on intent
    if (reason === CloseReason.LOGIN) {
      // Login completed successfully, clear the intent
      setIntent(undefined);
    } else if (reason === CloseReason.CLOSE) {
      // User manually closed the modal, clear the intent
      setIntent(undefined);
    }
  };

  return (
    <>
      {children}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => {
          setNeedsBitcoinSelection(false);
          setNeedsEvmSelection(false);
          setIntent(undefined);
        }}
      >
        <WalletPicker onClose={handleCloseModal} intent={intent} />
      </CustomModal>
    </>
  );
};

const WalletStandardInnerProvider: FC<{ children: NonNullable<ReactNode> }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const connectors = useDynamicInjectedConnectors();
  const bitflick = useBitflickWalletImpl({ state, dispatch, connectors });

  return (
    <WalletStandardContext.Provider value={bitflick}>
      <WalletStandardModalProvider>{children}</WalletStandardModalProvider>
    </WalletStandardContext.Provider>
  );
};

export const WalletStandardProvider: FC<{
  children: NonNullable<ReactNode>;
}> = ({ children }) => {
  return <WalletStandardInnerProvider>{children}</WalletStandardInnerProvider>;
};

export const useBitflickWallet = () => {
  const response = useContext(WalletStandardContext);
  if (!response) {
    throw new Error(
      "useWalletStandard must be used within a WalletStandardProvider"
    );
  }
  return response;
};

// eip-6963
/**
 * Represents the assets needed to display a wallet
 */
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

export function useDynamicInjectedConnectors() {
  const [connectors, setConnectors] = useState<
    {
      id: string;
      name: string;
      icon: string;
      provider: any;
    }[]
  >([]);

  useEffect(() => {
    const init = (event: EIP6963AnnounceProviderEvent) => {
      setConnectors((connectors) => [
        ...connectors,
        {
          id: event.detail.info.uuid,
          name: event.detail.info.name,
          icon: event.detail.info.icon,
          provider: event.detail.provider,
        },
      ]);
    };
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Some wallets fire this when they're ready
    window.addEventListener("eip6963:announceProvider", init as any);
    return () => {
      window.removeEventListener("eip6963:announceProvider", init as any);
    };
  }, []);

  return connectors;
}
