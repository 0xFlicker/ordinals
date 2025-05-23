export interface InscriptionContent {
  isBin?: boolean;
  content: ArrayBuffer | SharedArrayBuffer;
  mimeType: string;
  metadata?: Record<string, any>;
  compress?: boolean;
}

export interface InscriptionId {
  id: string;
  fundingAddress: string;
  inscriptionIndex: number;
}

export interface InscriptionFile {
  id?: InscriptionId;
  content: ArrayBuffer | SharedArrayBuffer;
  mimetype: string;
  metadata?: Record<string, any>;
  compress?: boolean;
}

export interface DestinationInscriptionFile {
  id?: InscriptionId;
  content: ArrayBuffer | SharedArrayBuffer;
  mimetype: string;
  metadata?: Record<string, any>;
  compress?: boolean;
  destinationAddress: string;
}

export interface WritableInscription {
  destinationAddress: string;
  pointerIndex: number;
  file: InscriptionFile;
}

export type BitcoinScriptData = { base64: string } | string;
export type BitcoinNetworkNames =
  | "mainnet"
  | "testnet"
  | "regtest"
  | "testnet4";
