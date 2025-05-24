export interface InscriptionContent {
  isBin?: boolean;
  content: Buffer;
  mimeType: string;
  metadata?: Record<string, unknown>;
  compress?: boolean;
}

export interface InscriptionId {
  id: string;
  fundingAddress: string;
  inscriptionIndex: number;
}

export interface InscriptionFile {
  id?: InscriptionId;
  content: Buffer;
  mimetype: string;
  metadata?: Record<string, unknown>;
  compress?: boolean;
}

export interface DestinationInscriptionFile {
  id?: InscriptionId;
  content: Buffer;
  mimetype: string;
  metadata?: Record<string, unknown>;
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
  | 'mainnet'
  | 'testnet'
  | 'regtest'
  | 'testnet4';
