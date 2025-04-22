import { CreateBucketCommand } from "@aws-sdk/client-s3";
import {
  ID_AddressInscription,
  hashAddress,
  toAddressInscriptionId,
} from "@0xflick/ordinals-models";
import {
  createDynamoDbFundingDao,
  createStorageFundingDocDao,
  createS3Client,
  createMempoolBitcoinClient,
} from "@0xflick/ordinals-backend";
import {
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  BitcoinNetworkNames,
  addressReceivedMoneyInThisTx,
  broadcastTx,
  generatePrivKey,
  networkNamesToTapScriptName,
  bitcoinToSats,
  generateRefundTransaction,
  serializedScriptToScriptData,
  textToHex,
  groupFundings,
} from "@0xflick/inscriptions";
import {
  get_seckey,
  get_pubkey,
  tweak_pubkey,
  tweak_seckey,
} from "@cmdcode/crypto-tools/keys";
import { Address, Tap, Tx, Script, Signer } from "@cmdcode/tapscript";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import {
  sendBitcoin,
  generateBlock,
  createWallet,
  getNewAddress,
  loadWallet,
  sendRawTransaction,
} from "./bitcoin";
import { checkTxo, fetchFunding } from "./mempool";
import { retryWithBackOff } from "@0xflick/ordinals-backend/src/utils/retry";
import { UnableToFindFeasibleFeeRateError } from "../../inscriptions/src/errors";

async function waitForFunding(
  address: string,
  network: BitcoinNetworkNames,
  value: number,
) {
  const mempoolBitcoinClient = createMempoolBitcoinClient({
    network,
  });

  // Use retryWithBackOff to handle 5xx errors with exponential backoff
  return retryWithBackOff(
    async () => {
      try {
        return await checkTxo({
          address,
          mempoolBitcoinClient,
          findValue: value,
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
          findValue: value,
        });
      }
    },
    5, // maxRetries
    1000, // initial backoff in ms
  );
}

