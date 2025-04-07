import {
  BitcoinNetworkNames,
  InscriptionContent,
  bitcoinToSats,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import {
  ID_Collection,
  TCollectionModel,
  TCollectionParentInscription,
  TInscriptionDoc,
  hashAddress,
  toAddressInscriptionId,
} from "@0xflick/ordinals-models";
import { Address, Tap } from "@0xflick/tapscript";
import {
  FundingDao,
  FundingDocDao,
  MempoolClient,
  UploadsDAO,
  createInscriptionTransaction,
} from "../index.js";
import { KeyPair, SecretKey } from "@0xflick/crypto-utils";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { encryptEnvelope, serializeEnvelope } from "../utils/enevlope.js";
import { KMSClient } from "@aws-sdk/client-kms";

function generateAddressFromKeyPair({
  secKey,
  network,
}: {
  secKey: SecretKey;
  network: BitcoinNetworkNames;
}) {
  const pubkey = secKey.pub.x;
  const [tPubKey] = Tap.getPubKey(pubkey);
  const address = Address.p2tr.encode(
    tPubKey,
    networkNamesToTapScriptName(network),
  );
  return address;
}

export async function updateCollectionFunding({
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
}: {
  parentInscriptionSecKeyEnvelopeKeyId: string;
  fundingSecKeyEnvelopeKeyId: string;
  collectionId: ID_Collection;
  parentInscriptionUploadId: string;
  parentInscriptionContentType: string;
  tipDestination: string;
  network: BitcoinNetworkNames;
  uploadBucket: string;
  metadata?: InscriptionContent["metadata"];
  feeClient: MempoolClient["bitcoin"]["fees"];
  kmsClient: KMSClient;
  s3Client: S3Client;
  uploadsDao: UploadsDAO;
  fundingDocDao: FundingDocDao;
  fundingDao: FundingDao<
    {
      parentInscriptionTxid?: string;
      parentInscriptionVout?: number;
      parentInscriptionSecKey: string;
    },
    TCollectionModel<TCollectionParentInscription>
  >;
}) {
  // Generate a new private key. This will be used to custody the parent
  const privateKey = generatePrivKey();
  const parentSecKey = new KeyPair(privateKey);
  const parentInscriptionAddress = generateAddressFromKeyPair({
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
    initCBlock,
    initLeaf,
    initScript,
    initTapKey,
    overhead,
    padding,
    secKey,
    totalFee,
    writableInscriptions,
  } = await createInscriptionTransaction({
    address: parentInscriptionAddress,
    feeRate: fastestFee,
    network,
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

  const id = toAddressInscriptionId(hashAddress(parentInscriptionAddress));

  const doc: TInscriptionDoc = {
    id,
    collectionId,
    fundingAddress,
    fundingAmountBtc,
    initCBlock,
    initLeaf,
    initScript,
    initTapKey,
    network,
    overhead,
    padding,
    secKey,
    totalFee,
    writableInscriptions,
    tip: 0,
    tipAmountDestination: tipDestination,
  };

  await Promise.all([
    fundingDocDao.updateOrSaveInscriptionTransaction(doc, {
      secKeyEnvelopeKeyId: fundingSecKeyEnvelopeKeyId,
    }),
    encryptEnvelope({
      plaintext: privateKey,
      kmsClient,
      keyId: parentInscriptionSecKeyEnvelopeKeyId,
    })
      .then(serializeEnvelope)
      .then((parentInscriptionSecKey) =>
        fundingDao.createFunding({
          address: fundingAddress,
          network,
          id,
          destinationAddress: parentInscriptionAddress,
          fundingStatus: "funding",
          timesChecked: 0,
          fundingAmountBtc,
          fundingAmountSat: Number(bitcoinToSats(fundingAmountBtc)),
          tipAmountSat: 0,
          meta: {
            parentInscriptionSecKey,
          },
          type: "address-inscription",
          createdAt: new Date(),
        }),
      ),
    ...writableInscriptions.map((f, index) =>
      fundingDocDao.saveInscriptionContent({
        id: {
          fundingAddress,
          id,
          inscriptionIndex: index,
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
