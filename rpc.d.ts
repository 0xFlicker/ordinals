import { RESTClient, RESTIniOptions } from "./rest";
export declare type RPCIniOptions = RESTIniOptions & {
  user?: string;
  pass: string;
  wallet?: string;
  fullResponse?: boolean;
};
export declare type JSONRPC = {
  jsonrpc?: string | number;
  id?: string | number;
  method: string;
  params?: object;
};
export declare type Verbosity = {
  verbosity?: 0 | 1 | 2;
};
export declare type Verbose = {
  verbose?: boolean;
};
export declare type Height = {
  height: number;
};
export declare type Blockhash = {
  blockhash: string;
};
export declare type TxId = {
  txid: string;
};
export declare type GetBlockParams = Verbosity & Blockhash;
export declare type GetBlockFilterParams = Blockhash & {
  filtertype?: string;
};
export declare type GetBlockHeaderParams = Blockhash & Verbose;
export declare type GetBlockStatsParams = {
  hash_or_height: string | number;
  stats?: string[];
};
export declare type GetChainTxStatsParams = {
  nblocks?: number;
  blockhash?: string;
};
export declare type GetMemPoolParams = TxId & Verbose;
export declare type GetTxOutParams = TxId & {
  n: number;
  include_mempool?: boolean;
};
export declare type GetTxOutProofParams = {
  txids: string[];
  blockhash?: string;
};
export declare type Descriptor =
  | string
  | {
      desc: string;
      range: number | [number, number];
    };
export declare type ScanTxOutSetParams = {
  action: "start" | "abort" | "status";
  scanobjects: Descriptor[];
};
export declare type HelpParams = {
  command?: string;
};
export declare type LoggingParams = {
  include?: string[] | "all" | "none" | 0 | 1;
  exclude?: string[] | "all" | "none" | 0 | 1;
};
export declare type GenerateParams = {
  nblocks: number;
  maxtries?: number;
};
export declare type GenerateToAddressParams = GenerateParams & {
  address: string;
};
export declare type GetBlockTemplateParams = {
  template_request: {
    mode?: "template" | "proposal";
    capabilities?: string[];
    rules: string[];
  };
};
export declare type PrioritiseTransactionParams = TxId & {
  fee_delta: number;
};
export declare type HexData = {
  hexdata: string;
};
export declare type AddNodeParams = {
  node: string;
  command: "add" | "remove" | "onetry";
};
export declare type DisconnectNodeParams =
  | {
      address: string;
    }
  | {
      nodeid: number;
    };
export declare type SetBanParams = {
  subnet: string;
  command: "add" | "remove";
  bantime?: number;
  absolute?: boolean;
};
export declare type AddressType =
  | "legacy"
  | "p2sh-segwit"
  | "bech32"
  | "bech32m";
export declare type CreateMultiSigParams = {
  nrequired: number;
  keys: string[];
  address_type?: AddressType;
};
export declare type DeriveAddressesParams = {
  descriptor: string;
  range?: number | [number, number];
};
export declare type EstimateMode = {
  estimate_mode?: "UNSET" | "ECONOMICAL" | "CONSERVATIVE";
};
export declare type EstimateSmartFeeParams = EstimateMode & {
  conf_target: number;
};
export declare type SignMessageWithPrivKeyParams = {
  privkey: string;
  message: string;
};
export declare type VerifyMessageParams = {
  address: string;
  signature: string;
  message: string;
};
export declare type HexString = {
  hexstring: string;
};
export declare type ConvertToPsbtParams = HexString & {
  permitsigdata?: boolean;
  iswitness?: boolean;
};
export declare type BaseTransactionInput = {
  txid: string;
  vout: number;
};
export declare type TransactionInput = BaseTransactionInput & {
  sequence?: number;
};
export declare type TransactionOutput =
  | {
      [address: string]: string | number;
    }
  | {
      data: string;
    };
export declare type BaseCreateTransaction = {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  locktime?: number;
};
export declare type CreateTransactionParams = BaseCreateTransaction & {
  replaceable?: boolean;
};
export declare type DecodeRawTransactionParams = HexString & {
  iswitness?: boolean;
};
export declare type FinalizePsbtParams = {
  psbt: string;
  extract?: boolean;
};
export declare type BaseFundOptions = {
  options?: EstimateMode & {
    changeAddress?: string;
    changePosition?: number;
    change_type?: string;
    includeWatching?: boolean;
    lockUnspents?: boolean;
    feeRate?: number | string;
    subtractFeeFromOutputs?: number[];
    replaceable?: boolean;
    conf_target?: number;
  };
};
export declare type FundRawTransactionParams = HexString & {
  options?: BaseFundOptions;
  iswitness?: boolean;
};
export declare type GetRawTransactionParams = TxId &
  Verbose & {
    blockhash?: string;
  };