const generateInscriptionAddress = (
  network: BitcoinNetworkNames = "regtest",
) => {
  const privKey = generatePrivKey();
  const secKey = get_seckey(privKey);
  const pubKey = get_pubkey(secKey, true);
  const [tseckey] = Tap.getSecKey(secKey);
  const [tpubkey, cblock] = Tap.getPubKey(pubKey);
  const inscriptionAddress = Address.p2tr.encode(
    tpubkey,
    networkNamesToTapScriptName(network),
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

describe("genesis", () => {
  it("should create a db", async () => {
    const fundingDao = createDynamoDbFundingDao();
    expect(fundingDao).toBeDefined();
    await fundingDao.createFunding({
      id: "1" as ID_AddressInscription,
      address: "1234567890",
      destinationAddress: "1234567890",
      fundingAmountBtc: "1000",
      fundingAmountSat: 1000,
      createdAt: new Date(),
      fundingStatus: "funding",
      network: "regtest",
      timesChecked: 0,
      sizeEstimate: 1000,
      type: "address-inscription",
      meta: {},
    });
    const funding = await fundingDao.getFunding("1" as ID_AddressInscription);
    expect(funding).toBeDefined();
    expect(funding?.id).toBe("1" as ID_AddressInscription);
  });

  let generationAddress: string;
  beforeAll(async () => {
    await createWallet({
      walletName: "test",
    });
    generationAddress = await getNewAddress({
      rpcwallet: "test",
    });
    await generateBlock({
      rpcwallet: "test",
      address: generationAddress,
      amount: 101,
    });

    // create the test-bucket
    const s3Client = createS3Client();
    try {
      await s3Client.send(
        new CreateBucketCommand({
          Bucket: "test-bucket",
        }),
      );
    } catch (error) {
      // ignore if the bucket already exists
    }
  });

  // Generate a random tip destination address
  const TIP_DESTINATION = generateInscriptionAddress();
  const TIP_AMOUNT = 5000;

  const NETWORK = "regtest";
  const RPC_WALLET = "test";
  const mempoolBitcoinClient = createMempoolBitcoinClient({
    network: NETWORK,
  });

  it("Can spend a simple pay to public taproot output", async () => {
    const { pubKey, secKey, privKey, tseckey, inscriptionAddress } =
      generateInscriptionAddress("regtest");

    const script = [pubKey.to_bytes(), "OP_CHECKSIG"];

    const tapLeaf = Tap.encodeScript(script);
    const [tweakedSecKey] = Tap.getSecKey(secKey);
    const [tweakedPubKey] = Tap.getPubKey(pubKey);
    const address = Address.p2tr.fromPubKey(
      tweakedPubKey,
      networkNamesToTapScriptName(NETWORK),
    );

    console.log(`Address: ${address}`);

    await sendBitcoin({
      address,
      amount: "0.0001",
      rpcwallet: RPC_WALLET,
    });

    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: generationAddress,
    });

    const { txid, vout, amount } = await waitForFunding(
      address,
      NETWORK,
      Number(bitcoinToSats("0.0001")),
    );

    const txData = Tx.create({
      vin: [
        {
          txid,
          vout,
          prevout: {
            value: amount,
            scriptPubKey: ["OP_1", tweakedPubKey],
          },
        },
      ],
      vout: [
        {
          value: amount - 1000,
          scriptPubKey: Address.toScriptPubKey(inscriptionAddress),
        },
      ],
    });

    const sig = Signer.taproot.sign(tweakedSecKey, txData, 0);

    txData.vin[0].witness = [sig.hex];

    const txHex = Tx.encode(txData).hex;

    const spendTxId = await sendRawTransaction({
      txhex: txHex,
    });

    console.log(`TxID: ${spendTxId}`);
  });

  it("Can spend a simple pay to tapscript output with a cblock", async () => {
    const { pubKey, secKey, privKey, tseckey, inscriptionAddress } =
      generateInscriptionAddress("regtest");

    const script = [pubKey, "OP_CHECKSIG"];

    const tapLeaf = Tap.encodeScript(script);
    const [tweakedPubKey, cblock] = Tap.getPubKey(pubKey, { target: tapLeaf });
    const address = Address.p2tr.fromPubKey(
      tweakedPubKey,
      networkNamesToTapScriptName(NETWORK),
    );

    await sendBitcoin({
      address,
      amount: "0.0001",
      rpcwallet: RPC_WALLET,
    });

    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: generationAddress,
    });

    const { txid, vout, amount } = await waitForFunding(
      address,
      NETWORK,
      Number(bitcoinToSats("0.0001")),
    );

    const txData = Tx.create({
      vin: [
        {
          txid,
          vout,
          prevout: {
            value: amount,
            scriptPubKey: ["OP_1", tweakedPubKey],
          },
        },
      ],
      vout: [
        {
          value: amount - 500,
          scriptPubKey: Address.toScriptPubKey(inscriptionAddress),
        },
      ],
    });

    const sig = Signer.taproot.sign(secKey, txData, 0, {
      extension: tapLeaf,
    });

    txData.vin[0].witness = [sig.hex, script, cblock];

    const txHex = Tx.encode(txData).hex;

    const spendTxId = await sendRawTransaction({
      txhex: txHex,
    });

    console.log(`TxID: ${spendTxId}`);
  });

  it("Can refund", async () => {
    const { inscriptionAddress } = generateInscriptionAddress("regtest");

    const testContent = Buffer.from("Hello, world!", "utf-8");
    const inscriptions = [
      {
        content: testContent,
        mimeType: "text/plain",
        metadata: { name: "Test Inscription" },
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
    const { txid, vout, amount, scriptPubKey } = await waitForFunding(
      genesisResponse.fundingAddress,
      NETWORK,
      Number(bitcoinToSats(genesisResponse.amount)),
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
    const refundTxHex = Tx.encode(refundTx).hex;
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

  it("can inscribe in-memory", async () => {
    // Step 2: Use shared keys for the inscription
    const { inscriptionAddress } = generateInscriptionAddress();
    const privKey = generatePrivKey();

    // Step 3: Create a test inscription content
    const testContent = Buffer.from("Hello, world!", "utf-8");
    const inscriptions = [
      {
        content: testContent,
        mimeType: "text/plain",
        metadata: { name: "Test Inscription" },
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
      NETWORK,
      Number(bitcoinToSats(genesisResponse.amount)),
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

  it("should perform a complete inscription flow end-to-end using dynamoDB and S3", async () => {
    // Step 1: Set up DAOs
    const fundingDao = createDynamoDbFundingDao();
    const s3Dao = createStorageFundingDocDao({
      bucketName: "test-bucket",
    });

    // Step 2: Use shared keys for the inscription
    const { inscriptionAddress } = generateInscriptionAddress();

    const privKey = generatePrivKey();

    // Step 3: Create a test inscription content
    const testContent = Buffer.from("Hello, world!", "utf-8");
    const inscriptions = [
      {
        content: testContent,
        mimeType: "text/plain",
        metadata: { name: "Test Inscription" },
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

    // Step 5: Create a funding record in DynamoDB
    const fundingId = ("test-funding-" + Date.now()) as ID_AddressInscription;
    await fundingDao.createFunding({
      id: fundingId,
      address: genesisResponse.fundingAddress,
      destinationAddress: inscriptionAddress,
      fundingAmountBtc: genesisResponse.amount,
      fundingAmountSat: Number(bitcoinToSats(genesisResponse.amount)),
      createdAt: new Date(),
      fundingStatus: "funding",
      network: NETWORK,
      timesChecked: 0,
      sizeEstimate: genesisResponse.totalFee + genesisResponse.overhead,
      type: "address-inscription",
      meta: {},
    });

    // Step 6: Save the inscription transaction to S3
    await s3Dao.updateOrSaveInscriptionTransaction(
      {
        id: fundingId,
        network: NETWORK,
        fundingAddress: genesisResponse.fundingAddress,
        fundingAmountBtc: genesisResponse.amount,
        genesisTapKey: genesisResponse.genesisTapKey,
        genesisLeaf: genesisResponse.genesisLeaf,
        genesisCBlock: genesisResponse.genesisCBlock,
        genesisScript: genesisResponse.genesisScript,
        refundTapKey: genesisResponse.refundTapKey,
        refundLeaf: genesisResponse.refundLeaf,
        refundCBlock: genesisResponse.refundCBlock,
        rootTapKey: genesisResponse.rootTapKey,
        refundScript: genesisResponse.refundScript,
        secKey: Buffer.from(genesisResponse.secKey).toString("hex"),
        totalFee: genesisResponse.totalFee,
        overhead: genesisResponse.overhead,
        padding: genesisResponse.padding,
        writableInscriptions: genesisResponse.inscriptionsToWrite,
        tip: TIP_AMOUNT,
        tipAmountDestination: TIP_DESTINATION.inscriptionAddress,
      },
      {
        skipEncryption: true, // Skip encryption for testing
      },
    );

    // Step 7: Save the inscription content to S3
    for (let i = 0; i < genesisResponse.inscriptionsToWrite.length; i++) {
      const inscription = genesisResponse.inscriptionsToWrite[i];
      await s3Dao.saveInscriptionContent({
        id: {
          fundingAddress: genesisResponse.fundingAddress,
          id: fundingId,
          inscriptionIndex: inscription.pointerIndex ?? 0,
        },
        content: inscription.file.content,
        mimetype: inscription.file.mimetype,
        metadata: inscription.file.metadata,
      });
    }

    // Step 8: Actually fund the transaction using bitcoin-cli
    const fundingResult = await sendBitcoin({
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
      "regtest",
      Number(bitcoinToSats(genesisResponse.amount)),
    );

    // Get the funded inscription transaction from S3
    const fundedInscriptionTx = await s3Dao.getInscriptionTransaction({
      fundingAddress: genesisResponse.fundingAddress,
      id: fundingId,
      skipDecryption: true,
    });
    if (!fundedInscriptionTx) {
      throw new Error("Failed to get funded inscription transaction");
    }

    // Add validation after retrieving from S3
    if (
      !fundedInscriptionTx.genesisLeaf ||
      !fundedInscriptionTx.genesisTapKey ||
      !fundedInscriptionTx.genesisCBlock
    ) {
      throw new Error("Missing required transaction data from S3");
    }

    // Update the funding status
    await fundingDao.addressFunded({
      id: fundingId,
      fundingTxid: txid,
      fundingVout: vout,
    });

    // Generate the reveal transaction
    const revealTx = generateRevealTransaction({
      inputs: [
        {
          leaf: fundedInscriptionTx.genesisLeaf,
          tapkey: fundedInscriptionTx.genesisTapKey,
          cblock: fundedInscriptionTx.genesisCBlock,
          rootTapKey: fundedInscriptionTx.rootTapKey,
          script: fundedInscriptionTx.genesisScript,
          vout,
          txid,
          amount,
          secKey: Buffer.from(fundedInscriptionTx.secKey, "hex"),
          padding: fundedInscriptionTx.padding,
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

    // Generate another block to confirm the reveal transaction
    await generateBlock({
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress,
    });

    // Update the funding status to "revealed"
    await fundingDao.revealFunded({
      id: fundingId,
      revealTxid: revealTxId,
    });

    // Verify the funding record was updated correctly
    const updatedFunding = await fundingDao.getFunding(fundingId);
    expect(updatedFunding).toBeDefined();
    expect(updatedFunding?.fundingStatus).toBe("revealed");
    // expect(updatedFunding?.revealTxid).toBe(revealTxId);
  }, 60000);

  it("Group transactions", async () => {
    // Step 1: Set up DAOs
    const fundingDao = createDynamoDbFundingDao();
    const s3Dao = createStorageFundingDocDao({
      bucketName: "test-bucket",
    });

    const { inscriptionAddress } = generateInscriptionAddress();
    const privKey = generatePrivKey();
    const testContent = Buffer.from("Hello, world!", "utf-8");
    const inscriptions = [
      {
        content: testContent,
        mimeType: "text/plain",
        metadata: { name: "Test Inscription" },
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

    // Step 5: Create a funding record in DynamoDB
    const fundingId = toAddressInscriptionId(
      hashAddress(genesisResponse.fundingAddress),
    );
    await fundingDao.createFunding({
      id: fundingId,
      address: genesisResponse.fundingAddress,
      destinationAddress: inscriptionAddress,
      fundingAmountBtc: genesisResponse.amount,
      fundingAmountSat: Number(bitcoinToSats(genesisResponse.amount)),
      createdAt: new Date(),
      fundingStatus: "funding",
      network: NETWORK,
      timesChecked: 0,
      sizeEstimate: genesisResponse.totalFee + genesisResponse.overhead,
      type: "address-inscription",
      meta: {},
    });

    // Step 6: Save the inscription transaction to S3
    await s3Dao.updateOrSaveInscriptionTransaction(
      {
        id: fundingId,
        network: NETWORK,
        fundingAddress: genesisResponse.fundingAddress,
        fundingAmountBtc: genesisResponse.amount,
        genesisTapKey: genesisResponse.genesisTapKey,
        genesisLeaf: genesisResponse.genesisLeaf,
        genesisCBlock: genesisResponse.genesisCBlock,
        genesisScript: genesisResponse.genesisScript,
        refundTapKey: genesisResponse.refundTapKey,
        refundLeaf: genesisResponse.refundLeaf,
        refundCBlock: genesisResponse.refundCBlock,
        rootTapKey: genesisResponse.rootTapKey,
        refundScript: genesisResponse.refundScript,
        secKey: Buffer.from(genesisResponse.secKey).toString("hex"),
        totalFee: genesisResponse.totalFee,
        overhead: genesisResponse.overhead,
        padding: genesisResponse.padding,
        writableInscriptions: genesisResponse.inscriptionsToWrite,
        tip: TIP_AMOUNT,
        tipAmountDestination: TIP_DESTINATION.inscriptionAddress,
      },
      {
        skipEncryption: true, // Skip encryption for testing
      },
    );

    // Step 7: Save the inscription content to S3
    for (let i = 0; i < genesisResponse.inscriptionsToWrite.length; i++) {
      const inscription = genesisResponse.inscriptionsToWrite[i];
      await s3Dao.saveInscriptionContent({
        id: {
          fundingAddress: genesisResponse.fundingAddress,
          id: fundingId,
          inscriptionIndex: inscription.pointerIndex ?? 0,
        },
        content: inscription.file.content,
        mimetype: inscription.file.mimetype,
        metadata: inscription.file.metadata,
      });
    }

    // Step 8: Actually fund the transaction using bitcoin-cli
    const fundingResult = await sendBitcoin({
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
      "regtest",
      Number(bitcoinToSats(genesisResponse.amount)),
    );

    // Get the funded inscription transaction from S3
    const fundedInscriptionTx = await s3Dao.getInscriptionTransaction({
      fundingAddress: genesisResponse.fundingAddress,
      id: fundingId,
      skipDecryption: true,
    });
    if (!fundedInscriptionTx) {
      throw new Error("Failed to get funded inscription transaction");
    }

    // Add validation after retrieving from S3
    if (
      !fundedInscriptionTx.genesisLeaf ||
      !fundedInscriptionTx.genesisTapKey ||
      !fundedInscriptionTx.genesisCBlock
    ) {
      throw new Error("Missing required transaction data from S3");
    }

    // Update the funding status
    await fundingDao.addressFunded({
      id: fundingId,
      fundingTxid: txid,
      fundingVout: vout,
    });

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const groupingResult = groupFundings(
      [
        {
          id: fundingId,
          fundedAt: thirtyMinutesAgo,
          sizeEstimate: genesisResponse.totalFee + genesisResponse.overhead,
          input: {
            amount: Number(bitcoinToSats(genesisResponse.amount)),
            leaf: fundedInscriptionTx.genesisLeaf,
            tapkey: fundedInscriptionTx.genesisTapKey,
            cblock: fundedInscriptionTx.genesisCBlock,
            padding: fundedInscriptionTx.padding,
            script: fundedInscriptionTx.genesisScript,
            secKey: Buffer.from(fundedInscriptionTx.secKey, "hex"),
            rootTapKey: fundedInscriptionTx.rootTapKey,
            inscriptions: fundedInscriptionTx.writableInscriptions,
            txid,
            vout,
          },
          ...(fundedInscriptionTx.tipAmountDestination &&
          fundedInscriptionTx.tip
            ? {
                feeDestinations: [
                  {
                    address: fundedInscriptionTx.tipAmountDestination,
                    weight: 100,
                  },
                ],
                feeTarget: fundedInscriptionTx.tip,
              }
            : {
                feeDestinations: [],
              }),
        },
      ],
      [20, 1],
    );

    expect(groupingResult.rejectedFundings).toHaveLength(0);
    expect(Object.values(groupingResult.feeDestinationGroups)).toHaveLength(1);
  }, 60000);
});
