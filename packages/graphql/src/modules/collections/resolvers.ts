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
  defaultAdminStrategyAll,
  isActionOnResource,
} from "@0xflick/ordinals-rbac-models";
import { createLogger } from "@0xflick/ordinals-backend";
import {
  getCollectionWithParentInscription,
  getSignedMultipartUploadUrl,
  updateCollectionParentInscription,
  createCollection,
} from "./controllers.js";
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
      { input: { name, meta, parentInscription } },
      context,
      info,
    ) => {
      const { requireMutation } = context;
      requireMutation(info);
      await verifyAuthorizedUser(context, canPerformCreateCollection);

      return createCollection({
        name,
        meta,
        parentInscription,
        context,
      });
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
        defaultTipDestinationForNetwork,
        kmsClient,
        parentInscriptionSecKeyEnvelopeKeyId,
        fundingSecKeyEnvelopeKeyId,
        uploadsDao,
      },
    ) => {
      const fundingDao = typedFundingDao<{}, TCollectionParentInscription>();
      const collection = await fundingDao.getCollection(
        toCollectionId(collectionId),
      );
      if (!collection) {
        throw new CollectionError("COLLECTION_NOT_FOUND", collectionId);
      }
      const {
        parentInscriptionUploadId,
        parentInscriptionId,
        parentInscriptionAddress,
        parentInscriptionVout,
        parentInscriptionTxid,
      } = collection.meta ?? {};
      if (!parentInscriptionUploadId) {
        throw new CollectionError(
          "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND",
          collectionId,
        );
      }
      if (!collection) {
        throw new CollectionError("COLLECTION_NOT_FOUND", collectionId);
      }
      throw new Error("Not implemented");
      // const inscriptionFunding = await updateCollectionParentInscription({
      //   parentParentInscriptionId: parentInscriptionId,
      //   parentInscriptionUploadId,
      //   uploadsDao,
      //   s3Client,
      //   uploadBucketName: uploadBucket,
      //   inscriptionBucketName: inscriptionBucket,
      //   bitcoinNetwork: toBitcoinNetworkName(bitcoinNetwork),
      //   tipDestination: defaultTipDestinationForNetwork(
      //     toBitcoinNetworkName(bitcoinNetwork),
      //   ),
      //   kmsClient,
      //   fundingSecKeyEnvelopeKeyId,
      //   parentInscriptionSecKeyEnvelopeKeyId,
      //   parentInscriptionAddress,
      //   parentInscriptionVout,
      //   parentInscriptionTxid,
      // });
      // if (!inscriptionFunding) {
      //   throw new CollectionError(
      //     "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND",
      //     collectionId,
      //   );
      // }
      // return inscriptionFunding;
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
