import { KeyPair } from "@0xflick/crypto-utils";
import { Address, Tap, Tx } from "@0xflick/tapscript";
import {
  generateFundingAddress,
  generateGenesisTransaction,
  generateRefundTransaction,
  generateRevealTransaction,
  generateRevealTransactionDataIteratively,
} from "./transactions.js";
import { bitcoinToSats, networkNamesToTapScriptName } from "./utils.js";

describe("Bitcoin Inscription Transactions", () => {
  const TEST_PRIVATE_KEY =
    "0000000000000000000000000000000000000000000000000000000000000001";
  const SEC_KEY = new KeyPair(TEST_PRIVATE_KEY);
  const PUB_KEY = SEC_KEY.pub.x;
  const [TAP_KEY, C_BLOCK] = Tap.getPubKey(PUB_KEY);

  const TEST_NETWORK = "mainnet";
  const TEST_ADDRESS = Address.p2tr.encode(
    TAP_KEY,
    networkNamesToTapScriptName(TEST_NETWORK),
  );
  const TEST_FEE_RATE = 5;

  // Sample inscription content
  const sampleInscription = {
    content: new TextEncoder().encode("Hello, World!").buffer,
    mimeType: "text/plain",
    compress: false,
  };

  describe("Funding Transaction", () => {
    it("should generate a valid funding address and transaction details", async () => {
      const result = await generateFundingAddress({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
      });

      expect(result.fundingAddress).toBeDefined();
      expect(result.amount).toBeDefined();
      expect(result.totalFee).toBeGreaterThan(0);
      expect(result.inscriptionsToWrite).toHaveLength(1);
    });
  });

  describe("Genesis Transaction", () => {
    it("should generate a valid genesis transaction", async () => {
      // First generate funding address to get necessary parameters
      const funding = await generateFundingAddress({
        address: TEST_ADDRESS,
        inscriptions: [sampleInscription],
        network: TEST_NETWORK,
        privKey: TEST_PRIVATE_KEY,
        feeRate: TEST_FEE_RATE,
        tip: 1000,
        padding: 546,
      });

      const genesisTx = await generateGenesisTransaction({
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
        amount: 10000,
        fee: TEST_FEE_RATE,
        initScript: funding.initScript,
        initTapKey: funding.initTapKey,
        initLeaf: funding.initLeaf,
        initCBlock: funding.initCBlock,
        secKey: funding.secKey,
      });

      expect(genesisTx).toBeDefined();
      expect(typeof genesisTx).toBe("string");
    });
  });

  describe("Refund Transaction", () => {
    it("should generate a valid refund transaction", async () => {
      const funding = await generateFundingAddress({
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
        initTapKey: funding.initTapKey,
        secKey: funding.secKey,
        refundCBlock: funding.initCBlock,
        txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
        vout: 0,
        amount: 10000,
        address: TEST_ADDRESS,
      });

      expect(refundTx).toBeDefined();
      expect(typeof refundTx).toBe("string");
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
        expectedPlatformFee: 19140,
        expectedMinerFee: 1880,
      },
      {
        inscriptions: [sampleInscription, sampleInscription], // Multiple inscriptions
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 10000,
        revealTip: 10000,
        expectedFeeRate: 20,
        expectedPlatformFee: 9140,
        expectedMinerFee: 2740,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 5] as const,
        expectedFeeRate: 7,
        expectedPlatformFee: 9699,
        expectedMinerFee: 9387,
        tip: 10000,
        revealTip: 0,
        underpriced: false,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 8] as const,
        expectedFeeRate: 8,
        expectedPlatformFee: 0,
        expectedMinerFee: 10728,
        tip: 11000,
        revealTip: 10000,
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
            const funding = await generateFundingAddress({
              address: TEST_ADDRESS,
              inscriptions,
              network: TEST_NETWORK,
              privKey: TEST_PRIVATE_KEY,
              feeRate: paymentFeeRate,
              tip,
              padding: 546,
            });

            const genesisTx = await generateGenesisTransaction({
              txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
              vout: 0,
              amount: Number(bitcoinToSats(funding.amount)),
              fee: paymentFeeRate,
              initScript: funding.initScript,
              initTapKey: funding.initTapKey,
              initLeaf: funding.initLeaf,
              initCBlock: funding.initCBlock,
              secKey: funding.secKey,
            });

            const { vsize } = Tx.util.getTxSize(genesisTx);
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
                  leaf: funding.initLeaf,
                  tapkey: funding.initTapKey,
                  cblock: funding.initCBlock,
                  script: funding.initScript,
                  vout: 0,
                  txid: "a99d1112bcb35845fd44e703ef2c611f0360dd2bb28927625dbc13eab58cd968",
                  amount: totalAvailableForReveal,
                  address: TEST_ADDRESS,
                  secKey: funding.secKey,
                  padding: funding.padding,
                  inscriptions: funding.inscriptionsToWrite,
                },
              ],
              feeRateRange: revealFeeRange as [number, number],
              feeDestinations: [
                {
                  address: TEST_ADDRESS,
                  percentage: 100,
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
});
