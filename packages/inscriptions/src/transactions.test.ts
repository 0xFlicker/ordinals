import { get_pubkey, get_seckey } from '@cmdcode/crypto-tools/keys';
import { Address, Tap, Tx, Signer } from '@cmdcode/tapscript';
import { generateFundableGenesisTransaction } from './genesis.js';
import { bitcoinToSats, networkNamesToTapScriptName } from './utils.js';
import { generateRefundTransaction } from './refund.js';
import {
  buildSkeleton,
  generateRevealTransactionDataIteratively,
  signAllVin,
} from './reveal.js';
import {
  RevealTransactionRequest,
  generateRevealTransaction,
} from './reveal.js';
import { BitcoinScriptData } from './types.js';

describe('Bitcoin Inscription Transactions', () => {
  const TEST_PRIVATE_KEY =
    '0000000000000000000000000000000000000000000000000000000000000001';

  const TEST_PRIVATE_KEY_2 =
    '0000000000000000000000000000000000000000000000000000000000000002';
  const SEC_KEY = get_seckey(TEST_PRIVATE_KEY);
  const SEC_KEY_2 = get_seckey(TEST_PRIVATE_KEY_2);
  const PUB_KEY = get_pubkey(SEC_KEY);
  const PUB_KEY_2 = get_pubkey(SEC_KEY_2);
  const [TAP_KEY] = Tap.getPubKey(PUB_KEY);
  const [TAP_KEY_2] = Tap.getPubKey(PUB_KEY_2);

  const TEST_NETWORK = 'mainnet';
  const TEST_ADDRESS = Address.p2tr.encode(
    TAP_KEY,
    networkNamesToTapScriptName(TEST_NETWORK)
  );
  const TEST_ADDRESS_2 = Address.p2tr.encode(
    TAP_KEY_2,
    networkNamesToTapScriptName(TEST_NETWORK)
  );
  const TEST_FEE_RATE = 5;

  // Sample inscription content
  const sampleInscription = {
    content: new TextEncoder().encode('Hello, World!').buffer,
    mimeType: 'text/plain',
    compress: false,
  };

  describe('Genesis Transaction', () => {
    it('should generate a valid genesis transaction', async () => {
      // First generate funding address to get necessary parameters
      const funding = await generateFundableGenesisTransaction({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
      });

      expect(typeof funding.fundingAddress).toBe('string');
    });
  });

  describe('Refund Transaction', () => {
    it('should generate a valid refund transaction', async () => {
      const funding = await generateFundableGenesisTransaction({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
      });

      const refundTx = await generateRefundTransaction({
        feeRate: TEST_FEE_RATE,
        address: TEST_ADDRESS,
        amount: bitcoinToSats(funding.amount),
        refundCBlock: funding.refundCBlock,
        treeTapKey: funding.rootTapKey,
        txid: 'a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968',
        vout: 0,
        secKey: funding.secKey,
      });

      expect(refundTx).toBeDefined();
      expect(typeof refundTx).toBe('object');
    });
  });

  describe('Parent inscription', () => {
    it('should generate a valid parent inscription', async () => {
      const funding = await generateFundableGenesisTransaction({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
        parentInscriptions: [
          {
            index: 0,
            txid: 'a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968',
          },
        ],
      });

      const vsize = Tx.util.getTxSize(funding.partialHex).vsize;
      const totalGenesisTxFee = Math.ceil(vsize * TEST_FEE_RATE);
      const totalAvailableForReveal =
        Number(bitcoinToSats(funding.amount)) - totalGenesisTxFee;

      const {
        txData: _revealTx,
        feeRate: _foundFeeRate,
        platformFee: _platformFee,
        underpriced: _revealUnderpriced,
        minerFee: _minerFee,
      } = generateRevealTransactionDataIteratively({
        inputs: [
          {
            leaf: funding.genesisLeaf,
            tapkey: funding.genesisTapKey,
            cblock: funding.genesisCBlock,
            script: funding.genesisScript,
            vout: 0,
            txid: 'a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968',
            amount: totalAvailableForReveal,
            secKey: funding.secKey,
            padding: funding.padding,
            inscriptions: funding.inscriptionsToWrite,
            rootTapKey: funding.rootTapKey,
          },
        ],
        parentTxs: [
          {
            destinationAddress: TEST_ADDRESS_2,
            secKey: SEC_KEY_2,
            value: 546,
            vin: {
              txid: '611f0360dd2bb28927625dbc13eab58cd968a99d1112bcb35845fd44e703ef2c',
              vout: 0,
            },
          },
        ],
        feeRateRange: [1, TEST_FEE_RATE] as [number, number],
        feeDestinations: [
          {
            address: TEST_ADDRESS,
            weight: 100,
          },
        ],
        feeTarget: 1000,
      });

      expect(_revealTx).toBeDefined();
      expect(_revealTx.vin.length).toBe(2);
      expect(_foundFeeRate).toBe(1);
      expect(_platformFee).toBe(1683);
      expect(_revealUnderpriced).toBe(undefined);
      expect(_minerFee).toBe(254);
    });
  });

  describe('Reveal Transaction', () => {
    describe.each([
      {
        inscriptions: [sampleInscription],
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 20000,
        revealTip: 20000,
        expectedFeeRate: 20,
        expectedPlatformFee: 17025,
        expectedMinerFee: 2900,
      },
      {
        inscriptions: [sampleInscription, sampleInscription], // Multiple inscriptions
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 10000,
        revealTip: 10000,
        expectedFeeRate: 12,
        expectedPlatformFee: 8090,
        expectedMinerFee: 2364,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 5] as const,
        expectedFeeRate: 9,
        expectedPlatformFee: 203,
        expectedMinerFee: 14976,
        tip: 10000,
        revealTip: 0,
        underpriced: false,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 5] as const,
        expectedFeeRate: 30,
        expectedPlatformFee: 0,
        expectedMinerFee: 49920,
        tip: 100000,
        revealTip: 1000000,
        underpriced: true,
      },
    ])(
      'should handle reveal transaction with inscriptions=$inscriptions.length paymentFeeRate=$paymentFeeRate tip=$tip revealFeeRange=$revealFeeRange',
      ({
        inscriptions,
        paymentFeeRate,
        revealFeeRange,
        tip,
        expectedFeeRate,
        expectedPlatformFee,
        expectedMinerFee,
        underpriced,
        revealTip,
      }) => {
        it(
          underpriced
            ? 'should be underpriced when no valid fee rate found'
            : 'should generate valid reveal transaction',
          async () => {
            const funding = await generateFundableGenesisTransaction({
              address: TEST_ADDRESS,
              inscriptions,
              network: TEST_NETWORK,
              privKey: TEST_PRIVATE_KEY,
              feeRate: paymentFeeRate,
              tip,
              padding: 546,
            });

            const vsize = Tx.util.getTxSize(funding.partialHex).vsize;
            const totalGenesisTxFee = Math.ceil(vsize * paymentFeeRate);
            const totalAvailableForReveal =
              Number(bitcoinToSats(funding.amount)) - totalGenesisTxFee;

            const {
              txData: revealTx,
              feeRate: foundFeeRate,
              platformFee,
              underpriced: revealUnderpriced,
              minerFee,
            } = generateRevealTransactionDataIteratively({
              inputs: [
                {
                  leaf: funding.genesisLeaf,
                  tapkey: funding.genesisTapKey,
                  cblock: funding.genesisCBlock,
                  script: funding.genesisScript,
                  vout: 0,
                  txid: 'a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968',
                  amount: totalAvailableForReveal,
                  secKey: funding.secKey,
                  padding: funding.padding,
                  inscriptions: funding.inscriptionsToWrite,
                  rootTapKey: funding.rootTapKey,
                },
              ],
              feeRateRange: revealFeeRange as [number, number],
              feeDestinations: [
                {
                  address: TEST_ADDRESS,
                  weight: 100,
                },
              ],
              feeTarget: revealTip,
            });

            expect(revealTx).toBeDefined();
            const encodedReveal = Tx.encode(revealTx) as { hex: string };
            expect(typeof encodedReveal.hex).toBe('string');
            expect(foundFeeRate).toBe(expectedFeeRate);
            expect(Math.round(platformFee)).toBe(expectedPlatformFee);
            expect(!!revealUnderpriced).toBe(!!underpriced);
            expect(minerFee).toBe(expectedMinerFee);
          }
        );
      }
    );
  });

  describe('Parent Transaction Signing', () => {
    it('should correctly sign a single parent transaction', () => {
      const parentTx = {
        vin: {
          txid: '611f0360dd2bb28927625dbc13eab58cd968a99d1112bcb35845fd44e703ef2c',
          vout: 0,
        },
        value: 546,
        secKey: SEC_KEY_2,
        destinationAddress: TEST_ADDRESS_2,
      };

      const request: RevealTransactionRequest = {
        inputs: [],
        parentTxs: [parentTx],
        feeRateRange: [1, 2],
      };

      const { txSkeleton, witnessSigners } = buildSkeleton(request);
      signAllVin(txSkeleton, witnessSigners);
      // Test each step individually
      const secKey = get_seckey(parentTx.secKey);
      const pubKey = get_pubkey(secKey);
      expect(pubKey).toBeTruthy();

      const [tPub, cBlock] = Tap.getPubKey(pubKey);
      expect(tPub).toBeTruthy();
      expect(cBlock).toBeTruthy();

      const [tapSecKey] = Tap.getSecKey(secKey);
      expect(tapSecKey).toBeTruthy();

      // Create a minimal transaction for signing
      // const minimalTx = {
      //   ...txSkeleton,
      //   vin: [
      //     {
      //       ...txSkeleton.vin[0],
      //       prevout: {
      //         ...txSkeleton.vin[0].prevout,
      //         scriptPubKey: Address.p2tr.scriptPubKey(tPub),
      //       },
      //     },
      //   ],
      //   vout: [txSkeleton.vout[0]],
      // };

      const verifyDefault = Signer.taproot.verify(txSkeleton, 0, {
        pubkey: pubKey,
        throws: true,
      });

      expect(verifyDefault).toBe(true);
    });
  });
});