export declare type SendRawTransactionParams = HexString & {
  maxfeerate?: number | string;
};
export declare type PrevTx = {
  txid: string;
  vout: number;
  scriptPubKey: string;
  redeemScript?: string;
  witnessScript?: string;
  amount: number | string;
};
export declare type SigHashType =
  | "ALL"
  | "NONE"
  | "SINGLE"
  | "ALL|ANYONECANPAY"
  | "NONE|ANYONECANPAY"
  | "SINGLE|ANYONECANPAY";
export declare type SignRawTransactionWithWalletParams = HexString & {
  prevtxs?: PrevTx[];
  sighashtype?: SigHashType;
};
export declare type SignRawTransactionWithKeyParams = {
  privkeys: string[];
} & SignRawTransactionWithWalletParams;
export declare type TestmemPoolAcceptParams = {
  rawtxs: string[];
  maxfeerate?: string | number;
};
export declare type UtxoUpdatePsbtParams = {
  psbt: string;
  descriptors?: (
    | string
    | {
        desc: string;
        range?: number | [number, number];
      }
  )[];
};
export declare type Label = {
  label?: string;
};
export declare type AddMultiSigAddressParams = CreateMultiSigParams & Label;
export declare type BumpFeeParams = {
  txid: string;
  options?: EstimateMode & {
    replaceable?: boolean;
  } & (
      | {
          confTarget?: number;
        }
      | {
          totalFee?: number;
        }
    );
};
export declare type CreateWalletParams = {
  passphrase?: string;
  avoid_reuse?: boolean;
  wallet_name: string;
  disable_private_keys?: boolean;
  blank?: boolean;
};
export declare type GetBalanceParams = {
  avoid_reuse?: boolean;
  minconf?: number;
  include_watchonly?: boolean;
};
export declare type GetNewAddressParams = {
  address_type?: AddressType;
} & Label;
export declare type GetReceivedByAddressParams = {
  address: string;
  minconf?: number;
};
export declare type GetReceivedByLabelParams = {
  label: string;
  minconf?: number;
};
export declare type GetTransactionParams = TxId & {
  include_watchonly?: boolean;
  verbose?: boolean;
};
export declare type ImportAddressParams = {
  address: string;
  label?: string;
  rescan?: boolean;
  p2sh?: boolean;
};
export declare type ImportMultiRequest = {
  timestamp: number | "now";
  internal?: boolean;
  watchonly?: boolean;
  label?: string;
  keypool?: boolean;
} & (
  | {
      desc: string;
      range?: number | [number, number];
    }
  | {
      scriptPubKey:
        | {
            address: string;
          }
        | string;
      redeemscript?: string;
      witnessscript?: string;
      pubkeys?: string[];
      keys?: string[];
    }
);
export declare type ImportMultiParams = {
  requests: ImportMultiRequest[];
  options?: {
    rescan?: boolean;
  };
};
export declare type ImportPrivKeyParams = {
  privkey: string;
  label?: string;
  rescan?: boolean;
};
export declare type ImportPrunedFundsParams = {
  rawtransaction: string;
  txoutproof: string;
};
export declare type ImportPubKeyParams = {
  pubkey: string;
  label?: string;
  rescan?: boolean;
};
export declare type ListLabelsParams = {
  purpose: "receive" | "send";
};
export declare type ListReceivedByAddressParams = ListReceivedByLabelParams & {
  address_filter?: string;
};
export declare type ListReceivedByLabelParams = {
  minconf?: number;
  include_empty?: boolean;
  include_watchonly?: boolean;
};
export declare type ListSinceBlockParams = {
  blockhash?: string;
  target_confirmations?: number;
  include_watchonly?: boolean;
  include_removed?: boolean;
};
export declare type ListTransactionsParams = {
  label?: string;
  count?: number;
  skip?: number;
  include_watchonly?: boolean;
};
export declare type ListUnspentParams = {
  minconf?: number;
  maxconf?: number;
  addresses?: string[];
  include_unsafe?: boolean;
  query_options?: {
    minimumAmount?: number | string;
    maximumAmount?: number | string;
    maximumCount?: number;
    minimumSumAmount?: number | string;
  };
};
export declare type LockUnspentParams = {
  unlock: boolean;
  transactions?: BaseTransactionInput[];
};
export declare type RescanBlockchainParams = {
  start_height?: number;
  stop_height?: number;
};
export declare type BaseSendParams = EstimateMode & {
  comment?: string;
  replaceable?: boolean;
  conf_target?: number;
};
export declare type SendManyParams = BaseSendParams & {
  amounts: {
    [address: string]: number | string;
  };
  subtractfeefrom?: string[];
};
export declare type SendToAddressParams = BaseSendParams & {
  avoid_reuse?: boolean;
  address: string;
  amount: string | number;
  comment_to?: string;
  subtractfeefromamount?: boolean;
};
export declare type AddressRecord = Record<string, number> | { data: string };
export declare type SendParams = {
  outputs: AddressRecord | AddressRecord[];
  conf_target?: number;
  estimate_mode?: EstimateMode;
  fee_rate?: number;
  options?: {
    add_inputs?: boolean;
    include_unsafe?: boolean;
    minconf?: number;
    maxconf?: number;
    add_to_wallet?: boolean;
    change_address?: string;
    change_position?: number;
    change_type?: AddressType;
    fee_rate?: number;
    include_watching?: boolean;
    inputs?: BaseTransactionInput[];
    locktime?: number;
    lock_unspent?: boolean;
    psbt?: boolean;
    subtract_fee_from_outputs?: number[];
    conf_target?: number;
    estimate_mode?: EstimateMode;
    replaceable?: boolean;
    solving_data?: {
      pubkeys?: string[];
      scripts?: string[];
      descriptors?: string[];
    };
  };
};
export declare type SetHDSeedParams = {
  newkeypool?: boolean;
  seed?: string;
};
export declare type SetLabelParams = {
  address: string;
  label: string;
};
export declare type SetWalletFlagParams = {
  flag: string;
  value?: boolean;
};
export declare type SignMessageParams = {
  address: string;
  message: string;
};
export declare type WalletCreateFundedPsbtParams = BaseCreateTransaction &
  BaseFundOptions & {
    bip32derivs?: boolean;
  };
