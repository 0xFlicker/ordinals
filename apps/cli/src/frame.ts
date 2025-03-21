// iss also a modified copy of eth-provider source. was trying to get it to work with wagmi at the time
import ethProvider from "eth-provider";
import {
  type Address,
  type EIP1193Provider,
  type ProviderConnectInfo,
  ProviderRpcError,
  ResourceUnavailableRpcError,
  RpcError,
  SwitchChainError,
  UserRejectedRequestError,
  getAddress,
  numberToHex,
} from "viem";

import {
  ChainNotConfiguredError,
  ProviderNotFoundError,
  normalizeChainId,
  createConnector,
} from "@wagmi/core";
import { Evaluate } from "@wagmi/core/internal";

export type FrameParameters = {
  /**
   * [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider to target
   */
  target?: Target["provider"];
};

frame.type = "frame" as const;
export function frame(parameters: FrameParameters = {}) {
  function getTarget(): Evaluate<Target & { id: string }> {
    const target = parameters.target ?? ethProvider("frame");

    return {
      id: "frame",
      name: "Frame",
      provider: target as unknown as EIP1193Provider,
    };
  }
  type Provider = EIP1193Provider;
  type Properties = {
    onConnect(connectInfo: ProviderConnectInfo): void;
  };
  type StorageItem = {
    [_ in "injected.connected" | `${string}.disconnected`]: true;
  };

  return createConnector<Provider, Properties, StorageItem>((config) => ({
    get icon() {
      return getTarget().icon;
    },
    get id() {
      return getTarget().id;
    },
    get name() {
      return getTarget().name;
    },
    type: frame.type,
    async setup() {
      const provider = await this.getProvider();
      // Only start listening for events if `target` is set, otherwise `injected()` will also receive events
      if (provider && parameters.target)
        provider.on("connect", this.onConnect.bind(this));
    },
    async connect({ chainId, isReconnecting } = {}) {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();

      let accounts: readonly Address[] | null = null;
      if (!isReconnecting) {
        accounts = await this.getAccounts().catch(() => null);
        const isAuthorized = !!accounts?.length;
        if (isAuthorized)
          // Attempt to show another prompt for selecting account if already connected
          try {
            const permissions = await provider.request({
              method: "wallet_requestPermissions",
              params: [{ eth_accounts: {} }],
            });
            accounts = permissions[0]?.caveats?.[0]?.value?.map(getAddress);
          } catch (err) {
            const error = err as RpcError;
            // Not all injected providers support `wallet_requestPermissions` (e.g. MetaMask iOS).
            // Only bubble up error if user rejects request
            if (error.code === UserRejectedRequestError.code)
              throw new UserRejectedRequestError(error);
            // Or prompt is already open
            if (error.code === ResourceUnavailableRpcError.code) throw error;
          }
      }

      try {
        if (!accounts?.length) {
          const requestedAccounts = await provider.request<{
            readonly Parameters: undefined;
            readonly ReturnType: Address[];
          }>({
            method: "eth_requestAccounts",
          });
          accounts = requestedAccounts.map(getAddress);
        }

        provider.removeListener("connect", this.onConnect.bind(this));
        provider.on("accountsChanged", this.onAccountsChanged.bind(this));
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect.bind(this));

        // Switch to chain if provided
        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId }).catch(() => ({
            id: currentChainId,
          }));
          currentChainId = chain?.id ?? currentChainId;
        }

        return { accounts, chainId: currentChainId };
      } catch (err) {
        const error = err as RpcError;
        if (error.code === UserRejectedRequestError.code)
          throw new UserRejectedRequestError(error);
        if (error.code === ResourceUnavailableRpcError.code)
          throw new ResourceUnavailableRpcError(error);
        throw error;
      }
    },
    async disconnect() {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();

      provider.removeListener(
        "accountsChanged",
        this.onAccountsChanged.bind(this),
      );
      provider.removeListener("chainChanged", this.onChainChanged);
      provider.removeListener("disconnect", this.onDisconnect.bind(this));
      provider.on("connect", this.onConnect.bind(this));
    },
    async getAccounts() {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();
      const accounts = await provider.request<{
        readonly Parameters: undefined;
        readonly ReturnType: Address[];
      }>({
        method: "eth_accounts",
      });
      return accounts.map(getAddress);
    },
    async getChainId() {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();
      const hexChainId = await provider.request<{
        readonly Parameters: undefined;
        readonly ReturnType: unknown;
      }>({ method: "eth_chainId" });
      return normalizeChainId(hexChainId);
    },
    async getProvider() {
      const target = getTarget();
      return target.provider;
    },
    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },
    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();

      const chain = config.chains.find((x) => x.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      try {
        await Promise.all([
          provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(chainId) }],
          }),
          new Promise<void>((resolve) =>
            config.emitter.once("change", ({ chainId: currentChainId }) => {
              if (currentChainId === chainId) resolve();
            }),
          ),
        ]);
        return chain;
      } catch (err) {
        const error = err as RpcError;

        // Indicates chain is not added to provider
        if (
          error.code === 4902 ||
          // Unwrapping for MetaMask Mobile
          // https://github.com/MetaMask/metamask-mobile/issues/2944#issuecomment-976988719
          (error as ProviderRpcError<{ originalError?: { code: number } }>)
            ?.data?.originalError?.code === 4902
        ) {
          try {
            const { default: blockExplorer, ...blockExplorers } =
              chain.blockExplorers ?? {};
            let blockExplorerUrls: string[] = [];
            if (blockExplorer)
              blockExplorerUrls = [
                blockExplorer.url,
                ...Object.values(blockExplorers).map((x) => x.url),
              ];

            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: numberToHex(chainId),
                  chainName: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: [chain.rpcUrls.default?.http[0] ?? ""],
                  blockExplorerUrls,
                },
              ],
            });

            const currentChainId = await this.getChainId();
            if (currentChainId !== chainId)
              throw new UserRejectedRequestError(
                new Error("User rejected switch after adding network."),
              );

            return chain;
          } catch (error) {
            throw new UserRejectedRequestError(error as Error);
          }
        }

        if (error.code === UserRejectedRequestError.code)
          throw new UserRejectedRequestError(error);
        throw new SwitchChainError(error);
      }
    },
    async onAccountsChanged(accounts) {
      // Disconnect if there are no accounts
      if (accounts.length === 0) this.onDisconnect();
      // Connect if emitter is listening for connect event (e.g. is disconnected and connects through wallet interface)
      else if (config.emitter.listenerCount("connect")) {
        const chainId = (await this.getChainId()).toString();
        this.onConnect({ chainId });
      }
      // Regular change event
      else
        config.emitter.emit("change", { accounts: accounts.map(getAddress) });
    },
    onChainChanged(chain) {
      const chainId = normalizeChainId(chain);
      config.emitter.emit("change", { chainId });
    },
    async onConnect(connectInfo) {
      const accounts = await this.getAccounts();
      if (accounts.length === 0) return;

      const chainId = normalizeChainId(connectInfo.chainId);
      config.emitter.emit("connect", { accounts, chainId });

      const provider = await this.getProvider();
      if (provider) {
        provider.removeListener("connect", this.onConnect.bind(this));
        provider.on("accountsChanged", this.onAccountsChanged.bind(this));
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect.bind(this));
      }
    },
    async onDisconnect(error) {
      const provider = await this.getProvider();

      // If MetaMask emits a `code: 1013` error, wait for reconnection before disconnecting
      // https://github.com/MetaMask/providers/pull/120
      if (error && (error as RpcError<1013>).code === 1013) {
        if (provider && !!(await this.getAccounts()).length) return;
      }

      // No need to remove `${this.id}.disconnected` from storage because `onDisconnect` is typically
      // only called when the wallet is disconnected through the wallet's interface, meaning the wallet
      // actually disconnected and we don't need to simulate it.
      config.emitter.emit("disconnect");

      if (provider) {
        provider.removeListener(
          "accountsChanged",
          this.onAccountsChanged.bind(this),
        );
        provider.removeListener("chainChanged", this.onChainChanged);
        provider.removeListener("disconnect", this.onDisconnect.bind(this));
        provider.on("connect", this.onConnect.bind(this));
      }
    },
  }));
}

type Target = {
  icon?: string | undefined;
  id: string;
  name: string;
  provider: EIP1193Provider;
};
