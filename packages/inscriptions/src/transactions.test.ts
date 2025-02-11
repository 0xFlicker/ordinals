import { KeyPair } from "@0xflick/crypto-utils";
import { Address, Tap, Tx } from "@0xflick/tapscript";
import { generateFundableGenesisTransaction } from "./genesis.js";
import { bitcoinToSats, networkNamesToTapScriptName } from "./utils.js";
import { generateRefundTransaction } from "./refund.js";
import { generateRevealTransactionDataIteratively } from "./reveal.js";

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

      expect(typeof funding.genesisAddress).toBe("string");
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
        expectedMinerFee: 2900,
      },
      {
        inscriptions: [sampleInscription, sampleInscription], // Multiple inscriptions
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [20, 1] as const,
        tip: 10000,
        revealTip: 10000,
        expectedFeeRate: 20,
        expectedPlatformFee: 9140,
        expectedMinerFee: 3960,
      },
      {
        inscriptions: Array(30).fill(sampleInscription),
        paymentFeeRate: TEST_FEE_RATE,
        revealFeeRange: [30, 5] as const,
        expectedFeeRate: 5,
        expectedPlatformFee: 9785,
        expectedMinerFee: 8375,
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
        expectedMinerFee: 50250,
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
