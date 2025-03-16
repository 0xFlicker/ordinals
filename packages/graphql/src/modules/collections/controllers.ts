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
  DISALLOWED_META_KEYS,
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
  fileName,
  contentType,
  context,
  metadata,
}: {
  fileName: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  logger.info(
    { uploadBucket, fileName, contentType, metadata },
    "Getting S3 upload url",
  );
  const command = new PutObjectCommand({
    Bucket: uploadBucket,
    Key: fileName,
    ContentType: contentType,
    ...(metadata ? { Metadata: metadata } : {}),
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return signedUrl;
}

export async function getSignedMultipartUploadUrl({
  fileName,
  multipartUploadId,
  partNumber,
  context,
}: {
  fileName: string;
  multipartUploadId: string;
  partNumber: number;
  context: IAwsContext & IConfigContext;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new UploadPartCommand({
    Bucket: uploadBucket,
    Key: fileName,
    PartNumber: partNumber,
    UploadId: multipartUploadId,
  });
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
  return signedUrl;
}

export async function getMultiPartUploadID({
  fileName,
  contentType,
  context,
  metadata,
}: {
  fileName: string;
  contentType: string;
  context: IAwsContext & IConfigContext;
  metadata?: Record<string, string>;
}) {
  const { s3Client, uploadBucket } = context;
  const command = new CreateMultipartUploadCommand({
    Bucket: uploadBucket,
    Key: fileName,
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
        fileName: model.meta.parentInscriptionFileName,
        contentType: model.meta.parentInscriptionContentType,
        context,
        metadata: {
          "collection-id": id,
        },
      }),
      getMultiPartUploadID({
        fileName: model.meta.parentInscriptionFileName,
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
      uploadUrl,
      multipartUploadId,
    };
  }
  return new CollectionModel(model, parentInscription);
}

export async function updateCollectionParentInscription({
  parentInscriptionFileName,
  parentInscriptionSecKeyEnvelopeKeyId,
  fundingSecKeyEnvelopeKeyId,
  s3Client,
  uploadBucketName,
  inscriptionBucketName,
  bitcoinNetwork,
  tipDestination,
  kmsClient,
}: {
  parentInscriptionFileName: string;
  parentInscriptionSecKeyEnvelopeKeyId: string;
  fundingSecKeyEnvelopeKeyId: string;
  s3Client: S3Client;
  kmsClient: KMSClient;
  uploadBucketName: string;
  inscriptionBucketName: string;
  bitcoinNetwork: BitcoinNetworkNames;
  tipDestination: string;
}) {
  const response = await s3Client.send(
    new HeadObjectCommand({
      Bucket: uploadBucketName,
      Key: parentInscriptionFileName,
    }),
  );
  const { "collection-id": collectionId, "content-type": contentType } =
    response.Metadata ?? {};
  if (!collectionId) {
    logger.info("No collection id found in metadata");
    return;
  }
  const fundingDao = createDynamoDbFundingDao<
    {
      parentInscriptionTxid?: string;
      parentInscriptionVout?: number;
      parentInscriptionSecKey: string;
    },
    TCollectionModel<TCollectionParentInscription>
  >();
  const fundingDocDao = createStorageFundingDocDao({
    bucketName: inscriptionBucketName,
    s3Client,
  });
  const {
    parentInscriptionAddress,
    id: parentInscriptionAddressId,
    fundingAddress,
    fundingAmountBtc,
    document,
  } = await updateCollectionFunding({
    collectionId: toCollectionId(collectionId),
    fundingSecKeyEnvelopeKeyId,
    parentInscriptionSecKeyEnvelopeKeyId,
    parentInscriptionFileName,
    parentInscriptionContentType: contentType,
    network: bitcoinNetwork,
    uploadBucket: uploadBucketName,
    s3Client,
    fundingDocDao,
    fundingDao,
    feeClient: createMempoolBitcoinClient({
      network: bitcoinNetwork,
    }).fees,
    tipDestination,
    kmsClient,
  });
  const collectionFundingDao = createDynamoDbFundingDao<
    {
      parentInscriptionTxid?: string;
      parentInscriptionVout?: number;
      parentInscriptionSecKey: string;
    },
    {
      parentInscriptionId?: string;
      parentInscriptionAddress: string;
      parentInscriptionContentExists: boolean;
      parentInscriptionAddressId: string;
    }
  >();
  await collectionFundingDao.updateCollectionMeta(
    toCollectionId(collectionId),
    {
      parentInscriptionContentExists: true,
      parentInscriptionAddress,
      parentInscriptionAddressId,
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
  maxSupply,
  meta,
  parentInscription,
  context,
}: {
  name: string;
  maxSupply?: InputMaybe<number>;
  meta?: InputMaybe<string>;
  parentInscription?: InputMaybe<{
    parentInscriptionId?: InputMaybe<string>;
    parentInscriptionFileName?: InputMaybe<string>;
    parentInscriptionContentType?: InputMaybe<string>;
  }>;
  context: DbContext & IAwsContext & IConfigContext;
}) {
  const { fundingDao } = context;

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

  for (const key of Object.keys(metadata)) {
    if (DISALLOWED_META_KEYS.includes(key)) {
      throw new CollectionError("INVALID_METADATA", `Reserved key: ${key}`);
    }
    if (typeof metadata[key] !== "string") {
      throw new CollectionError(
        "INVALID_METADATA",
        `key: ${key} is not a string`,
      );
    }
  }

  const {
    parentInscriptionId,
    parentInscriptionFileName: inputParentInscriptionFileName,
    parentInscriptionContentType,
  } = parentInscription ?? {};

  const id = toCollectionId(uuid());
  const parentInscriptionFileName = `${id}/${inputParentInscriptionFileName?.replace(
    /(^\.\.|\/.\.)/g,
    "",
  )}`;

  const model: TCollectionModel<{
    parentInscriptionId?: string;
    parentInscriptionFileName?: string;
    parentInscriptionContentType?: string;
  }> = {
    id,
    name,
    totalCount: 0,
    pendingCount: 0,
    type: "collection",
    meta: {
      ...metadata,
      ...(parentInscriptionId ? { parentInscriptionId } : {}),
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
        fileName: parentInscriptionFileName,
        contentType: parentInscriptionContentType,
        context,
        metadata: { "collection-id": id },
      }),
      getMultiPartUploadID({
        fileName: parentInscriptionFileName,
        contentType: parentInscriptionContentType,
        context,
        metadata: { "collection-id": id },
      }),
    ]);

    modelParentInscription = {
      ...(parentInscriptionId ? { parentInscriptionId } : {}),
      ...(parentInscriptionFileName ? { parentInscriptionFileName } : {}),
      ...(parentInscriptionContentType ? { parentInscriptionContentType } : {}),
      uploadUrl,
      multipartUploadId,
    };
  }

  await fundingDao.createCollection(model);
  return new CollectionModel(model, modelParentInscription);
}
