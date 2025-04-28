"use client";
import { BitcoinWalletStandardProvider } from "@exodus/bitcoin-wallet-standard-react";
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
import { WalletPicker } from "./components/WalletPicker";
import { CustomModal } from "../../components/Modal";

const WalletStandardContext = createContext<{
  state: WalletStandardState;
  dispatch: Dispatch<any>;
  connectors: {
    id: string;
    name: string;
    icon: string;
    provider: any;
  }[];
}>({
  state: initialState,
  dispatch: () => {},
  connectors: [],
});

const WalletStandardInnerProvider: FC<{ children: NonNullable<ReactNode> }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const connectors = useDynamicInjectedConnectors();
  const isModalOpen = state.needsBitcoinSelection || state.needsEvmSelection;

  const handleCloseModal = () => {
    dispatch(actions.setNeedsBitcoinSelection(false));
    dispatch(actions.setNeedsEvmSelection(false));
  };

  return (
    <WalletStandardContext.Provider value={{ state, dispatch, connectors }}>
      {children}
      <CustomModal isOpen={isModalOpen} onClose={handleCloseModal}>
        <WalletPicker
          pickBtc={state.needsBitcoinSelection}
          pickEvm={state.needsEvmSelection}
        />
      </CustomModal>
    </WalletStandardContext.Provider>
  );
};

export const WalletStandardProvider: FC<{
  children: NonNullable<ReactNode>;
}> = ({ children }) => {
  return <WalletStandardInnerProvider>{children}</WalletStandardInnerProvider>;
};

export const useWalletStandard = () => {
  const { state, dispatch, connectors } = useContext(WalletStandardContext);
  return { state, dispatch, connectors };
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
