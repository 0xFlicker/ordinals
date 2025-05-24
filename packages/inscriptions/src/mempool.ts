import { getData, postData } from './network.js';
import { BitcoinNetworkNames, WritableInscription } from './types.js';

export function urlForNetworkName(network: BitcoinNetworkNames) {
  switch (network) {
    case 'mainnet':
      return 'https://mempool.space';
    case 'testnet':
      return 'https://mempool.space/testnet';
    case 'regtest':
      return 'http://localhost:4080';
    case 'testnet4':
      return 'https://mempool.space/testnet4';
  }
}

export async function broadcastTx(rawTx: string, network: BitcoinNetworkNames) {
  const url = urlForNetworkName(network);
  // try {
  const txId = await postData(url + '/api/tx', rawTx);
  return txId;
}

export async function addressReceivedMoneyInThisTx(
  address: string,
  network: BitcoinNetworkNames
) {
  const url = urlForNetworkName(network);
  const responseText = await getData(`${url}/api/address/${address}/txs`);
  const parsed = JSON.parse(responseText) as Array<Record<string, unknown>>;
  for (const tx of parsed) {
    const vouts = tx['vout'] as Array<Record<string, unknown>>;
    for (let i = 0; i < vouts.length; i++) {
      const output = vouts[i];
      if (output['scriptpubkey_address'] === address) {
        const txid = tx['txid'] as string;
        const vout = i;
        const amt = output['value'] as number;
        return [txid, vout, amt] as const;
      }
    }
  }
  return [null, null, null] as const;
}

export async function waitForInscriptionFunding(
  inscription: WritableInscription,
  network: BitcoinNetworkNames
) {
  let funded: readonly [string, number, number] | readonly [null, null, null] =
    [null, null, null];
  do {
    funded = await addressReceivedMoneyInThisTx(
      inscription.destinationAddress,
      network
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (funded[0] == null);
  const [txid, vout, amount] = funded;
  return [txid, vout, amount] as const;
}
