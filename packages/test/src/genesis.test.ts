import {
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  BitcoinNetworkNames,
  generatePrivKey,
  networkNamesToTapScriptName,
  bitcoinToSats,
  generateRefundTransaction,
  groupFundings,
  retryWithBackOff,
} from '@bitflick/inscriptions';
import { get_seckey, get_pubkey } from '@cmdcode/crypto-tools/keys';
import { Address, Tap, Tx, Signer } from '@cmdcode/tapscript';
import {
  sendBitcoin,
  generateBlock,
  createWallet,
  getNewAddress,
  sendRawTransaction,
} from './bitcoin';
import mempool from '@mempool/mempool.js';
import { checkTxo } from './mempool';
const mempoolUrl = new URL(
  process.env.REGTEST_MEMPOOL_URL ?? 'http://localhost:5080'
);
const protocol = mempoolUrl.protocol.slice(0, -1);
const mempoolBitcoinClient = mempool({
  hostname: mempoolUrl.host,
  protocol: protocol as 'http' | 'https',
  network: 'regtest',
}).bitcoin;
async function waitForFunding(address: string, value: bigint) {
  // Use retryWithBackOff to handle 5xx errors with exponential backoff
  return retryWithBackOff(
    async () => {
      try {
        return await checkTxo({
          address,
          mempoolBitcoinClient,
          findValue: Number(value),
        });
      } catch (e) {
        // Check if the error is a 5xx status code error
        if (e instanceof Error) {
          const statusCode = parseInt(e.message);
          if (!isNaN(statusCode) && statusCode >= 500 && statusCode < 600) {
            throw e; // Rethrow to trigger retry
          }
        }

        // For other errors, just wait and try again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await checkTxo({
          address,
          mempoolBitcoinClient,
          findValue: Number(value),
        });
      }
    },
    5, // maxRetries
    1000 // initial backoff in ms
  );
}

const generateInscriptionAddress = (
  network: BitcoinNetworkNames = 'regtest'
) => {
  const privKey = generatePrivKey();
  const secKey = get_seckey(privKey);
  const pubKey = get_pubkey(secKey, true);
  const [tseckey] = Tap.getSecKey(secKey);
  const [tpubkey, cblock] = Tap.getPubKey(pubKey);
  const inscriptionAddress = Address.p2tr.encode(
    tpubkey,
    networkNamesToTapScriptName(network)
  );
  return {
    privKey,
    secKey,
    pubKey,
    tseckey,
    tpubkey,
    cblock,
    inscriptionAddress,
  };
};

