import {
  BitcoinNetworkNames,
  InscriptionContent,
  bitcoinToSats,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import {
  ID_Collection,
  TInscriptionDoc,
  hashAddress,
  toAddressInscriptionId,
} from "@0xflick/ordinals-models";
import { Address, Tap } from "@0xflick/tapscript";
import {
  FundingDao,
  IFundingDocDao,
  MempoolClient,
  createInscriptionTransaction,
} from "../index.js";
import { KeyPair, SecretKey } from "@0xflick/crypto-utils";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
  parentInscriptionFileName,
  parentInscriptionContentType,
  network,
  uploadBucket,
  feeClient,
  tipDestination,
  s3Client,
  metadata,
  fundingDocDao,
  fundingDao,
}: {
  collectionId: ID_Collection;
  parentInscriptionFileName: string;
  parentInscriptionContentType: string;
  tipDestination: string;
  network: BitcoinNetworkNames;
  uploadBucket: string;
  metadata?: InscriptionContent["metadata"];
  feeClient: MempoolClient["bitcoin"]["fees"];
  s3Client: S3Client;
  fundingDocDao: IFundingDocDao;
  fundingDao: FundingDao<
    {
      parentInscriptionTxid?: string;
      parentInscriptionVout?: number;
      parentInscriptionSecKey: string;
    },
    {
      collectionId: ID_Collection;
      network: BitcoinNetworkNames;
      parentInscriptionId?: string;
      parentInscriptionAddress?: string;
      parentInscriptionFileName: string;
      parentInscriptionContentType: string;
    }
  >;
}) {
  // Generate a new private key. This will be used to custody the parent
  const privateKey = generatePrivKey();
  const parentSecKey = new KeyPair(privateKey);
  const parentInscriptionAddress = generateAddressFromKeyPair({
    secKey: parentSecKey,
    network,
  });

  const [content] = await Promise.all([
    s3Client
      .send(
        new GetObjectCommand({
          Bucket: uploadBucket,
          Key: parentInscriptionFileName,
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
  });

  const id = toAddressInscriptionId(hashAddress(parentInscriptionAddress));

  const doc: TInscriptionDoc = {
    id,
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
    fundingDocDao.updateOrSaveInscriptionTransaction(doc),
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
        parentInscriptionSecKey: privateKey,
      },
      type: "address-inscription",
      createdAt: new Date(),
    }),
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
