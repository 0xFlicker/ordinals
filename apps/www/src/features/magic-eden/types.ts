import { AddressPurpose, BitcoinNetwork } from "sats-connect";

// Single address returned by getAddress()
export interface AddressResponse {
  address: string;
  publicKey: string;
  purpose: AddressPurpose;
}

// Payload for signMessage
export interface SignMessagePayload {
  address: string;
  message: string;
  protocol?: "BIP322" | "ECDSA";
}

// Input descriptor for PSBT signing
export interface InputToSign {
  address: string;
  signingIndexes: number[];
  sigHash?: number;
}

// Payload for signTransaction
export interface SignTransactionPayload {
  network: BitcoinNetwork["type"];
  message: string;
  psbtBase64: string;
  broadcast: boolean;
  inputsToSign: InputToSign[];
}

// Response from signTransaction (and elements of signMultipleTransactions)
export interface SignTransactionResponse {
  psbtBase64: string;
  txId?: string;
}

// Recipient for sendBtcTransaction
export interface Recipient {
  address: string;
  amountSats: string;
}

// Payload for sendBtcTransaction
export interface SendBtcTransactionPayload {
  recipients: Recipient[];
  senderAddress: string;
}

// Payload for signMultipleTransactions
export interface SignMultipleTransactionsPayload {
  network: BitcoinNetwork["type"];
  message: string;
  psbts: { psbtBase64: string; inputsToSign: InputToSign[] }[];
}

// The provider interface
export interface ProviderAPI {
  /** Connect / get BTC addresses */
  connect(request: string): Promise<{ addresses: AddressResponse[] }>;

  /** Sign an arbitrary message */
  signMessage(request: string): Promise<string>;

  /** Sign a single PSBT */
  signTransaction(request: string): Promise<SignTransactionResponse>;

  /** Send one or more BTC outputs */
  sendBtcTransaction(request: string): Promise<string>;

  /** Sign multiple PSBTs in one batch */
  signMultipleTransactions(request: string): Promise<SignTransactionResponse[]>;

  isConnected: boolean;
  isHardware: boolean;
}

export const getBtcProvider = (): ProviderAPI | undefined => {
  if (typeof window !== "undefined" && "magicEden" in window) {
    const anyWindow: any = window;
    if (anyWindow.magicEden.bitcoin && anyWindow.magicEden.bitcoin.isMagicEden)
      return anyWindow.magicEden.bitcoin;
  }
};
