import {
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { IAwsContext } from "../../context/aws.js";
import { IConfigContext } from "../../context/config.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  BitcoinNetworkNames,
  ID_Collection,
  TCollectionModel,
  TCollectionParentInscription,
  toCollectionId,
} from "@0xflick/ordinals-models";
import { CollectionModel } from "./models.js";
import { CollectionError } from "./errors.js";
import { Context } from "../../context/index.js";
import {
  UploadsDAO,
  createDynamoDbFundingDao,
  createLogger,
  createMempoolBitcoinClient,
  createStorageFundingDocDao,
  updateCollectionFunding,
} from "@0xflick/ordinals-backend";
import { InscriptionFundingModel } from "../inscriptionFunding/models.js";
import { v4 as uuid } from "uuid";
import { DbContext } from "../../context/db.js";
import { InputMaybe } from "../../generated-types/graphql.js";
import { KMSClient } from "@aws-sdk/client-kms";

const logger = createLogger({
  name: "graphql-collections-controllers",
});

export async function getS3UploadUrl({
  key,
  contentType,
  context,
  metadata,
}: {
  key: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  logger.info(
    { uploadBucket, key, contentType, metadata },
    "Getting S3 upload url",
  );
  const command = new PutObjectCommand({
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return signedUrl;
}

export async function getSignedMultipartUploadUrl({
  key,
  multiPartUploadId,
  partNumber,
  context,
}: {
  key: string;
  multiPartUploadId: string;
  partNumber: number;
  context: IAwsContext & IConfigContext;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new UploadPartCommand({
    Bucket: uploadBucket,
    Key: key,
    PartNumber: partNumber,
    UploadId: multiPartUploadId,
  });
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
  return signedUrl;
}

export async function getMultiPartUploadID({
  key,
  contentType,
  context,
  metadata,
}: {
  key: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new CreateMultipartUploadCommand({
    Bucket: uploadBucket,
    Key: key,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  });
  const response = await s3Client.send(command);
  return response.UploadId;
}

export async function getCollectionWithParentInscription(
  id: ID_Collection,
  context: Context,
): Promise<CollectionModel> {
  const { typedFundingDao } = context;
  const collectionFundingDao = typedFundingDao<
    {},
    {
      parentInscriptionId?: string;
      parentInscriptionFileName?: string;
      parentInscriptionContentType?: string;
    }
  >();
  const model = await collectionFundingDao.getCollection(id as ID_Collection);
  if (!model) {
    throw new CollectionError("COLLECTION_NOT_FOUND", id);
  }
  // if parent inscription exists no parentInscriptionId is provided, we need to create a new S3 upload url again
  let parentInscription: TCollectionParentInscription | undefined;
  if (
    model.meta?.parentInscriptionFileName &&
    model.meta?.parentInscriptionContentType
  ) {
    const [uploadUrl, multipartUploadId] = await Promise.all([
      getS3UploadUrl({
        key: model.meta.parentInscriptionFileName,
        contentType: model.meta.parentInscriptionContentType,
        context,
        metadata: {
          "collection-id": id,
        },
      }),
      getMultiPartUploadID({
        key: model.meta.parentInscriptionFileName,
        contentType: model.meta.parentInscriptionContentType,
        context,
        metadata: {
          "collection-id": id,
        },
      }),
    ]);
    parentInscription = {
      ...(model.meta?.parentInscriptionId
        ? { parentInscriptionId: model.meta.parentInscriptionId }
        : {}),
      ...(model.meta?.parentInscriptionFileName
        ? { parentInscriptionFileName: model.meta.parentInscriptionFileName }
        : {}),
      ...(model.meta?.parentInscriptionContentType
        ? {
            parentInscriptionContentType:
              model.meta.parentInscriptionContentType,
          }
        : {}),
    };
  }
  return new CollectionModel(model, parentInscription);
}

export async function updateCollectionParentInscription({
  parentParentInscriptionId,
  parentInscriptionUploadId,
  parentInscriptionSecKeyEnvelopeKeyId,
  fundingSecKeyEnvelopeKeyId,
  parentInscriptionVout,
  parentInscriptionTxid,
  parentInscriptionAddress,
  s3Client,
  uploadBucketName,
  inscriptionBucketName,
  bitcoinNetwork,
  tipDestination,
  kmsClient,
  uploadsDao,
  tipAmountSat,
}: {
  parentParentInscriptionId?: string;
  parentInscriptionUploadId: string;
  parentInscriptionSecKeyEnvelopeKeyId: string;
  fundingSecKeyEnvelopeKeyId: string;
  parentInscriptionVout?: number;
  parentInscriptionTxid?: string;
  parentInscriptionAddress: string;
  s3Client: S3Client;
  kmsClient: KMSClient;
  uploadBucketName: string;
  inscriptionBucketName: string;
  bitcoinNetwork: BitcoinNetworkNames;
  tipDestination: string;
  uploadsDao: UploadsDAO;
  tipAmountSat: number;
}) {
  const { key } = await uploadsDao.getUpload(parentInscriptionUploadId);

  const response = await s3Client.send(
    new HeadObjectCommand({
      Bucket: uploadBucketName,
      Key: key,
    }),
  );
  const { "collection-id": collectionId, "content-type": contentType } =
    response.Metadata ?? {};
  if (!collectionId) {
    logger.info("No collection id found in metadata");
    return;
  }
  const fundingDao = createDynamoDbFundingDao<
    {},
    TCollectionParentInscription
  >();
  const fundingDocDao = createStorageFundingDocDao({
    bucketName: inscriptionBucketName,
    s3Client,
  });
  const {
    id: parentInscriptionAddressId,
    fundingAddress,
    fundingAmountBtc,
    document,
  } = await updateCollectionFunding({
    parentParentInscriptionId,
    collectionId: toCollectionId(collectionId),
    fundingSecKeyEnvelopeKeyId,
    parentInscriptionSecKeyEnvelopeKeyId,
    parentInscriptionUploadId,
    parentInscriptionContentType: contentType,
    network: bitcoinNetwork,
    uploadBucket: uploadBucketName,
    s3Client,
    uploadsDao,
    fundingDocDao,
    fundingDao,
    feeClient: createMempoolBitcoinClient({
      network: bitcoinNetwork,
    }).fees,
    tipDestination,
    kmsClient,
    parentInscriptionVout,
    parentInscriptionTxid,
    parentInscriptionAddress,
    tipAmountSat,
  });
  const collectionFundingDao = createDynamoDbFundingDao<
    {},
    TCollectionParentInscription
  >();
  await collectionFundingDao.updateCollectionMeta(
    toCollectionId(collectionId),
    {
      parentInscriptionContentExists: true,
      parentInscriptionAddress,
    },
  );
  logger.info(
    { collectionId, fundingAddress, fundingAmountBtc },
    "Updated collection meta",
  );

  const inscriptionFundingModel = new InscriptionFundingModel({
    id: parentInscriptionAddressId,
    document,
    fundingAddress,
    destinationAddress: parentInscriptionAddress,
    bucket: inscriptionBucketName,
    s3Client,
  });

  return inscriptionFundingModel;
}

export async function createCollection({
  name,
  meta,
  parentInscription,
  context,
}: {
  name: string;
  meta?: InputMaybe<string>;
  parentInscription?: InputMaybe<{
    parentInscriptionId?: InputMaybe<string>;
    parentInscriptionAddress?: InputMaybe<string>;
    parentInscriptionFileName?: InputMaybe<string>;
    parentInscriptionUploadId?: InputMaybe<string>;
    parentInscriptionContentType?: InputMaybe<string>;
  }>;
  context: DbContext & IAwsContext & IConfigContext;
}) {
  const { fundingDao, uploadsDao } = context;

  const collections = await fundingDao.getCollectionByName(name);
  if (collections.length > 0) {
    throw new CollectionError("COLLECTION_ALREADY_EXISTS", name);
  }

  let metadata: Record<string, unknown> = {};
  try {
    if (meta) {
      metadata = JSON.parse(meta);
    }
  } catch (e) {
    logger.warn({ meta }, "Unable to parse metadata");
    throw new CollectionError("INVALID_METADATA", "Unable to parse metadata");
  }

  const {
    parentInscriptionId,
    parentInscriptionUploadId,
    parentInscriptionAddress,
    parentInscriptionFileName,
    parentInscriptionContentType,
  } = parentInscription ?? {};

  const id = toCollectionId(uuid());

  if (!parentInscriptionFileName) {
    throw new CollectionError("PARENT_INSCRIPTION_FILE_NAME_REQUIRED");
  }

  if (!parentInscriptionUploadId) {
    throw new CollectionError("PARENT_INSCRIPTION_UPLOAD_ID_REQUIRED");
  }

  const uploadId = uuid();
  const multiPartUploadId = uuid();

  await uploadsDao.createUpload({
    uploadId,
    multiPartUploadId,
    fileName: parentInscriptionFileName,
  });

  const model: TCollectionModel<{
    parentInscriptionId?: string;
    parentInscriptionFileName?: string;
    parentInscriptionContentType?: string;
    parentInscriptionAddress?: string;
    parentInscriptionUploadId?: string;
  }> = {
    id,
    name,
    totalCount: 0,
    pendingCount: 0,
    type: "collection",
    meta: {
      ...metadata,
      ...(parentInscriptionId ? { parentInscriptionId } : {}),
      ...(parentInscriptionAddress ? { parentInscriptionAddress } : {}),
      ...(parentInscriptionUploadId ? { parentInscriptionUploadId } : {}),
      ...(parentInscriptionFileName ? { parentInscriptionFileName } : {}),
      ...(parentInscriptionContentType ? { parentInscriptionContentType } : {}),
    },
  };

  let modelParentInscription: TCollectionParentInscription | undefined;

  if (
    parentInscription &&
    !parentInscriptionId &&
    parentInscriptionFileName &&
    parentInscriptionContentType
  ) {
    logger.info(
      {
        fileName: parentInscriptionFileName,
        contentType: parentInscriptionContentType,
        collectionId: id,
      },
      "Creating parent inscription",
    );

    const [uploadUrl, multipartUploadId] = await Promise.all([
      getS3UploadUrl({
        key: parentInscriptionUploadId,
        contentType: parentInscriptionContentType,
        context,
        metadata: { "collection-id": id },
      }),
      getMultiPartUploadID({
        key: parentInscriptionUploadId,
        contentType: parentInscriptionContentType,
        context,
        metadata: { "collection-id": id },
      }),
    ]);

    modelParentInscription = {
      ...(parentInscriptionId ? { parentInscriptionId } : {}),
      ...(parentInscriptionUploadId ? { parentInscriptionUploadId } : {}),
      ...(parentInscriptionContentType ? { parentInscriptionContentType } : {}),
      ...(parentInscriptionAddress ? { parentInscriptionAddress } : {}),
      ...(parentInscriptionFileName ? { parentInscriptionFileName } : {}),
    };
  }

  await fundingDao.createCollection(model);
  return new CollectionModel(model, modelParentInscription);
}
