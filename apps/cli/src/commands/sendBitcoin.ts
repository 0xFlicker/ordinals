import { sendBitcoin } from "../bitcoin.js";
import { BitcoinNetworkNames } from "@0xflick/inscriptions";

export async function sendBitcoinToAddress({
  address,
  amount,
  network,
  rpcuser,
  rpcpassword,
  rpcwallet,
  feeRate,
  bitcoinDataDir,
  generate,
}: {
  address: string;
  amount: number;
  network: BitcoinNetworkNames;
  rpcuser: string;
  rpcpassword: string;
  rpcwallet: string;
  feeRate: number;
  bitcoinDataDir?: string;
  generate?: boolean;
}) {
  try {
    // Create outputs array with the destination address and amount
    const outputs: [string, string][] = [[address, amount.toString()]];

    // Send the Bitcoin transaction
    const result = await sendBitcoin({
      network,
      rpcuser,
      rpcpassword,
      rpcwallet,
      outputs,
      fee_rate: feeRate,
      bitcoinDataDir,
      generate,
    });

    console.log(`Transaction sent successfully!`);
    console.log(`Transaction ID: ${result.txid}`);
    console.log(`Complete: ${result.complete}`);

    return result;
  } catch (error) {
    console.error("Error sending Bitcoin:", error);
    throw error;
  }
}
