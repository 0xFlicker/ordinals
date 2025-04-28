import { Psbt, networks } from "bitcoinjs-lib";

export function condenseAddress(address: string): string {
  return `${address.slice(0, 10)}..${address.slice(-10)}`;
}

interface SegwitProps {
  utxo: UTXO;
  recipientAddress: string;
  changeAddress: string;
  amountToSend: number;
  scriptPubKey?: string;
  senderPubKey?: string;
}

/**
 * A basic implementation of creating a PSBT for a segwit transaction. This consists of
 * sending btc from one address to another, returning the leftover balance from the UTXO to the sender.
 * For a real-world application, you would want to implement more checks and error handling.
 *
 * @param {SegwitProps} props The properties needed to create a PSBT.
 * @returns {Promise<string>} A promise that resolves with the base64 representation of the PSBT.
 */
export const createPSBT = async ({
  utxo,
  recipientAddress,
  changeAddress,
  amountToSend,
  scriptPubKey,
}: SegwitProps) => {
  const psbt = new Psbt({ network: networks.bitcoin });

  // change to return to sender minus the amount to send and the transaction fee (500 sats for this example)
  const changeValue = utxo.value! - amountToSend - 500;

  psbt.addInput({
    hash: utxo?.txid!,
    index: utxo?.vout!,
    witnessUtxo: {
      script: Buffer.from(scriptPubKey!, "hex"),
      value: utxo.value!,
    },
  });

  psbt.addOutput({
    address: recipientAddress,
    value: amountToSend,
  });

  // change from the UTXO needs to be returned to the sender
  psbt.addOutput({
    address: changeAddress,
    value: changeValue,
  });

  return psbt.toBase64();
};

/**
 * Fetches the scriptPubKey for a given UTXO transactionId from the mempool.space API.
 * This is necessary for creating a PSBT for a segwit transaction.
 *
 * @param {string} txId The transaction ID of the UTXO.
 * @param {number} vout The vout index of the UTXO.
 * @returns {Promise<string>} A promise that resolves with the hex representation of the scriptPubKey.
 * @throws {Error} If the request to the mempool.space API fails, or if the scriptPubKey is not found for the given vout.
 */
export const fetchScriptPubKey = async (
  txId: string,
  vout: number
): Promise<string> => {
  const response = await fetch(`https://mempool.space/api/tx/${txId}`);
  if (!response.ok) {
    throw new Error(
      "Error fetching transaction details from mempool.space API."
    );
  }
  const transaction = await response.json();
  if (
    transaction.vout &&
    transaction.vout.length > vout &&
    transaction.vout[vout].scriptpubkey
  ) {
    return transaction.vout[vout].scriptpubkey;
  } else {
    throw new Error("scriptPubKey not found for the given vout.");
  }
};

export interface UTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
}

/**
 * Fetches UTXOs from the mempool.space API for a specified address.
 *
 * @param {string} address The Bitcoin address to fetch UTXOs for.
 * @returns {Promise<UTXO[]>} A promise that resolves with an array of UTXOs for the given address.
 * @throws {Error} If the request to the mempool.space API fails. Most likely due to not found (no balance) or invalid address.
 */
export const fetchUTXO = async (address: string): Promise<UTXO[]> => {
  const response = await fetch(
    `https://mempool.space/api/address/${address}/utxo`
  );
  if (!response.ok) {
    throw new Error("Error fetching UTXO from mempool.space API.");
  }
  return response.json();
};

/**
 * Selects a UTXO from an array of UTXOs that meets or exceeds the specified amount.
 * For a real-world application, you would want to implement a more sophisticated UTXO selection algorithm.
 *
 * @param {number} amount The amount in BTC to send. We will select a UTXO that meets or exceeds this amount.
 * @param {UTXO[]} utxos An array of UTXOs to select from.
 * @returns {Promise<UTXO | undefined>} A promise that resolves with the selected UTXO, or undefined if no UTXO meets or exceeds the amount.
 */
export const selectUTXO = async (
  amount: number,
  utxos: UTXO[]
): Promise<UTXO | undefined> => {
  for (let i = 0; i < utxos.length; i++) {
    let utxo = utxos[i];
    if (utxo?.value! * 100000000 >= amount * 100000000) {
      return utxo; // Return the first UTXO that meets or exceeds the amount
    }
  }
  return undefined;
};
