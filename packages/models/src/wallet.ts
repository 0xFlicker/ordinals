export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

export type TWalletProblemUnableToFetchTxStatus = {
  code: "unable-to-fetch-tx-status";
  message: string;
  txid: string;
};

export type TWalletProblemCodes = TWalletProblemUnableToFetchTxStatus["code"];

export type TWalletProblem = TWalletProblemUnableToFetchTxStatus & {
  error?: Error;
};

export interface ICustodialOrdinalWallet {
  address: string;
  privateKey: string;
  userId: string;
  unspentTransactions?: UTXO[];
  pendingTransactions?: UTXO[];
  problems?: TWalletProblem[];
}