export declare type WalletPassphraseParams = {
  passphrase: string;
  timeout: number;
};
export declare type WalletPassphraseChangeParams = {
  oldpassphrase: string;
  newpassphrase: string;
};
export declare type WalletProcessPsbtParams = {
  psbt: string;
  sign?: boolean;
  sighashtype?: SigHashType;
  bip32derivs?: boolean;
};
export declare class RPCClient extends RESTClient {
  wallet?: string;
  fullResponse?: boolean;
  constructor({ user, pass, wallet, fullResponse, ...options }: RPCIniOptions);
  batch(body: JSONRPC | JSONRPC[], uri?: string): Promise<any>;
  rpc(method: string, params?: {}, wallet?: string): Promise<any>;
  getbestblockhash(): Promise<any>;
  getblock({ blockhash, verbosity }: GetBlockParams): Promise<any>;
  getblockchaininfo(): Promise<any>;
  getblockcount(): Promise<any>;
  getblockfilter(options: GetBlockFilterParams): Promise<any>;
  getblockhash({ height }: Height): Promise<any>;
  getblockheader({ blockhash, verbose }: GetBlockHeaderParams): Promise<any>;
  getblockstats({ hash_or_height, stats }: GetBlockStatsParams): Promise<any>;
  getchaintips(): Promise<any>;
  getchaintxstats({ nblocks, blockhash }: GetChainTxStatsParams): Promise<any>;
  getdifficulty(): Promise<any>;
  getmempoolancestors({ txid, verbose }: GetMemPoolParams): Promise<any>;
  getmempooldescendants({ txid, verbose }: GetMemPoolParams): Promise<any>;
  getmempoolentry({ txid }: TxId): Promise<any>;
  getmempoolinfo(): Promise<any>;
  getrawmempool({ verbose }?: Verbose): Promise<any>;
  gettxout({ txid, n, include_mempool }: GetTxOutParams): Promise<any>;
  gettxoutproof({ txids, blockhash }: GetTxOutProofParams): Promise<any>;
  gettxoutsetinfo(): Promise<any>;
  preciousblock({ blockhash }: Blockhash): Promise<any>;
  pruneblockchain({ height }: Height): Promise<any>;
  savemempool(): Promise<any>;
  scantxoutset({ action, scanobjects }: ScanTxOutSetParams): Promise<any>;
  verifychain({
    checklevel,
    nblocks,
  }?: {
    checklevel?: number | undefined;
    nblocks?: number | undefined;
  }): Promise<any>;
  verifytxoutproof({ proof }: { proof: string }): Promise<any>;
  getmemoryinfo({ mode }?: { mode?: string | undefined }): Promise<any>;
  getrpcinfo(): Promise<any>;
  help({ command }?: HelpParams): Promise<any>;
  logging({ include, exclude }?: LoggingParams): Promise<any>;
  stop(): Promise<any>;
  uptime(): Promise<any>;
  generatetoaddress(
    options: GenerateToAddressParams,
    wallet?: string
  ): Promise<any>;
  getblocktemplate(options: GetBlockTemplateParams): Promise<any>;
  getmininginfo(): Promise<any>;
  getnetworkhashps(options?: {}): Promise<any>;
  prioritisetransaction(options: PrioritiseTransactionParams): Promise<any>;
  submitblock(options: HexData): Promise<any>;
  submitheader(options: HexData): Promise<any>;
  addnode(options: AddNodeParams): Promise<any>;
  clearbanned(): Promise<any>;
  disconnectnode(params: DisconnectNodeParams): Promise<any>;
  getaddednodeinfo(options?: { node?: string }): Promise<any>;
  getconnectioncount(): Promise<any>;
  getnettotals(): Promise<any>;
  getnetworkinfo(): Promise<any>;
  getnodeaddresses(options?: {}): Promise<any>;
  getpeerinfo(): Promise<any>;
  listbanned(): Promise<any>;
  ping(): Promise<any>;
  setban(options: SetBanParams): Promise<any>;
  setnetworkactive(options: { state: boolean }): Promise<any>;
  analyzepsbt(options: { psbt: string }): Promise<any>;
  combinepsbt(options: { txs: string[] }): Promise<any>;
  combinerawtransaction(options: { txs: string[] }): Promise<any>;
  converttopsbt(options: ConvertToPsbtParams): Promise<any>;
  createpsbt(options: CreateTransactionParams): Promise<any>;
  createrawtransaction(options: CreateTransactionParams): Promise<any>;
  decodepsbt(options: { psbt: string }): Promise<any>;
  decoderawtransaction(options: DecodeRawTransactionParams): Promise<any>;
  decodescript(options: HexString): Promise<any>;
  finalizepsbt(options: FinalizePsbtParams): Promise<any>;
  fundrawtransaction(
    options: FundRawTransactionParams,
    wallet?: string
  ): Promise<any>;
  getrawtransaction(options: GetRawTransactionParams): Promise<any>;
  joinpsbts(options: { txs: string[] }): Promise<any>;
  sendrawtransaction(options: SendRawTransactionParams): Promise<any>;
  signrawtransactionwithkey(
    options: SignRawTransactionWithKeyParams
  ): Promise<any>;
  testmempoolaccept(options: TestmemPoolAcceptParams): Promise<any>;
  utxoupdatepsbt(options: UtxoUpdatePsbtParams): Promise<any>;
  createmultisig(options: CreateMultiSigParams): Promise<any>;
  deriveaddresses({ descriptor, range }: DeriveAddressesParams): Promise<any>;
  estimatesmartfee(options: EstimateSmartFeeParams): Promise<any>;
  getdescriptorinfo(options: { descriptor: string }): Promise<any>;
  signmessagewithprivkey(options: SignMessageWithPrivKeyParams): Promise<any>;
  validateaddress(options: { address: string }): Promise<any>;
  verifymessage(options: VerifyMessageParams): Promise<any>;
  abandontransaction(options: TxId, wallet?: string): Promise<any>;
  abortrescan(wallet?: string): Promise<any>;
  addmultisigaddress(
    options: AddMultiSigAddressParams,
    wallet?: string
  ): Promise<any>;
  backupwallet(
    options: {
      destination: string;
    },
    wallet?: string
  ): Promise<any>;
  bumpfee(options: BumpFeeParams, wallet?: string): Promise<any>;
  createwallet(options: CreateWalletParams): Promise<any>;
  dumpprivkey(
    options: {
      address: string;
    },
    wallet?: string
  ): Promise<any>;
  dumpwallet(
    options: {
      filename: string;
    },
    wallet?: string
  ): Promise<any>;
  encryptwallet(
    options: {
      passphrase: string;
    },
    wallet?: string
  ): Promise<any>;
  getaddressesbylabel(
    options: {
      label: string;
    },
    wallet?: string
  ): Promise<any>;
  getaddressinfo(
    options: {
      address: string;
    },
    wallet?: string
  ): Promise<any>;
  getbalance(options: GetBalanceParams, wallet?: string): Promise<any>;
  getbalances(wallet?: string): Promise<any>;
  getnewaddress(options: GetNewAddressParams, wallet?: string): Promise<any>;
  getrawchangeaddress(
    options: {
      address_type?: AddressType;
    },
    wallet?: string
  ): Promise<any>;
  getreceivedbyaddress(
    options: GetReceivedByAddressParams,
    wallet?: string
  ): Promise<any>;
  getreceivedbylabel(
    options: GetReceivedByLabelParams,
    wallet?: string
  ): Promise<any>;
  gettransaction(options: GetTransactionParams, wallet?: string): Promise<any>;
  getunconfirmedbalance(wallet?: string): Promise<any>;
  getwalletinfo(wallet?: string): Promise<any>;
  importaddress(options: ImportAddressParams, wallet?: string): Promise<any>;
  importmulti(options: ImportMultiParams, wallet?: string): Promise<any>;
  importprivkey(options: ImportPrivKeyParams, wallet?: string): Promise<any>;
  importprunedfunds(
    options: ImportPrunedFundsParams,
    wallet?: string
  ): Promise<any>;
  importpubkey(options: ImportPubKeyParams, wallet?: string): Promise<any>;
  importwallet(
    options: {
      filename: string;
    },
    wallet?: string
  ): Promise<any>;
  keypoolrefill(
    options: {
      newsize?: number;
    },
    wallet?: string
  ): Promise<any>;
  listaddressgroupings(wallet?: string): Promise<any>;
  listlabels(options: ListLabelsParams, wallet?: string): Promise<any>;
  listlockunspent(wallet?: string): Promise<any>;
  listreceivedbyaddress(
    options: ListReceivedByAddressParams,
    wallet?: string
  ): Promise<any>;
  listreceivedbylabel(
    options: ListReceivedByLabelParams,
    wallet?: string
  ): Promise<any>;
  listsinceblock(options: ListSinceBlockParams, wallet?: string): Promise<any>;
  listtransactions(
    options: ListTransactionsParams,
    wallet?: string
  ): Promise<any>;
  listunspent(options: ListUnspentParams, wallet?: string): Promise<any>;
  listwalletdir(): Promise<any>;
  listwallets(): Promise<any>;
  loadwallet({ filename }: { filename: string }): Promise<any>;
  lockunspent(options: LockUnspentParams, wallet?: string): Promise<any>;
  removeprunedfunds(options: TxId, wallet?: string): Promise<any>;
  rescanblockchain(
    options: RescanBlockchainParams,
    wallet?: string
  ): Promise<any>;
  sendmany(options: SendManyParams, wallet?: string): Promise<any>;
  send(options: SendParams, wallet?: string): Promise<any>;
  sendtoaddress(options: SendToAddressParams, wallet?: string): Promise<any>;
  sethdseed(options: SetHDSeedParams, wallet?: string): Promise<any>;
  setlabel(options: SetLabelParams, wallet?: string): Promise<any>;
  settxfee(
    options: {
      amount: number | string;
    },
    wallet?: string
  ): Promise<any>;
  setwalletflag(options: SetWalletFlagParams, wallet?: string): Promise<any>;
  signmessage(options: SignMessageParams, wallet?: string): Promise<any>;
  signrawtransactionwithwallet(
    options: SignRawTransactionWithWalletParams,
    wallet?: string
  ): Promise<any>;
  unloadwallet({ wallet_name }?: { wallet_name?: string }): Promise<any>;
  walletcreatefundedpsbt(
    options: WalletCreateFundedPsbtParams,
    wallet?: string
  ): Promise<any>;
  walletlock(wallet?: string): Promise<any>;
  walletpassphrase(
    options: WalletPassphraseParams,
    wallet?: string
  ): Promise<any>;
  walletpassphrasechange(
    options: WalletPassphraseChangeParams,
    wallet?: string
  ): Promise<any>;
  walletprocesspsbt(
    options: WalletProcessPsbtParams,
    wallet?: string
  ): Promise<any>;
  getzmqnotifications(): Promise<any>;
}
