import {
  BitcoinNetworkNames,
  InscriptionContent,
  bitcoinToSats,
  encodeElectrumScriptHash,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import {
  ID_Collection,
  TCollectionParentInscription,
  TInscriptionDoc,
} from "@0xflick/ordinals-models";
import { Address, Tap } from "@cmdcode/tapscript";
import {
  FundingDao,
  FundingDocDao,
  MempoolClient,
  UploadsDAO,
  createInscriptionTransaction,
} from "../index.js";
import { get_seckey, get_pubkey } from "@cmdcode/crypto-tools/keys";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { KMSClient } from "@aws-sdk/client-kms";

function generateAddressFromKeyPair({
  secKey,
  network,
}: {
  secKey: Uint8Array;
  network: BitcoinNetworkNames;
}) {
  const pubkey = get_pubkey(secKey);
  const [tPubKey] = Tap.getPubKey(pubkey);
  const address = Address.p2tr.encode(
    tPubKey,
    networkNamesToTapScriptName(network),
  );
  return address;
}

export async function updateCollectionFunding({
  parentParentInscriptionId,
  parentInscriptionAddress,
  collectionId,
  parentInscriptionSecKeyEnvelopeKeyId,
  fundingSecKeyEnvelopeKeyId,
  parentInscriptionUploadId,
  parentInscriptionContentType,
  network,
  uploadBucket,
  feeClient,
  tipDestination,
  kmsClient,
  s3Client,
  uploadsDao,
  metadata,
  fundingDocDao,
  fundingDao,
  parentInscriptionVout,
  parentInscriptionTxid,
  tipAmountSat,
  creatorUserId,
}: {
  parentParentInscriptionId?: string;
  parentInscriptionAddress: string;
  parentInscriptionSecKeyEnvelopeKeyId: string;
  fundingSecKeyEnvelopeKeyId: string;
  collectionId: ID_Collection;
  parentInscriptionUploadId: string;
  parentInscriptionContentType: string;
  tipDestination: string;
  network: BitcoinNetworkNames;
  uploadBucket: string;
  metadata?: InscriptionContent["metadata"];
  parentInscriptionVout?: number;
  parentInscriptionTxid?: string;
  feeClient: MempoolClient["bitcoin"]["fees"];
  kmsClient: KMSClient;
  s3Client: S3Client;
  uploadsDao: UploadsDAO;
  fundingDocDao: FundingDocDao;
  fundingDao: FundingDao<{}, TCollectionParentInscription>;
  tipAmountSat: number;
  creatorUserId?: string;
}) {
  // Generate a new private key. This will be used to custody the parent
  const privateKey = generatePrivKey();
  const parentSecKey = get_seckey(privateKey);
  parentInscriptionAddress =
    parentInscriptionAddress ??
    generateAddressFromKeyPair({
      secKey: parentSecKey,
      network,
    });

  const { key } = await uploadsDao.getUpload(parentInscriptionUploadId);

  const [content] = await Promise.all([
    s3Client
      .send(
        new GetObjectCommand({
          Bucket: uploadBucket,
          Key: key,
        }),
      )
      .then((res) => res.Body?.transformToByteArray()),
  ]);

  if (!content) {
    throw new Error("Failed to fetch parent inscription content");
  }

  const inscriptionContent: InscriptionContent = {
    content: new Uint8Array(content),
    mimeType: parentInscriptionContentType,
    metadata,
  };

  const { fastestFee } = await feeClient.getFeesRecommended();

  const {
    fundingAddress,
    fundingAmountBtc,
    overhead,
    genesisCBlock,
    genesisLeaf,
    genesisScript,
    genesisTapKey,
    refundCBlock,
    refundLeaf,
    refundScript,
    refundTapKey,
    rootTapKey,
    id,
    padding,
    secKey,
    totalFee,
    writableInscriptions,
  } = await createInscriptionTransaction({
    address: parentInscriptionAddress,
    feeRate: fastestFee,
    network,
    // FIXME
    tip: 0,
    inscriptions: [inscriptionContent],
    tipAmountDestination: tipDestination,
    // parentInscriptions: [
    //   {
    //     txid: parentInscriptionTxid,
    //     index: parentInscriptionVout,
    //   },
    // ],
  });

  const doc: TInscriptionDoc = {
    id,
    collectionId,
    fundingAddress,
    fundingAmountBtc,
    genesisCBlock,
    genesisLeaf,
    genesisScript,
    genesisTapKey,
    refundCBlock,
    refundLeaf,
    refundScript,
    refundTapKey,
    rootTapKey,
    parentInscriptionId: parentParentInscriptionId,
    network,
    overhead,
    padding,
    secKey,
    totalFee,
    writableInscriptions,
    tip: tipAmountSat,
    tipAmountDestination: tipDestination,
  };

  await Promise.all([
    fundingDocDao.updateOrSaveInscriptionTransaction(doc, {
      secKeyEnvelopeKeyId: fundingSecKeyEnvelopeKeyId,
    }),
    fundingDao.createFunding({
      address: fundingAddress,
      network,
      id,
      creatorUserId,
      destinationAddress: parentInscriptionAddress,
      fundingStatus: "funding",
      timesChecked: 0,
      fundingAmountBtc,
      fundingAmountSat: Number(bitcoinToSats(fundingAmountBtc)),
      tipAmountSat,
      meta: {},
      // Used during transaction batching. Actual fee can differ
      sizeEstimate: totalFee + overhead,
      type: "address-inscription",
      createdAt: new Date(),
      // The little-endian hash of the scriptPubKey of the funding address, used for electrum subscription
      genesisScriptHash: encodeElectrumScriptHash(fundingAddress),
    }),
    ...writableInscriptions.map((f) =>
      fundingDocDao.saveInscriptionContent({
        id: {
          fundingAddress,
          id,
          inscriptionIndex: f.pointerIndex ?? 0,
        },
        content: f.file!.content,
        mimetype: f.file!.mimetype,
        compress: f.file!.compress,
      }),
    ),
  ]);

  return {
    id,
    document: doc,
    parentInscriptionAddress,
    fundingAddress,
    fundingAmountBtc,
    fundingAmountSat: Number(bitcoinToSats(fundingAmountBtc)),
  };
}
