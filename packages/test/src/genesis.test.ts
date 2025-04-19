import { CreateBucketCommand } from "@aws-sdk/client-s3";
import { ID_AddressInscription } from "../../models/src";
import {
  createDynamoDbFundingDao,
  createStorageFundingDocDao,
  createS3Client,
} from "@0xflick/ordinals-backend";
import {
  generateFundableGenesisTransaction,
  generateRevealTransaction,
  BitcoinNetworkNames,
  addressReceivedMoneyInThisTx,
  broadcastTx,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import { get_seckey, get_pubkey } from "@cmdcode/crypto-tools/keys";
import { Address, Tap } from "@cmdcode/tapscript";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import {
  sendBitcoin,
  generateBlock,
  createWallet,
  getNewAddress,
  loadWallet,
} from "./bitcoin";

const exec = promisify(execCallback);

const generateInscriptionAddress = (
  network: BitcoinNetworkNames = "regtest",
) => {
  const privKey = generatePrivKey();
  const secKey = get_seckey(privKey);
  const pubkey = get_pubkey(secKey);
  const [tseckey] = Tap.getSecKey(secKey);
  const [tpubkey, cblock] = Tap.getPubKey(pubkey);
  const inscriptionAddress = Address.p2tr.encode(
    tpubkey,
    networkNamesToTapScriptName(network),
  );
  return {
    privKey,
    secKey,
    pubkey,
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
      network: "regtest",
    });
    generationAddress = await getNewAddress({
      network: "regtest",
      rpcwallet: "test",
    });
    await generateBlock({
      network: "regtest",
      rpcwallet: "test",
      address: generationAddress,
      amount: 100,
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

  it("should perform a complete inscription flow end-to-end", async () => {
    // Step 0: Some constants
    const TIP_AMOUNT = 5000;
    // Generate a random tip destination address
    const TIP_DESTINATION = generateInscriptionAddress();
    const NETWORK = "regtest";
    const RPC_WALLET = "test";

    // Step 1: Set up DAOs
    const fundingDao = createDynamoDbFundingDao();
    const s3Dao = createStorageFundingDocDao({
      bucketName: "test-bucket",
    });

    // Step 2: Generate a key pair for the inscription
    const { privKey, tseckey, tpubkey, cblock, inscriptionAddress } =
      generateInscriptionAddress(NETWORK);

    console.log(`\nInscription Address:`);
    console.log(`Private key: ${privKey}`);
    console.log(`Address: ${inscriptionAddress}`);
    console.log(`TapRoot secret key: ${tseckey}`);
    console.log(`TapRoot public key: ${tpubkey}`);
    console.log(`Control block: ${cblock}`);

    // Step 3: Create a test inscription content
    const testContent = randomBytes(100); // 100 bytes of random data
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

    console.log(`\nGenesis Transaction:`);
    console.log(`Funding Address: ${genesisResponse.fundingAddress}`);
    console.log(`Amount: ${genesisResponse.amount}`);
    console.log(`Total Fee: ${genesisResponse.totalFee}`);
    console.log(`Overhead: ${genesisResponse.overhead}`);
    console.log(`Padding: ${genesisResponse.padding}`);

    // Step 5: Create a funding record in DynamoDB
    const fundingId = ("test-funding-" + Date.now()) as ID_AddressInscription;
    await fundingDao.createFunding({
      id: fundingId,
      address: genesisResponse.fundingAddress,
      destinationAddress: inscriptionAddress,
      fundingAmountBtc: genesisResponse.amount,
      fundingAmountSat: parseInt(genesisResponse.amount),
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
        secKey: Buffer.from(genesisResponse.secKey).toString("base64"),
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
    console.log(
      `\nFunding the transaction with ${genesisResponse.amount} BTC...`,
    );
    const fundingResult = await sendBitcoin({
      address: genesisResponse.fundingAddress,
      amount: genesisResponse.amount,
      network: NETWORK,
      rpcwallet: RPC_WALLET,
      fee_rate: 1,
    });

    console.log(`Funding transaction ID: ${fundingResult.txid}`);

    // Generate a new block to confirm the transaction
    console.log(`\nGenerating a new block to confirm the transaction...`);
    await generateBlock({
      network: NETWORK,
      rpcwallet: RPC_WALLET,
      address: TIP_DESTINATION.inscriptionAddress, // Use the tip destination address to receive the block reward
    });

    // Wait for the funding transaction to be confirmed
    let funded: readonly [string | null, number | null, number | null] = [
      null,
      null,
      null,
    ];
    do {
      funded = await addressReceivedMoneyInThisTx(
        inscriptionAddress,
        "regtest",
      );
      if (funded[0] === null) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (funded[0] === null);

    // Get the funded inscription transaction from S3
    const fundedInscriptionTx = await s3Dao.getInscriptionTransaction({
      fundingAddress: genesisResponse.fundingAddress,
      id: fundingId,
      skipDecryption: true,
    });
    if (!fundedInscriptionTx) {
      throw new Error("Failed to get funded inscription transaction");
    }

    // Update the funding status
    await fundingDao.addressFunded({
      id: fundingId,
      fundingTxid: funded[0] as string,
      fundingVout: funded[1] as number,
    });

    // Generate the reveal transaction
    const revealTx = await generateRevealTransaction({
      inputs: [
        {
          leaf: fundedInscriptionTx.genesisLeaf,
          tapkey: fundedInscriptionTx.genesisTapKey,
          cblock: fundedInscriptionTx.genesisCBlock,
          rootTapKey: fundedInscriptionTx.rootTapKey,
          script: fundedInscriptionTx.genesisScript,
          vout: funded[1] as number,
          txid: funded[0] as string,
          amount: funded[2] as number,
          secKey: Buffer.from(fundedInscriptionTx.secKey, "base64"),
          padding: fundedInscriptionTx.padding,
          inscriptions: [
            {
              destinationAddress: inscriptionAddress,
            },
          ],
        },
      ],
      feeRateRange: [100, 1],
    });

    console.log(`\nReveal Transaction:`);
    console.log(`Hex: ${revealTx.hex}`);
    console.log(`Miner Fee: ${revealTx.minerFee}`);
    console.log(`Platform Fee: ${revealTx.platformFee}`);

    // Step 11: Broadcast the reveal transaction
    console.log(`\nBroadcasting the reveal transaction...`);
    const revealTxId = await broadcastTx(revealTx.hex, NETWORK);
    console.log(`Reveal transaction ID: ${revealTxId}`);

    // Generate another block to confirm the reveal transaction
    console.log(
      `\nGenerating a new block to confirm the reveal transaction...`,
    );
    await generateBlock({
      network: NETWORK,
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
    expect(updatedFunding?.revealTxid).toBe(revealTxId);
  });
});
