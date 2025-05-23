import {
  get_keypair,
  get_pubkey,
  get_seckey,
} from "@cmdcode/crypto-tools/keys";
import { Address, Tap, Tx } from "@cmdcode/tapscript";
import { groupFundings, GroupableFunding } from "./groupings.js";

import {
  bitcoinToSats,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "./utils.js";
import { generateFundableGenesisTransaction } from "./genesis.js";
import { InscriptionContent } from "./types.js";
import { RevealTransactionInput } from "./reveal.js";
const TEST_NETWORK = "mainnet";

// Sample inscription content
const sampleInscription: InscriptionContent = {
  content: new TextEncoder().encode("Hello, World!").buffer,
  mimeType: "text/plain",
  compress: false,
};

function inscriptionOfSize(size: number): InscriptionContent {
  return {
    content: new TextEncoder().encode("a".repeat(size)).buffer,
    mimeType: "text/plain",
    compress: false,
  };
}

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
  const secKey = get_seckey(privateKey);
  const pubKey = get_pubkey(secKey);
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
  contentSize?: number,
): Promise<GroupableFunding> {
  const privKey = generatePrivKey();
  const address = generateTapscriptAddress();

  const parentAddress = generateTapscriptAddress();

  const txid = createUniqueTxid();

  const funding = await generateFundableGenesisTransaction({
    address,
    inscriptions: contentSize
      ? [inscriptionOfSize(contentSize)]
      : [sampleInscription],
    network: TEST_NETWORK,
    privKey,
    feeRate: 5,
    tip: 10000,
    padding: 546,
  });

  const { size: actualSize } = Tx.util.getTxSize(funding.partialHex);

  // Use the override if provided, otherwise apply your original logic.
  const sizeEstimate = actualSize;

  const input: RevealTransactionInput = {
    leaf: funding.genesisLeaf,
    tapkey: funding.genesisTapKey,
    cblock: funding.genesisCBlock,
    script: funding.genesisScript,
    rootTapKey: funding.rootTapKey,
    vout: 0,
    txid,
    amount: Number(bitcoinToSats(funding.amount)),
    secKey: funding.secKey,
    padding: funding.padding,
    inscriptions: funding.inscriptionsToWrite,
  };

  let parentTx;
  if (parentInscriptionId) {
    const parentTxid = parentInscriptionId.split("i")[0];
    const parentVout = parseInt(parentInscriptionId.split("i")[1]) || 0;
    // Use a valid private key for parent transactions
    const parentPrivKey = generatePrivKey();
    const secKey = get_seckey(parentPrivKey);

    parentTx = {
      vin: { txid: parentTxid, vout: parentVout },
      value: 546,
      secKey,
      destinationAddress: parentAddress,
    };
  }

  return {
    id: id.toString(),
    sizeEstimate,
    parentInscriptionId,
    fundedAt,
    input,
    parentTx,
    feeDestinations: feeDestinations || [{ address, weight: 100 }],
  };
}

const feeRateRange: [number, number] = [10, 1];

describe("groupFundings", () => {
  it("should group fundings by parentInscriptionId", async () => {
    const now = new Date(Date.now() - 20 * 60 * 1000);
    const parentTxid1 = createUniqueTxid();
    const parentTxid2 = createUniqueTxid();
    const feeAddressA = generateTapscriptAddress();
    const feeAddressB = generateTapscriptAddress();

    const funding1 = await createFunding(
      1,
      now,
      createParentInscriptionId(parentTxid1),
      [{ address: feeAddressA, weight: 100 }],
    );

    const funding2 = await createFunding(
      2,
      new Date(now.getTime() + 1000),
      createParentInscriptionId(parentTxid1),
      [{ address: feeAddressA, weight: 100 }],
    );
    const funding3 = await createFunding(
      3,
      now,
      createParentInscriptionId(parentTxid2),
      [{ address: feeAddressB, weight: 100 }],
    );
    const result = groupFundings([funding1, funding2, funding3], feeRateRange);
    expect(Object.keys(result.nextParentInscription).length).toBe(2);
    expect(
      result.laterParentInscription[createParentInscriptionId(parentTxid1)]
        ?.length || 0,
    ).toBe(0);
  });

  it("should group non-parent fundings by feeDestinations", async () => {
    const now = new Date(Date.now() - 20 * 60 * 1000);
    const feeAddressA = generateTapscriptAddress();
    const feeAddressB = generateTapscriptAddress();

    const feeA = [{ address: feeAddressA, weight: 100 }];
    const feeB = [{ address: feeAddressB, weight: 100 }];
    const funding1 = await createFunding(1, now, undefined, feeA);
    const funding2 = await createFunding(
      2,
      new Date(now.getTime() + 1000),
      undefined,
      feeA,
    );
    const funding3 = await createFunding(3, now, undefined, feeB);
    const result = groupFundings([funding1, funding2, funding3], feeRateRange);
    const keys = Object.keys(result.feeDestinationGroups);
    expect(keys).toContain(
      JSON.stringify(
        feeA.slice().sort((a, b) => a.address.localeCompare(b.address)),
      ),
    );
    expect(keys).toContain(
      JSON.stringify(
        feeB.slice().sort((a, b) => a.address.localeCompare(b.address)),
      ),
    );
  });

  it("batches nearby transactions", async () => {
    const oldDate = new Date(Date.now() - 20 * 60 * 1000);
    const recentDate = new Date(Date.now() - 5 * 60 * 1000);
    const funding1 = await createFunding(1, oldDate);
    const funding2 = await createFunding(2, recentDate);
    const result = groupFundings([funding1, funding2], feeRateRange);
    expect(Object.keys(result.feeDestinationGroups).length).toBe(2);
  });

  it("should reject a funding that is too large on its own", async () => {
    const now = new Date(Date.now() - 20 * 60 * 1000);
    const funding1 = await createFunding(1, now, undefined, undefined, 500000);
    const oldConsoleError = console.error;
    console.error = () => {};
    try {
      const result = groupFundings([funding1], feeRateRange);
      expect(result.rejectedFundings.map((f) => f.id)).toContain("1");
    } catch (e) {
      throw e;
    } finally {
      console.error = oldConsoleError;
    }
  });
});
