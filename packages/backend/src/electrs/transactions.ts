// unfortunately, apps/graphql-backend is unaable to load the latent
// @ts-nocheck
import ElectrumClient from "@mempool/electrum-client";
import { createLogger } from "../utils/logger.js";
import { Tx, Address, Script, ScriptData } from "@cmdcode/tapscript";

const logger = createLogger({ name: "electrum-transactions" });

// Types for Electrum client
export interface ElectrumClientConfig {
  tls: boolean;
  hostname: string;
  port: number;
}

export interface ElectrumClientInstance {
  client: ElectrumClient;
  isConnected: boolean;
}

// Types for transaction data
export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: Vin[];
  vout: Vout[];
  status: Status;
  hex?: string;
}

export interface Vin {
  txid: string;
  vout: number;
  is_coinbase: boolean;
  scriptsig: string;
  scriptsig_asm?: string;
  sequence: number;
  witness: string[];
  prevout: Vout | null;
}

export interface Vout {
  scriptpubkey: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface Status {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface ScriptHashHistory {
  height: number;
  tx_hash: string;
  fee?: number;
}

function sha256sh(script: ScriptData) {
  const bytes = Script.fmt.toBytes(script, false);
  return bytes.toHash("sha256");
}

/**
 * Gets transactions for an address since an optional last seen transaction ID
 */
export async function electrumGetAddressTransactions({
  client,
  scriptHash,
  lastSeenTxId,
}: {
  client: ElectrumClientInstance;
  scriptHash: string;
  lastSeenTxId?: string;
}): Promise<Transaction[]> {
  try {
    // Get the transaction history for the script hash
    const history = await client.client.blockchainScripthash_getHistory(
      scriptHash,
    );

    // Sort by height (newest first)
    history.sort((a, b) => (b.height || 9999999) - (a.height || 9999999));

    // Find the starting index based on the last seen transaction ID
    let startingIndex = 0;
    if (lastSeenTxId) {
      const pos = history.findIndex(
        (historicalTx) => historicalTx.tx_hash === lastSeenTxId,
      );
      if (pos !== -1) {
        startingIndex = pos + 1;
      }
    }

    // Limit to 10 transactions
    const endIndex = Math.min(startingIndex + 10, history.length);

    // Get the transaction details
    const transactions: Transaction[] = [];
    for (let i = startingIndex; i < endIndex; i++) {
      try {
        const txHex = await client.client.blockchainTransaction_get(
          history[i].tx_hash,
          false,
        );
        const tx = parseTransaction(
          history[i].tx_hash,
          txHex,
          history[i].height,
        );
        transactions.push(tx);
      } catch (error) {
        logger.error(
          error,
          `Error getting transaction ${history[i].tx_hash} for address ${scriptHash}`,
        );
      }
    }

    return transactions;
  } catch (error) {
    logger.error(error, `Error getting transactions for address ${scriptHash}`);
    throw error;
  }
}

/**
 * Helper function to safely convert a value to a hex string
 */
function toHexString(value: any): string {
  if (typeof value === "string") {
    return value;
  } else if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("hex");
  } else if (Array.isArray(value)) {
    return Buffer.from(value).toString("hex");
  } else {
    return "";
  }
}

/**
 * Parses a raw transaction hex into a Transaction object
 */
export function parseTransaction(
  txid: string,
  txHex: string,
  height?: number,
): Transaction {
  // Decode the transaction using @cmdcode/tapscript
  const tx = Tx.decode(Buffer.from(txHex, "hex"));

  // Calculate the transaction size and weight
  const size = txHex.length / 2;

  // Calculate the weight (base size * 4 + total size of all witnesses)
  let weight = size * 4;
  for (const input of tx.vin) {
    if (input.witness && input.witness.length > 0) {
      for (const witnessItem of input.witness) {
        weight += toHexString(witnessItem).length / 2;
      }
    }
  }

  // Calculate the fee (sum of inputs - sum of outputs)
  let fee = 0;
  for (const input of tx.vin) {
    if (input.prevout && typeof input.prevout.value === "number") {
      fee += input.prevout.value;
    }
  }
  for (const output of tx.vout) {
    if (typeof output.value === "number") {
      fee -= output.value;
    }
  }

  // Convert inputs to our Vin format
  const vin: Vin[] = tx.vin.map((input) => ({
    txid: input.txid,
    vout: input.vout,
    is_coinbase:
      input.txid ===
      "0000000000000000000000000000000000000000000000000000000000000000",
    scriptsig: toHexString(input.scriptSig),
    sequence:
      typeof input.sequence === "number"
        ? input.sequence
        : parseInt(String(input.sequence), 16),
    witness: input.witness.map((w) => toHexString(w)),
    prevout: input.prevout
      ? {
          scriptpubkey: toHexString(input.prevout.scriptPubKey),
          value:
            typeof input.prevout.value === "number"
              ? input.prevout.value
              : Number(input.prevout.value),
        }
      : null,
  }));

  // Convert outputs to our Vout format
  const vout: Vout[] = tx.vout.map((output) => ({
    scriptpubkey: toHexString(output.scriptPubKey),
    value:
      typeof output.value === "number" ? output.value : Number(output.value),
  }));

  return {
    txid,
    version: tx.version,
    locktime:
      typeof tx.locktime === "number"
        ? tx.locktime
        : parseInt(String(tx.locktime), 16),
    size,
    weight,
    fee,
    vin,
    vout,
    status: {
      confirmed: height !== undefined,
      block_height: height,
    },
    hex: txHex,
  };
}
