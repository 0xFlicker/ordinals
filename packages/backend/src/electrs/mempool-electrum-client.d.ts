declare module "@mempool/electrum-client" {
  import { EventEmitter } from "events";

  interface Callbacks {
    onConnect?: (client: ElectrumClient, versionInfo: any) => void;
    onClose?: (client: ElectrumClient) => void;
    onError?: (err: Error) => void;
    onLog?: (str: string) => void;
  }

  interface ElectrumConfig {
    client: string;
    version: string;
  }

  interface PersistencePolicy {
    retryPeriod?: number;
    maxRetry?: number;
    pingPeriod?: number;
    callback?: () => void;
  }

  class Client {
    constructor(
      port: number,
      host: string,
      protocol: string,
      options: any,
      callbacks: Callbacks,
    );

    id: number;
    port: number;
    host: string;
    callback_message_queue: { [id: number]: Function };
    subscribe: EventEmitter;
    mp: any;
    _protocol: string;
    _options: any;
    onErrorCallback: ((e: Error) => void) | null;
    conn: any;
    status: number;

    initSocket(protocol: string, options: any): void;
    connect(): Promise<void>;
    connectSocket(conn: any, port: number, host: string): Promise<void>;
    close(): void;
    request(method: string, params: any[]): Promise<any>;
    requestBatch(
      method: string,
      params: any[],
      secondParam?: any,
    ): Promise<any>;
    response(msg: any): void;
    onMessage(body: any, n: number): void;
    onConnect(): void;
    onClose(e: Error): void;
    onRecv(chunk: any): void;
    onError(e: Error): void;
  }

  class ElectrumClient extends Client {
    constructor(
      port: number,
      host: string,
      protocol: string,
      options: any,
      callbacks: Callbacks,
    );

    onConnectCallback:
      | ((client: ElectrumClient, versionInfo: any) => void)
      | null;
    onCloseCallback: ((client: ElectrumClient) => void) | null;
    onLogCallback: (str: string) => void;
    timeLastCall: number;
    versionInfo: any;
    persistencePolicy: PersistencePolicy;
    electrumConfig: ElectrumConfig;
    timeout: NodeJS.Timeout | null;

    initElectrum(
      electrumConfig: ElectrumConfig,
      persistencePolicy?: PersistencePolicy,
    ): Promise<ElectrumClient>;

    request(method: string, params: any[]): Promise<any>;
    requestBatch(
      method: string,
      params: any[],
      secondParam?: any,
    ): Promise<any>;
    onClose(): void;
    keepAlive(): void;
    close(): void;
    reconnect(): Promise<ElectrumClient>;
    log(str: string): void;

    // ElectrumX API
    server_version(client_name: string, protocol_version: string): Promise<any>;
    server_banner(): Promise<any>;
    server_features(): Promise<any>;
    server_ping(): Promise<any>;
    server_addPeer(features: any): Promise<any>;
    serverDonation_address(): Promise<any>;
    serverPeers_subscribe(): Promise<any>;
    blockchainAddress_getProof(address: string): Promise<any>;
    blockchainScripthash_getBalance(scripthash: string): Promise<{
      confirmed: number;
      unconfirmed: number;
    }>;
    blockchainScripthash_getBalanceBatch(scripthash: string): Promise<any>;
    blockchainScripthash_listunspentBatch(scripthash: string): Promise<any>;
    blockchainScripthash_getHistory(scripthash: string): Promise<
      {
        height: number;
        tx_hash: string;
        fee?: number;
      }[]
    >;
    blockchainScripthash_getHistoryBatch(scripthash: string): Promise<any>;
    blockchainScripthash_getMempool(scripthash: string): Promise<any>;
    blockchainScripthash_listunspent(scripthash: string): Promise<any>;
    blockchainScripthash_subscribe(scripthash: string): Promise<any>;
    blockchainBlock_getHeader(height: number): Promise<any>;
    blockchainBlock_headers(start_height: number, count: number): Promise<any>;
    blockchainEstimatefee(number: number): Promise<any>;
    blockchainHeaders_subscribe(raw?: boolean): Promise<any>;
    blockchain_relayfee(): Promise<any>;
    blockchainTransaction_broadcast(rawtx: string): Promise<any>;
    blockchainTransaction_get(
      tx_hash: string,
      verbose?: boolean,
    ): Promise<string>;
    blockchainTransaction_getBatch(
      tx_hash: string[],
      verbose?: boolean,
    ): Promise<string[]>;
    blockchainTransaction_getMerkle(
      tx_hash: string,
      height: number,
    ): Promise<any>;
    mempool_getFeeHistogram(): Promise<any>;

    // Protocol 1.1 deprecated methods
    blockchainUtxo_getAddress(tx_hash: string, index: number): Promise<any>;
    blockchainNumblocks_subscribe(): Promise<any>;

    // Protocol 1.2 deprecated methods
    blockchainBlock_getChunk(index: number): Promise<any>;
    blockchainAddress_getBalance(address: string): Promise<any>;
    blockchainAddress_getHistory(address: string): Promise<any>;
    blockchainAddress_getMempool(address: string): Promise<any>;
    blockchainAddress_listunspent(address: string): Promise<any>;
    blockchainAddress_subscribe(address: string): Promise<any>;
  }

  export default ElectrumClient;
}