describe('genesis', () => {
  let generationAddress: string;
  beforeAll(async () => {
    await createWallet({
      walletName: 'test',
    });
    generationAddress = await getNewAddress({
      rpcwallet: 'test',
    });
    await generateBlock({
      rpcwallet: 'test',
      address: generationAddress,
      amount: 101,
    });
  });

  // Generate a random tip destination address
  const TIP_DESTINATION = generateInscriptionAddress();
  const TIP_AMOUNT = 5000;

  const NETWORK = 'regtest';
  const RPC_WALLET = 'test';

  it('Can spend a simple pay to public taproot output', async () => {
    const { pubKey, secKey, inscriptionAddress } =
      generateInscriptionAddress('regtest');

    const [tweakedSecKey] = Tap.getSecKey(secKey);
    const [tweakedPubKey] = Tap.getPubKey(pubKey);
    const address = Address.p2tr.fromPubKey(
      tweakedPubKey,
      networkNamesToTapScriptName(NETWORK)
    );

    console.log(`Address: ${address}`);

    await sendBitcoin({
      address,
      amount: '0.0001',
      rpcwallet: RPC_WALLET,
    });

    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: generationAddress,
    });

    const { txid, vout, amount } = await waitForFunding(
      address,
      bitcoinToSats('0.0001')
    );

    const txData = Tx.create({
      vin: [
        {
          txid,
          vout,
          prevout: {
            value: Number(amount),
            scriptPubKey: ['OP_1', tweakedPubKey],
          },
        },
      ],
      vout: [
        {
          value: Number(amount) - 1000,
          scriptPubKey: Address.toScriptPubKey(inscriptionAddress),
        },
      ],
    });

    const sig = Signer.taproot.sign(tweakedSecKey, txData, 0) as {
      hex: string;
    };

    txData.vin[0].witness = [sig.hex];

    const txHex = (Tx.encode(txData) as { hex: string }).hex;

    const spendTxId = await sendRawTransaction({
      txhex: txHex,
    });

    console.log(`TxID: ${spendTxId}`);
  });

  it('Can spend a simple pay to tapscript output with a cblock', async () => {
    const { pubKey, secKey, inscriptionAddress } =
      generateInscriptionAddress('regtest');

    const script = [pubKey, 'OP_CHECKSIG'];

    const tapLeaf = Tap.encodeScript(script);
    const [tweakedPubKey, cblock] = Tap.getPubKey(pubKey, { target: tapLeaf });
    const address = Address.p2tr.fromPubKey(
      tweakedPubKey,
      networkNamesToTapScriptName(NETWORK)
    );

    await sendBitcoin({
      address,
      amount: '0.0001',
      rpcwallet: RPC_WALLET,
    });

    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: generationAddress,
    });

    const { txid, vout, amount } = await waitForFunding(
      address,
      bitcoinToSats('0.0001')
    );

    const txData = Tx.create({
      vin: [
        {
          txid,
          vout,
          prevout: {
            value: Number(amount),
            scriptPubKey: ['OP_1', tweakedPubKey],
          },
        },
      ],
      vout: [
        {
          value: Number(amount) - 500,
          scriptPubKey: Address.toScriptPubKey(inscriptionAddress),
        },
      ],
    });

    const sig = Signer.taproot.sign(secKey, txData, 0, {
      extension: tapLeaf,
    }) as { hex: string };

    txData.vin[0].witness = [sig.hex, script, cblock];

    const txHex = (Tx.encode(txData) as { hex: string }).hex;

    const spendTxId = await sendRawTransaction({
      txhex: txHex,
    });

    console.log(`TxID: ${spendTxId}`);
  });

  it('Can refund', async () => {
    const { inscriptionAddress } = generateInscriptionAddress('regtest');

    const testContent = Buffer.from('Hello, world!', 'utf-8');
    const inscriptions = [
      {
        content: testContent,
        mimeType: 'text/plain',
        metadata: { name: 'Test Inscription' },
        compress: false,
      },
    ];

    const privKey = generatePrivKey();

    // Step 4: Generate the genesis transaction
    const genesisResponse = await generateFundableGenesisTransaction({
      address: inscriptionAddress,
      inscriptions,
      padding: 546,
      tip: TIP_AMOUNT,
      network: NETWORK,
      privKey,
      feeRate: 1,
    });

    // pay the genesis transaction
    const fundingResult = await sendBitcoin({
      address: genesisResponse.fundingAddress,
      amount: genesisResponse.amount,
      rpcwallet: RPC_WALLET,
    });

    console.log(`Funding transaction ID: ${fundingResult.txid}`);

    // generate a new block
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress,
    });

    // wait for the funding transaction to be confirmed
    const { txid, vout, amount } = await waitForFunding(
      genesisResponse.fundingAddress,
      bitcoinToSats(genesisResponse.amount)
    );

    // Generate the refund transaction
    const refundTx = await generateRefundTransaction({
      address: TIP_DESTINATION.inscriptionAddress,
      amount,
      feeRate: 1,
      refundCBlock: genesisResponse.refundCBlock,
      treeTapKey: genesisResponse.rootTapKey,
      secKey: genesisResponse.secKey,
      txid,
      vout,
    });

    // broadcast the refund transaction
    const refundTxHex = (Tx.encode(refundTx) as { hex: string }).hex;
    const refundResult = await sendRawTransaction({
      txhex: refundTxHex,
    });
    console.log(`Refund transaction ID: ${refundResult}`);

    // generate a new block
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: generationAddress,
    });
  });

  it('can inscribe in-memory', async () => {
    // Step 2: Use shared keys for the inscription
    const { inscriptionAddress } = generateInscriptionAddress();
    const privKey = generatePrivKey();

    // Step 3: Create a test inscription content
    const testContent = Buffer.from('Hello, world!', 'utf-8');
    const inscriptions = [
      {
        content: testContent,
        mimeType: 'text/plain',
        metadata: { name: 'Test Inscription' },
        compress: false,
      },
    ];

    // Step 4: Generate the genesis transaction
    const genesisResponse = await generateFundableGenesisTransaction({
      address: inscriptionAddress,
      inscriptions,
      padding: 546,
      tip: TIP_AMOUNT,
      network: NETWORK,
      privKey,
      feeRate: 1,
    });

    // Step 5: Fund the transaction
    const fundingResult = await sendBitcoin({
      address: genesisResponse.fundingAddress,
      amount: genesisResponse.amount,
      rpcwallet: RPC_WALLET,
      fee_rate: 1,
    });

    console.log(`Funding transaction ID: ${fundingResult.txid}`);

    // Generate a new block to confirm the transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress, // Use the tip destination address to receive the block reward
    });

    // Wait for the funding transaction to be confirmed
    const { txid, vout, amount } = await waitForFunding(
      genesisResponse.fundingAddress,
      bitcoinToSats(genesisResponse.amount)
    );

    // Step 6. Generate the reveal transaction
    const revealTx = generateRevealTransaction({
      inputs: [
        {
          leaf: genesisResponse.genesisLeaf,
          tapkey: genesisResponse.genesisTapKey,
          cblock: genesisResponse.genesisCBlock,
          rootTapKey: genesisResponse.rootTapKey,
          script: genesisResponse.genesisScript,
          vout,
          txid,
          amount,
          secKey: genesisResponse.secKey,
          padding: genesisResponse.padding,
          inscriptions: [
            {
              destinationAddress: inscriptionAddress,
            },
          ],
        },
      ],
      feeDestinations: [
        {
          address: TIP_DESTINATION.inscriptionAddress,
          weight: 100,
        },
      ],
      feeTarget: TIP_AMOUNT,
      feeRateRange: [10, 1],
    });

    // Step 7: Broadcast the reveal transaction
    const revealTxId = await sendRawTransaction({
      txhex: revealTx.hex,
    });
    console.log(`Reveal transaction ID: ${revealTxId}`);

    // Generate another block to confirm the reveal transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress,
    });
  }, 60000);

  it('should perform a complete inscription flow end-to-end using dynamoDB and S3', async () => {
    // Use shared keys for the inscription
    const { inscriptionAddress } = generateInscriptionAddress();

    const privKey = generatePrivKey();

    // Create a test inscription content
    const testContent = Buffer.from('Hello, world!', 'utf-8');
    const inscriptions = [
      {
        content: testContent,
        mimeType: 'text/plain',
        metadata: { name: 'Test Inscription' },
        compress: false,
      },
    ];

    // Step 4: Generate the genesis transaction
    const genesisResponse = await generateFundableGenesisTransaction({
      address: inscriptionAddress,
      inscriptions,
      padding: 546,
      tip: TIP_AMOUNT,
      network: NETWORK,
      privKey,
      feeRate: 1,
    });

    // Step 8: Actually fund the transaction using bitcoin-cli
    await sendBitcoin({
      address: genesisResponse.fundingAddress,
      amount: genesisResponse.amount,
      rpcwallet: RPC_WALLET,
      fee_rate: 1,
    });

    // Generate a new block to confirm the transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress, // Use the tip destination address to receive the block reward
    });

    // Wait for the funding transaction to be confirmed
    const { txid, vout, amount } = await waitForFunding(
      genesisResponse.fundingAddress,
      bitcoinToSats(genesisResponse.amount)
    );

    // Generate the reveal transaction
    const revealTx = generateRevealTransaction({
      inputs: [
        {
          leaf: genesisResponse.genesisLeaf,
          tapkey: genesisResponse.genesisTapKey,
          cblock: genesisResponse.genesisCBlock,
          rootTapKey: genesisResponse.rootTapKey,
          script: genesisResponse.genesisScript,
          vout,
          txid,
          amount,
          secKey: genesisResponse.secKey,
          padding: genesisResponse.padding,
          inscriptions: [
            {
              destinationAddress: inscriptionAddress,
            },
          ],
        },
      ],
      feeRateRange: [10, 1],
      feeDestinations: [
        {
          address: TIP_DESTINATION.inscriptionAddress,
          weight: 100,
        },
      ],
      feeTarget: TIP_AMOUNT,
    });

    // Step 11: Broadcast the reveal transaction
    const revealTxId = await sendRawTransaction({
      txhex: revealTx.hex,
    });

    expect(revealTxId).toBeDefined();

    // Generate another block to confirm the reveal transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress,
    });
  }, 60000);

  it('Group transactions', async () => {
    const { inscriptionAddress } = generateInscriptionAddress();
    const privKey = generatePrivKey();
    const testContent = Buffer.from('Hello, world!', 'utf-8');
    const inscriptions = [
      {
        content: testContent,
        mimeType: 'text/plain',
        metadata: { name: 'Test Inscription' },
        compress: false,
      },
    ];

    const genesisResponse = await generateFundableGenesisTransaction({
      address: inscriptionAddress,
      inscriptions,
      padding: 546,
      tip: TIP_AMOUNT,
      network: NETWORK,
      privKey,
      feeRate: 1,
    });

    // Step 8: Actually fund the transaction using bitcoin-cli
    const fundingResult = await sendBitcoin({
      address: genesisResponse.fundingAddress,
      amount: genesisResponse.amount,
      rpcwallet: RPC_WALLET,
      fee_rate: 1,
    });

    expect(fundingResult.txid).toBeDefined();

    // Generate a new block to confirm the transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress, // Use the tip destination address to receive the block reward
    });

    // Wait for the funding transaction to be confirmed
    const { txid, vout, amount } = await waitForFunding(
      genesisResponse.fundingAddress,
      bitcoinToSats(genesisResponse.amount)
    );

    expect(amount).toBe(bitcoinToSats(genesisResponse.amount));

    const tipDestination = TIP_DESTINATION.inscriptionAddress;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const groupingResult = groupFundings(
      [
        {
          id: 'test-funding',
          fundedAt: thirtyMinutesAgo,
          sizeEstimate: genesisResponse.totalFee + genesisResponse.overhead,
          input: {
            amount: bitcoinToSats(genesisResponse.amount),
            leaf: genesisResponse.genesisLeaf,
            tapkey: genesisResponse.genesisTapKey,
            cblock: genesisResponse.genesisCBlock,
            padding: genesisResponse.padding,
            script: genesisResponse.genesisScript,
            secKey: genesisResponse.secKey,
            rootTapKey: genesisResponse.rootTapKey,
            inscriptions: genesisResponse.inscriptionsToWrite,
            txid,
            vout,
          },
          feeDestinations: [
            {
              address: tipDestination,
              weight: 100,
            },
          ],
          feeTarget: TIP_AMOUNT,
        },
      ],
      [20, 1]
    );

    expect(groupingResult.rejectedFundings).toHaveLength(0);
    expect(Object.values(groupingResult.feeDestinationGroups)).toHaveLength(1);
  }, 60000);
});
