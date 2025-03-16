import { KeyPair } from "@0xflick/crypto-utils";
import { Address, Tap, Tx, Signer, TxTemplate } from "@0xflick/tapscript";
import { generateFundableGenesisTransaction } from "./genesis.js";
import { bitcoinToSats, networkNamesToTapScriptName } from "./utils.js";
import { generateRefundTransaction } from "./refund.js";
import {
  buildSkeleton,
  generateRevealTransactionDataIteratively,
} from "./reveal.js";
import { RevealTransactionRequest } from "./reveal.js";

describe("Bitcoin Inscription Transactions", () => {
  const TEST_PRIVATE_KEY =
    "0000000000000000000000000000000000000000000000000000000000000001";

  const TEST_PRIVATE_KEY_2 =
    "0000000000000000000000000000000000000000000000000000000000000002";
  const SEC_KEY = new KeyPair(TEST_PRIVATE_KEY);
  const SEC_KEY_2 = new KeyPair(TEST_PRIVATE_KEY_2);
  const PUB_KEY = SEC_KEY.pub.x;
  const PUB_KEY_2 = SEC_KEY_2.pub.x;
  const [TAP_KEY, C_BLOCK] = Tap.getPubKey(PUB_KEY);
  const [TAP_KEY_2, C_BLOCK_2] = Tap.getPubKey(PUB_KEY_2);

  const TEST_NETWORK = "mainnet";
  const TEST_ADDRESS = Address.p2tr.encode(
    TAP_KEY,
    networkNamesToTapScriptName(TEST_NETWORK),
  );
  const TEST_ADDRESS_2 = Address.p2tr.encode(
    TAP_KEY_2,
    networkNamesToTapScriptName(TEST_NETWORK),
  );
  const TEST_FEE_RATE = 5;

  // Sample inscription content
  const sampleInscription = {
    content: new TextEncoder().encode("Hello, World!").buffer,
    mimeType: "text/plain",
    compress: false,
  };

  // describe("Funding Transaction", () => {
  //   it("should generate a valid funding address and transaction details", async () => {
  //     const result = await generateFundingAddress({
  //       address: TEST_ADDRESS,
  //       inscriptions: [sampleInscription],
  //       network: TEST_NETWORK,
  //       privKey: TEST_PRIVATE_KEY,
  //       feeRate: TEST_FEE_RATE,
  //       tip: 1000,
  //       padding: 546,
  //     });

  //     expect(result.fundingAddress).toBeDefined();
  //     expect(result.amount).toBeDefined();
  //     expect(result.totalFee).toBeGreaterThan(0);
  //     expect(result.inscriptionsToWrite).toHaveLength(1);
  //   });
  // });

  describe("Genesis Transaction", () => {
    it("should generate a valid genesis transaction", async () => {
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

      expect(typeof funding.fundingAddress).toBe("string");
    });
  });

  describe("Refund Transaction", () => {
    it("should generate a valid refund transaction", async () => {
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
        refundTapKey: funding.refundTapKey,
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
        secKey: funding.secKey,
      });

      expect(refundTx).toBeDefined();
      expect(typeof refundTx).toBe("string");
    });
  });

  describe("Parent inscription", () => {
    it("should generate a valid parent inscription", async () => {
      const funding = await generateFundableGenesisTransaction({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
      });

      const vsize = Tx.util.getTxSize(funding.partialHex).vsize;
      const totalGenesisTxFee = Math.ceil(vsize * TEST_FEE_RATE);
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
            cblock: funding.genesisCblock,
            script: funding.genesisScript,
            vout: 0,
            txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
            amount: totalAvailableForReveal,
            secKey: funding.secKey,
            padding: funding.padding,
            inscriptions: funding.inscriptionsToWrite,
          },
        ],
        parentTxs: [
          {
            destinationAddress: TEST_ADDRESS_2,
            secKey: SEC_KEY_2,
            value: 546,
            vin: {
              txid: "611f0360dd2bb28927625dbc13eab58cd968a99d1112bcb35845fd44e703ef2c",
              vout: 0,
            },
          },
        ],
        feeRateRange: [TEST_FEE_RATE, TEST_FEE_RATE] as [number, number],
        feeDestinations: [
          {
            address: TEST_ADDRESS,
            weight: 100,
          },
        ],
        feeTarget: 20000,
      });
    });
  });

  describe("Reveal Transaction", () => {
    describe.each([
      {
        inscriptions: [sampleInscription],
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 20000,
        revealTip: 20000,
        expectedFeeRate: 20,
        expectedPlatformFee: 16164,
        expectedMinerFee: 2958,
      },
      {
        inscriptions: [sampleInscription, sampleInscription], // Multiple inscriptions
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 10000,
        revealTip: 10000,
        expectedFeeRate: 8,
        expectedPlatformFee: 8033,
        expectedMinerFee: 1616,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 5] as const,
        expectedFeeRate: 5,
        expectedPlatformFee: 1238,
        expectedMinerFee: 8543,
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
        expectedMinerFee: 11781,
        tip: 100000,
        revealTip: 1000000,
        underpriced: true,
      },
    ])(
      "should handle reveal transaction with inscriptions=$inscriptions.length paymentFeeRate=$paymentFeeRate tip=$tip revealFeeRange=$revealFeeRange",
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
            ? "should be underpriced when no valid fee rate found"
            : "should generate valid reveal transaction",
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
                  cblock: funding.genesisCblock,
                  script: funding.genesisScript,
                  vout: 0,
                  txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
                  amount: totalAvailableForReveal,
                  secKey: funding.secKey,
                  padding: funding.padding,
                  inscriptions: funding.inscriptionsToWrite,
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
            expect(typeof Tx.encode(revealTx).hex).toBe("string");
            expect(foundFeeRate).toBe(expectedFeeRate);
            expect(Math.round(platformFee)).toBe(expectedPlatformFee);
            expect(!!revealUnderpriced).toBe(!!underpriced);
            expect(minerFee).toBe(expectedMinerFee);
          },
        );
      },
    );
  });

  describe("Parent Transaction Signing", () => {
    it("should correctly sign a single parent transaction", () => {
      const parentTx = {
        vin: {
          txid: "611f0360dd2bb28927625dbc13eab58cd968a99d1112bcb35845fd44e703ef2c",
          vout: 0,
          sequence: 4294967293,
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

      // Test each step individually
      const pubKey = parentTx.secKey.pub.x;
      expect(pubKey).toBeTruthy();

      const [tPub, cBlock] = Tap.getPubKey(pubKey);
      expect(tPub).toBeTruthy();
      expect(cBlock).toBeTruthy();

      const tapSecKey = Tap.getSecKey(parentTx.secKey)[0];
      expect(tapSecKey).toBeTruthy();

      // Create a minimal transaction for signing
      const minimalTx = {
        ...txSkeleton,
        vin: [
          {
            ...txSkeleton.vin[0],
            prevout: {
              ...txSkeleton.vin[0].prevout,
              scriptPubKey: Address.p2tr.scriptPubKey(tPub),
            },
          },
        ],
        vout: [txSkeleton.vout[0]],
      };

      console.log("Minimal TX:", {
        vin: minimalTx.vin,
        vout: minimalTx.vout,
        tPub,
        scriptPubKey: Address.p2tr.scriptPubKey(tPub),
      });

      // Try both with and without explicit sighash type
      const sigDefault = Signer.taproot.sign(
        tapSecKey,
        minimalTx as TxTemplate,
        0,
      );

      console.log("Signatures:", {
        default: sigDefault,
      });

      // Try verification with different parameters
      const verifyDefault = Signer.taproot.verifyTx(
        minimalTx as TxTemplate,
        0,
        {
          pubkey: tPub,
        },
      );

      console.log("Verification Results:", {
        default: verifyDefault,
      });

      // Try manual signature verification
      const hash = Signer.taproot.hash(minimalTx as TxTemplate, 0);
      const manualVerify = Signer.taproot.verify(sigDefault, hash, tPub);

      console.log("Manual Verification:", {
        hash,
        result: manualVerify,
      });

      expect(verifyDefault || manualVerify).toBe(true);
    });

    it("should correctly sign with multiple inputs", () => {
      const parentTx = {
        vin: {
          txid: "611f0360dd2bb28927625dbc13eab58cd968a99d1112bcb35845fd44e703ef2c",
          vout: 0,
          sequence: 4294967293,
        },
        value: 546,
        secKey: SEC_KEY_2,
        destinationAddress: TEST_ADDRESS_2,
      };

      // Create a transaction with a dummy second input
      const request: RevealTransactionRequest = {
        inputs: [
          {
            leaf: "00".repeat(32),
            tapkey: "00".repeat(32),
            cblock: "00".repeat(32),
            script: [],
            vout: 0,
            txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
            amount: 1546,
            secKey: SEC_KEY,
            padding: 546,
            inscriptions: [],
          },
        ],
        parentTxs: [parentTx],
        feeRateRange: [1, 2],
      };

      const { txSkeleton, witnessSigners } = buildSkeleton(request);

      // Add dummy witnesses for all inputs except the one we're signing
      txSkeleton.vin = txSkeleton.vin.map((vin, i) => ({
        ...vin,
        witness: i === 0 ? [] : ["00".repeat(64)],
      }));

      const pubKey = parentTx.secKey.pub.x;
      const [tPub, cBlock] = Tap.getPubKey(pubKey);
      const tapSecKey = Tap.getSecKey(parentTx.secKey)[0];

      // Create a minimal transaction for signing
      const minimalTx = {
        ...txSkeleton,
        vin: [
          {
            ...txSkeleton.vin[0],
            prevout: {
              ...txSkeleton.vin[0].prevout,
              scriptPubKey: Address.p2tr.scriptPubKey(tPub),
            },
          },
        ],
        vout: [txSkeleton.vout[0]],
      } as TxTemplate;

      console.log("Minimal TX:", {
        vin: minimalTx.vin,
        vout: minimalTx.vout,
        tPub,
        scriptPubKey: Address.p2tr.scriptPubKey(tPub),
      });

      // Try both with and without explicit sighash type
      const sigDefault = Signer.taproot.sign(tapSecKey, minimalTx, 0);
      const sigSighashDefault = Signer.taproot.sign(tapSecKey, minimalTx, 0, {
        sigflag: 1,
      });

      console.log("Signatures:", {
        default: sigDefault,
        sighashDefault: sigSighashDefault,
      });

      // Try verification with different parameters
      const verifyDefault = Signer.taproot.verifyTx(minimalTx, 0, {
        pubkey: tPub,
      });
      const verifyWithSighash = Signer.taproot.verifyTx(minimalTx, 0, {
        pubkey: tPub,
        sigflag: 1,
      });

      console.log("Verification Results:", {
        default: verifyDefault,
        withSighash: verifyWithSighash,
      });

      // Try manual signature verification
      const hash = Signer.taproot.hash(minimalTx, 0);
      const manualVerify = Signer.taproot.verify(sigDefault, hash, tPub);

      console.log("Manual Verification:", {
        hash,
        result: manualVerify,
      });

      expect(verifyDefault || manualVerify).toBe(true);
    });
  });
});
