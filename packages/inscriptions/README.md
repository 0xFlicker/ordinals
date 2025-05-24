# @bitflick/inscriptions

[![npm version](https://img.shields.io/npm/v/@bitflick/inscriptions.svg)](https://www.npmjs.com/package/@bitflick/inscriptions)
[![License](https://img.shields.io/npm/l/@bitflick/inscriptions.svg)](https://github.com/flick-ing/bitflick/blob/main/LICENSE)
[![Tests](https://github.com/flick-ing/inscriptions/actions/workflows/ci.yml/badge.svg)](https://github.com/flick-ing/bitflick/inscriptions/workflows/ci.yml)

A Node.js TypeScript library for creating and funding Bitcoin inscriptions.

## Installation

```bash
npm install @bitflick/inscriptions
```

## Quick Start

```ts
import {
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  generateRefundTransaction,
  generatePrivKey,
  broadcastTx,
  waitForInscriptionFunding,
} from '@bitflick/inscriptions';

(async () => {
  // 1. Generate a fundable genesis transaction
  const funding = await generateFundableGenesisTransaction({
    address: 'yourTaprootBitcoinAddress',
    inscriptions: [
      { content: Buffer.from('Hello, world!', 'utf8'), mimeType: 'text/plain' },
    ],
    network: 'regtest',
    privKey: generatePrivKey(), // Secret key for taproot transactions
    feeRate: 1, // Target this fee rate for the reveal transaction
    tip: 10000, // Include a 10_000 sat "tip" that will be included at reveal, effectively adds padding
    padding: 546, // inscription output size. can be lower if submitting with your own node, or leave like this to submit to public mempool dot space
  });

  // 2.  Out of band, pay the address ${funding.fundingAddress} exactly ${funding.fundingAmountBtc}
  console.log(
    `Please pay exactly ${funding.fundingAmountBtc} to ${funding.fundingAddress}`
  );

  // 3. Wait for the funding UTXO
  const [utxoTxid, utxoVout] = await waitForInscriptionFunding(
    funding.inscriptionUtxo,
    funding.network
  );

  // 4. Reveal the inscription. Can include multiple paid inputs from genesis transactions
  const revealTx = await generateRevealTransaction({
    inputs: [
      // This is one payment for a batch of inscriptions
      {
        amount: Number(bitcoinToSats(funding.fundingAmountBtc)),
        cblock: funding.initCBlock,
        leaf: funding.initLeaf,
        script: funding.initScript,
        padding: funding.padding,
        secKey,
        tapkey: funding.initTapKey,
        txid: utxoTxid,
        vout: utxoVout,
        inscriptions: mockFunding.writableInscriptions,
        rootTapKey: mockFunding.initTapKey,
      },
    ],
    // Look for a fit between this fee range, or throw an exception
    feeRateRange: [1, 5],
    // Optional tip destination(s)
    feeDestinations: [
      {
        address: 'feeDestinationAddress',
        weight: 100,
      },
    ],
    // Aim for this value in tip calculation
    // Efficiences in batching will go to feeDestinations whereas spikes in fees will come from this pot
    feeTarget: 10000,
  });

  // This transaction will be funded from the genesis transaction, which includes
  // enough payment for the reveal script
  const revealTxId = await broadcastTx(revealTx, funding.network);
  console.log(`Reveal TX ID: ${revealTxId}`);

  // 5. (Optional) Generate a refund transaction if needed
  // Can be used to refund a paid genesis transaction without creating an inscription.
  // This works because the inscription is generated with two script paths, the inscription reveal
  // and a simple p2tr (pay to taproot) script. This method will sign the transaction for the p2tr script,
  // which thanks to the magic of taproot avoids the need to pay for the reveal in order to spend
  // Example use cases would be payment recover in cases of under or double payment
  const refundTx = await generateRefundTransaction({
    feeRate: funding.feeRate,
    address: 'yourBitcoinAddress',
    amount: funding.amount,
    refundCBlock: funding.refundCBlock,
    treeTapKey: funding.rootTapKey,
    txid: utxoTxid,
    vout: utxoVout,
    secKey: funding.secKey,
  });
  console.log(`Refund TX: ${refundTx}`);
  // This transaction will be funded from the genesis transaction, minus miner fees
  const revealTxId = await broadcastTx(revealTx, funding.network);
  console.log(`Reveal TX ID: ${revealTxId}`);
})();
```

### Generating a Taproot (Tapscript) Address

Below is a helper to generate a Taproot address using `generatePrivKey` for a random private key.
You can use this address as a destination for your inscription funding:

```ts
import {
  generatePrivKey,
  networkNamesToTapScriptName,
} from '@bitflick/inscriptions';
import { get_seckey, get_pubkey } from '@cmdcode/crypto-tools/keys';
import { Address, Tap } from '@cmdcode/tapscript';

function generateTapscriptAddress(
  network: 'mainnet' | 'testnet' | 'testnet4' | 'regtest',
  privateKey?: string
): string {
  if (!privateKey) {
    privateKey = generatePrivKey();
  }
  const secKey = get_seckey(privateKey);
  const pubKey = get_pubkey(secKey, true);
  return Address.p2tr.encode(
    Tap.getPubKey(pubKey)[0],
    networkNamesToTapScriptName(network)
  );
}

// Generate a random Taproot (Tapscript) address on regtest:
const destination = generateTapscriptAddress('regtest');
console.log('Taproot address:', destination);
```

## API

| Function                             | Description                                                   |
| ------------------------------------ | ------------------------------------------------------------- |
| `generateFundableGenesisTransaction` | Build a genesis TX and funding UTXO prepared for inscription. |
| `generateRevealTransaction`          | Build the reveal TX for an existing inscription UTXO.         |
| `generateRefundTransaction`          | Build a refund TX from unspent inscription outputs.           |
| `broadcastTx`                        | Broadcast a raw transaction hex to the network.               |
| `waitForInscriptionFunding`          | Poll until the specified inscription UTXO is spendable.       |

For full API details, see [types.ts](./src/types.ts) and the source.

## Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/flick-ing/bitflick.git
cd bitflick
yarn
```

Run tests:

```bash
yarn workspace @bitflick/inscriptions test
```

Build:

```bash
yarn workspace @bitflick/inscriptions build
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## License

MIT © flick-ing / bitflick