const mockFunding = {
  id: '143361809af2e5cdb72af5a70d6186785f33be606a5e28d0f494416ec52d0e02',
  fundingAddress:
    'bcrt1pzsekrqy67tjumde27kns6cvx0p0n80nqdf0z3585j3qka3fdpcpqmke6au',
  fundingAmountBtc: '0.00025856',
  initCBlock:
    'c142b6b060163faf855d4f6c93a3a43f0b032483da57dfb9e0c8ed27ebc622fc09a26d99bb38fcb20d05c6552b0400f4935acf10d27648cefa4720d264cf04a538',
  initLeaf: '98a48b981e89fdfe1d3e710db0cac5b59251716b93bf7066b1f287c91b934abf',
  initScript: [
    { base64: 'QrawYBY/r4VdT2yTo6Q/CwMkg9pX37ngyO0n68Yi/Ak=' },
    'OP_CHECKSIG',
    'OP_0',
    'OP_IF',
    { base64: 'b3Jk' },
    '01',
    { base64: 'aW1hZ2UvcG5n' },
    'OP_0',
    {
      base64:
        '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',
    },
    'OP_ENDIF',
  ] as BitcoinScriptData[],
  initTapKey:
    '143361809af2e5cdb72af5a70d6186785f33be606a5e28d0f494416ec52d0e02',
  network: 'regtest',
  overhead: 20642,
  padding: 546,
  secKey: '9c22f6dc7929610f3152677bb966761abdb2c3c1c3b37ad6b8cd0f3085cec078',
  totalFee: 5214,
  writableInscriptions: [
    {
      pointerIndex: 0,
      file: { content: {}, mimetype: 'image/png' },
      destinationAddress:
        'bcrt1phpde994azkhgcmeztaa3nrgujvh3xq599fcy44qm00l7yau89xjqmzqay2',
    },
  ],
  tip: 20000,
  tipAmountDestination:
    'bcrt1p426wd6f89k26gpugyp5kmcztcldrhyp5cfsazx29wkprdzt8l82qprc5fc',
};

