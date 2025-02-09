import { v4 as uuid } from "uuid";
import { CollectionsModule } from "./generated-types/module-types.js";
import { CollectionError } from "./errors.js";
import {
  ID_Collection,
  TCollectionModel,
  TCollectionParentInscription,
  toCollectionId,
} from "@0xflick/ordinals-models";
import { CollectionModel } from "./models.js";
import { verifyAuthorizedUser } from "../auth/controller.js";
import {
  EActions,
  EResource,
  TAllowedAction,
  createMatcher,
  defaultAdminStrategyAll,
  isActionOnResource,
} from "@0xflick/ordinals-rbac-models";
import { DISALLOWED_META_KEYS } from "@0xflick/ordinals-backend";
import { createLogger } from "@0xflick/ordinals-backend";
import {
  getCollectionWithParentInscription,
  getMultiPartUploadID,
  getS3UploadUrl,
  getSignedMultipartUploadUrl,
  updateCollectionParentInscription,
} from "./controllers.js";
import { startS3Polling } from "./poll.js";
import ordinals from "@0xflick/ordinals-config";
import { toBitcoinNetworkName } from "../bitcoin/transforms.js";

const deployment = ordinals.deployment.name;

const logger = createLogger({ name: "graphql/collections" });

// Everyone can create a collection (for now)
const canPerformCreateCollection = () => true;
// defaultAdminStrategyAll(
//   EResource.COLLECTION,
//   isActionOnResource({
//     action: EActions.CREATE,
//     resource: EResource.COLLECTION,
//   }),
// );
const canPerformUpdateCollection = defaultAdminStrategyAll(
  EResource.COLLECTION,
  isActionOnResource({
    action: EActions.UPDATE,
    resource: EResource.COLLECTION,
  }),
);
const canPerformDeleteCollection = defaultAdminStrategyAll(
  EResource.COLLECTION,
  isActionOnResource({
    action: EActions.DELETE,
    resource: EResource.COLLECTION,
  }),
);
export const resolvers: CollectionsModule.Resolvers = {
  Mutation: {
    createCollection: async (
      _parent,
      { input: { name, maxSupply, meta, parentInscription } },
      context,
      info,
    ) => {
      const { fundingDao, requireMutation, userRolesDao } = context;
      requireMutation(info);

      await verifyAuthorizedUser(context, canPerformCreateCollection);

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
        throw new CollectionError(
          "INVALID_METADATA",
          "Unable to parse metadata",
        );
      }

      for (const key of Object.keys(metadata)) {
        // disallow reservered names for metadata
        if (DISALLOWED_META_KEYS.includes(key)) {
          throw new CollectionError("INVALID_METADATA", `Reserved key: ${key}`);
        }
        // only strings are allowed for metadata
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
      // remove any leading or trailing dots
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
        maxSupply,
        pendingCount: 0,
        type: "collection",
        meta: {
          ...metadata,
          ...(parentInscriptionId ? { parentInscriptionId } : {}),
          ...(parentInscriptionFileName ? { parentInscriptionFileName } : {}),
          ...(parentInscriptionContentType
            ? { parentInscriptionContentType }
            : {}),
        },
      };
      let modelParentInscription: TCollectionParentInscription | undefined;

      // If the user is requesting a parent inscription and not providing a parent inscription id, we need to create a new S3 upload url
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
            metadata: {
              "collection-id": id,
            },
          }),
          getMultiPartUploadID({
            fileName: parentInscriptionFileName,
            contentType: parentInscriptionContentType,
            context,
            metadata: {
              "collection-id": id,
            },
          }),
        ]);
        modelParentInscription = {
          ...(parentInscriptionId ? { parentInscriptionId } : {}),
          ...(parentInscriptionFileName ? { parentInscriptionFileName } : {}),
          ...(parentInscriptionContentType
            ? { parentInscriptionContentType }
            : {}),
          uploadUrl,
          multipartUploadId,
        };
      }
      await fundingDao.createCollection(model);
      return new CollectionModel(model, modelParentInscription);
    },
    deleteCollection: async (_parent, { id }, context, info) => {
      const { fundingDao, requireMutation } = context;
      await verifyAuthorizedUser(context, canPerformDeleteCollection);
      requireMutation(info);
      await fundingDao.deleteCollection(id as ID_Collection);
      return true;
    },
    collection: async (_parent, { id }, context) => {
      return getCollectionWithParentInscription(toCollectionId(id), context);
    },
    createCollectionParentInscription: async (
      _parent,
      { collectionId, bitcoinNetwork },
      {
        uploadBucket,
        typedFundingDao,
        s3Client,
        inscriptionBucket,
        defaultTipDestination,
      },
    ) => {
      const fundingDao = typedFundingDao<
        {},
        { parentInscriptionFileName?: string }
      >();
      const collection = await fundingDao.getCollection(
        toCollectionId(collectionId),
      );
      if (!collection) {
        throw new CollectionError("COLLECTION_NOT_FOUND", collectionId);
      }
      const { parentInscriptionFileName } = collection.meta ?? {};
      if (!parentInscriptionFileName) {
        throw new CollectionError(
          "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND",
          collectionId,
        );
      }
      const inscriptionFunding = await updateCollectionParentInscription({
        parentInscriptionFileName,
        s3Client,
        uploadBucketName: uploadBucket,
        inscriptionBucketName: inscriptionBucket,
        bitcoinNetwork: toBitcoinNetworkName(bitcoinNetwork),
        tipDestination: defaultTipDestination,
      });
      if (!inscriptionFunding) {
        throw new CollectionError(
          "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND",
          collectionId,
        );
      }
      return inscriptionFunding;
    },
  },
  Query: {
    collections: async (_parent, _args, context) => {
      const { fundingDao } = context;
      const models = await fundingDao.getAllCollections();
      return models.map((model) => new CollectionModel(model));
    },
    collection: async (_parent, { id }, context) => {
      return getCollectionWithParentInscription(toCollectionId(id), context);
    },
    signMultipartUpload: async (
      _parent,
      { multipartUploadId, partNumber, fileName },
      context,
    ) => {
      return getSignedMultipartUploadUrl({
        fileName,
        multipartUploadId,
        partNumber,
        context,
      });
    },
  },
  Collection: {
    metadata: (parent) => {
      return Object.entries(parent.meta).map(([key, value]) => ({
        key,
        value: value.toString(),
      }));
    },
    updateMetadata: async (parent, { metadata }, context, info) => {
      const { fundingDao, requireMutation } = context;
      requireMutation(info);
      await verifyAuthorizedUser(context, canPerformUpdateCollection);
      const model = await fundingDao.updateCollectionMeta(
        parent.id,
        metadata.reduce(
          (acc, { key, value }) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, any>,
        ),
      );
      return new CollectionModel(model);
    },
  },
};
