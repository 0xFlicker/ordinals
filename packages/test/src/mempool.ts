import { MempoolClient, NoVoutFound } from "@0xflick/ordinals-backend";

export const checkTxo = async ({
  address,
  mempoolBitcoinClient,
  findValue,
}: {
  address: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  findValue?: number;
}) => {
  const { txid, vout, amount, scriptPubKey } = await fetchFunding({
    address,
    mempoolBitcoinClient,
    findValue,
  });
  return {
    address,
    txid,
    vout,
    amount,
    scriptPubKey,
  };
};

export async function fetchFunding({
  address,
  mempoolBitcoinClient,
  findValue,
}: {
  address: string;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  findValue?: number;
}) {
  const txs = await mempoolBitcoinClient.addresses.getAddressTxs({ address });
  for (const tx of txs) {
    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];
      if (output.scriptpubkey_address === address) {
        if (
          (findValue !== undefined && output.value === findValue) ||
          findValue === undefined
        ) {
          return {
            txid: tx.txid,
            vout: i,
            amount: output.value,
            scriptPubKey: output.scriptpubkey,
          };
        }
      }
    }
  }
  throw new NoVoutFound({ address });
}