describe('Reveal Transaction', () => {
  it('should generate a valid reveal transaction', () => {
    const secKey = get_seckey(mockFunding.secKey);
    const funding = generateRevealTransaction({
      inputs: [
        {
          amount: Number(bitcoinToSats(mockFunding.fundingAmountBtc)),
          cblock: mockFunding.initCBlock,
          leaf: mockFunding.initLeaf,
          script: mockFunding.initScript,
          padding: mockFunding.padding,
          secKey,
          tapkey: mockFunding.initTapKey,
          txid: '3f6edfd2b521b4166748840b79fed5f241921f17e883e724d207d7fc9aaf40a8',
          vout: 1,
          inscriptions: mockFunding.writableInscriptions,
          rootTapKey: mockFunding.initTapKey,
        },
      ],
      feeRateRange: [1, 5],
      feeDestinations: [
        {
          address:
            'bcrt1p426wd6f89k26gpugyp5kmcztcldrhyp5cfsazx29wkprdzt8l82qprc5fc',
          weight: 100,
        },
      ],
      feeTarget: 20000,
    });

    const txData = Tx.decode(funding.hex);

    expect(txData).toBeDefined();
    expect(txData.vin.length).toBe(1);
    expect(txData.vout.length).toBe(2);
    expect(Number(txData.vout[0].value)).toBe(mockFunding.padding);
    expect(Number(txData.vout[1].value)).toBe(funding.platformFee);
  });

  it('should generate a valid reveal transaction with 2 inputs', () => {
    const secKey = get_seckey(mockFunding.secKey);
    const funding = generateRevealTransaction({
      inputs: [
        {
          amount: Number(bitcoinToSats(mockFunding.fundingAmountBtc)),
          cblock: mockFunding.initCBlock,
          leaf: mockFunding.initLeaf,
          script: mockFunding.initScript,
          padding: mockFunding.padding,
          secKey,
          tapkey: mockFunding.initTapKey,
          txid: '3f6edfd2b521b4166748840b79fed5f241921f17e883e724d207d7fc9aaf40a8',
          vout: 1,
          inscriptions: mockFunding.writableInscriptions,
          rootTapKey: mockFunding.initTapKey,
        },
        {
          amount: Number(bitcoinToSats(mockFunding.fundingAmountBtc)),
          cblock: mockFunding.initCBlock,
          leaf: mockFunding.initLeaf,
          script: mockFunding.initScript,
          padding: mockFunding.padding,
          secKey,
          tapkey: mockFunding.initTapKey,
          txid: '4f6edfd2b521b4166748840b79fed5f241921f17e883e724d207d7fc9aaf40a8',
          vout: 2,
          inscriptions: mockFunding.writableInscriptions,
          rootTapKey: mockFunding.initTapKey,
        },
      ],
      feeRateRange: [1, 5],
      feeDestinations: [
        {
          address:
            'bcrt1p426wd6f89k26gpugyp5kmcztcldrhyp5cfsazx29wkprdzt8l82qprc5fc',
          weight: 100,
        },
      ],
      feeTarget: 40000,
    });

    const txData = Tx.decode(funding.hex);

    expect(txData).toBeDefined();
    expect(txData.vin.length).toBe(2);
    expect(txData.vout.length).toBe(3);
    expect(Number(txData.vout[0].value)).toBe(mockFunding.padding);
    expect(Number(txData.vout[1].value)).toBe(mockFunding.padding);
    expect(Number(txData.vout[2].value)).toBe(funding.platformFee);
  });
});
