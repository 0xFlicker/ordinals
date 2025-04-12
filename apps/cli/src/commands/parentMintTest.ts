import { KeyPair, SecretKey } from "@0xflick/crypto-utils";
import { Address, Tap, Tx } from "@0xflick/tapscript";
import { validateBatch, InscriptionFunding } from "@0xflick/inscriptions";
import {
  bitcoinToSats,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import { generateFundableGenesisTransaction } from "@0xflick/inscriptions";
import { InscriptionContent } from "@0xflick/inscriptions";
import { RevealTransactionInput } from "@0xflick/inscriptions";

const TEST_NETWORK = "mainnet";
const feeRateRange: [number, number] = [10, 1];

// Sample inscription content
const sampleInscription: InscriptionContent = {
  content: new TextEncoder().encode("Hello, World!").buffer,
  mimeType: "text/plain",
  compress: false,
};

// Helper to create unique txids
function createUniqueTxid(): string {
  // Generate 32 random bytes and convert to hex
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to create parent inscription ID
function createParentInscriptionId(txid: string, vout: number = 0): string {
  return `${txid}i${vout}`;
}

// Helper to generate a valid Tapscript address
function generateTapscriptAddress(privateKey?: string): string {
  if (!privateKey) {
    privateKey = generatePrivKey();
  }
  const secKey = new KeyPair(privateKey);
  const pubKey = secKey.pub.x;
  return Address.p2tr.encode(
    Tap.getPubKey(pubKey)[0],
    networkNamesToTapScriptName(TEST_NETWORK),
  );
}

// Helper to create dummy funding records with realistic data.
async function createFunding(
  id: number,
  fundedAt: Date,
  parentInscriptionId?: string,
  feeDestinations?: { address: string; weight: number }[],
  batchId?: string,
  overrideSizeEstimate?: number,
): Promise<InscriptionFunding> {
  const privKey = generatePrivKey();
  const address = generateTapscriptAddress();

  const parentAddress = generateTapscriptAddress();

  const txid = createUniqueTxid();

  const funding = await generateFundableGenesisTransaction({
    address,
    inscriptions: [sampleInscription],
    network: TEST_NETWORK,
    privKey,
    feeRate: 5,
    tip: 0,
    padding: 546,
  });

  const { size: actualSize } = Tx.util.getTxSize(funding.partialHex);

  // Use the override if provided, otherwise apply your original logic.
  const sizeEstimate =
    overrideSizeEstimate !== undefined ? overrideSizeEstimate : actualSize;

  const input: RevealTransactionInput = {
    leaf: funding.genesisLeaf,
    tapkey: funding.genesisTapKey,
    cblock: funding.genesisCblock,
    script: funding.genesisScript,
    vout: 0,
    txid,
    amount: Number(bitcoinToSats(funding.amount)),
    secKey: new Uint8Array(funding.secKey.raw),
    padding: funding.padding,
    inscriptions: funding.inscriptionsToWrite,
  };

  let parentTx;
  if (parentInscriptionId) {
    const parentTxid = parentInscriptionId.split("i")[0];
    const parentVout = parseInt(parentInscriptionId.split("i")[1]) || 0;
    // Use a valid private key for parent transactions
    const parentPrivKey = generatePrivKey();
    const secKey = new KeyPair(parentPrivKey);

    parentTx = {
      vin: { txid: parentTxid, vout: parentVout },
      value: 546,
      secKey: secKey,
      destinationAddress: parentAddress,
    };
  }

  return {
    id: id.toString(),
    sizeEstimate,
    parentInscriptionId,
    fundedAt,
    inputs: [input],
    parentTxs: parentTx ? [parentTx] : [],
    feeDestinations: feeDestinations || [{ address, weight: 100 }],
  };
}

export async function parentMintTest() {
  console.log("Running parent-mint-test...");

  try {
    const now = new Date(Date.now() - 20 * 60 * 1000);
    const parentTxid = createUniqueTxid();
    const parentInscriptionId = createParentInscriptionId(parentTxid);
    const feeAddressA = generateTapscriptAddress();

    console.log("Creating first funding...");
    const funding = await createFunding(1, now, parentInscriptionId, [
      { address: feeAddressA, weight: 100 },
    ]);

    console.log("Validating first funding...");
    if (funding.parentInscriptionId !== parentInscriptionId) {
      throw new Error(
        `Expected parentInscriptionId to be ${parentInscriptionId}, got ${funding.parentInscriptionId}`,
      );
    }

    if (!funding.parentTxs) {
      throw new Error("Expected parentTxs to be defined");
    }

    if (funding.parentTxs.length !== 1) {
      throw new Error(
        `Expected parentTxs length to be 1, got ${funding.parentTxs.length}`,
      );
    }

    if (funding.parentTxs[0].vin.txid !== parentTxid) {
      throw new Error(
        `Expected parentTxs[0].vin.txid to be ${parentTxid}, got ${funding.parentTxs[0].vin.txid}`,
      );
    }

    const validated = validateBatch([funding], feeRateRange);
    if (validated === false) {
      throw new Error("Expected validated to not be false");
    }

    console.log("Creating second funding...");
    const funding2 = await createFunding(2, now, parentInscriptionId, [
      { address: feeAddressA, weight: 100 },
    ]);

    console.log("Validating batch of two fundings...");
    const validatedBatch = validateBatch([funding, funding2], feeRateRange);
    if (validatedBatch === false) {
      throw new Error("Expected validatedBatch to not be false");
    }

    const parentTxid2 = createUniqueTxid();
    const parentInscriptionId2 = createParentInscriptionId(parentTxid2);
    const feeAddressB = generateTapscriptAddress();

    console.log("Creating third funding...");
    const funding3 = await createFunding(3, now, parentInscriptionId2, [
      { address: feeAddressB, weight: 100 },
    ]);

    console.log("Validating all three fundings...");
    const validatedAll = validateBatch(
      [funding, funding2, funding3],
      feeRateRange,
    );
    if (validatedAll === false) {
      throw new Error("Expected validatedAll to not be false");
    }

    console.log("All validations passed successfully!");
    return true;
  } catch (error) {
    console.error("Error in parent-mint-test:", error);
    return false;
  }
}
