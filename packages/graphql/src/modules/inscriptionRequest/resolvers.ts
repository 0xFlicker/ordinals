import { v4 as uuidV4 } from "uuid";
import { InscriptionRequestModule } from "./generated-types/module-types.js";
import { InscriptionFundingModel } from "../inscriptionFunding/models.js";
import {
  InscriptionContent,
  bitcoinToSats,
  encodeElectrumScriptHash,
  isValidTaprootAddress,
} from "@0xflick/inscriptions";
import { InscriptionRequestError } from "./errors.js";
import {
  TInscriptionDoc,
  toBitcoinNetworkName,
} from "@0xflick/ordinals-models";
import {
  createInscriptionTransaction,
  getFeeEstimates,
} from "@0xflick/ordinals-backend";
import {
  getMultiPartUploadID,
  getS3UploadUrl,
  getSignedMultipartUploadUrl,
} from "./controllers.js";
import { InscriptionProblem } from "../../generated-types/graphql.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createLogger } from "@0xflick/ordinals-backend";
import { verifyAuthorizedUser } from "../../modules/auth/controller.js";
import { EActions, EResource } from "@0xflick/ordinals-rbac-models";

const logger = createLogger({
  name: "inscription-request-resolvers",
});

// const canUploadInscription = defaultAdminStrategyAll(
//   EResource.INSCRIPTION,
//   isActionOnResource({
//     action: EActions.UPDATE,
//     resource: EResource.INSCRIPTION,
//   }),
// );

export const resolvers: InscriptionRequestModule.Resolvers = {
  Mutation: {
    createInscriptionRequest: async (_, { input }, context, info) => {
      const {
        requireMutation,
        fundingDao,
        fundingDocDao,
        inscriptionBucket,
        s3Client,
        uploadBucket,
        defaultTipDestinationForNetwork,
        inscriptionTip,
        fundingSecKeyEnvelopeKeyId,
        rolePermissionsDao,
        rolesDao,
        userRolesDao,
      } = context;

      requireMutation(info);
      const { userId } = await verifyAuthorizedUser(context);

      const { files, destinationAddress, network, feeLevel, feePerByte } =
        input;
      if (!isValidTaprootAddress(destinationAddress)) {
        throw new InscriptionRequestError("INVALID_DESTINATION_ADDRESS");
      }
      let feeRate: number;
      if (!feePerByte && feeLevel) {
        const smartFee = await getFeeEstimates(toBitcoinNetworkName(network));
        switch (feeLevel) {
          case "GLACIAL":
            if (!smartFee.fees?.minimum) {
              throw new InscriptionRequestError("INVALID_FEE_LEVEL");
            }
            feeRate = smartFee.fees?.minimum;
            break;
          case "LOW":
            if (!smartFee.fees?.hour) {
              throw new InscriptionRequestError("INVALID_FEE_LEVEL");
            }
            feeRate = smartFee.fees?.hour;
            break;
          case "MEDIUM":
            if (!smartFee.fees?.halfHour) {
              throw new InscriptionRequestError("INVALID_FEE_LEVEL");
            }
            feeRate = smartFee.fees?.halfHour;
            break;
          case "HIGH":
            if (!smartFee.fees?.fastest) {
              throw new InscriptionRequestError("INVALID_FEE_LEVEL");
            }
            feeRate = smartFee.fees?.fastest;
            break;
          default:
            throw new InscriptionRequestError("INVALID_FEE_LEVEL");
        }
      } else if (feePerByte) {
        feeRate = feePerByte;
      } else {
        const { fees } = await getFeeEstimates(toBitcoinNetworkName(network));
        if (!fees) {
          throw new InscriptionRequestError("INVALID_FEE_LEVEL");
        }
        feeRate = fees.fastest;
      }
      const inscriptions: InscriptionContent[] = await Promise.all(
        files.map(async (file) => {
          if (file.inlineFile) {
            return {
              content: Uint8Array.from(
                Buffer.from(file.inlineFile.base64Content, "base64"),
              ).buffer,
              mimeType: file.inlineFile.contentType,
            };
          } else if (file.uploadedFile) {
            const content = await s3Client.send(
              new GetObjectCommand({
                Bucket: uploadBucket,
                Key: file.uploadedFile.id,
              }),
            );
            const byteArray = await content.Body?.transformToByteArray();
            if (!byteArray) {
              throw new InscriptionRequestError("INVALID_FILE");
            }
            const contentType = content.ContentType;
            if (!contentType) {
              throw new InscriptionRequestError("INVALID_FILE");
            }
            return {
              content: byteArray.buffer,
              mimeType: contentType,
            };
          }
          throw new InscriptionRequestError("INVALID_FILE");
        }),
      );
      const tipDestination = defaultTipDestinationForNetwork(
        toBitcoinNetworkName(network),
      );
      const inscriptionTransaction = await createInscriptionTransaction({
        address: destinationAddress,
        feeRate,
        network: toBitcoinNetworkName(network),
        tip: inscriptionTip,
        inscriptions,
        tipAmountDestination: tipDestination,
      });
      const doc: TInscriptionDoc = {
        id: inscriptionTransaction.id,
        fundingAddress: inscriptionTransaction.fundingAddress,
        fundingAmountBtc: inscriptionTransaction.fundingAmountBtc,
        genesisCBlock: inscriptionTransaction.genesisCBlock,
        genesisLeaf: inscriptionTransaction.genesisLeaf,
        genesisScript: inscriptionTransaction.genesisScript,
        genesisTapKey: inscriptionTransaction.genesisTapKey,
        network: toBitcoinNetworkName(network),
        overhead: inscriptionTransaction.overhead,
        padding: inscriptionTransaction.padding,
        refundCBlock: inscriptionTransaction.refundCBlock,
        refundLeaf: inscriptionTransaction.refundLeaf,
        refundScript: inscriptionTransaction.refundScript,
        refundTapKey: inscriptionTransaction.refundTapKey,
        rootTapKey: inscriptionTransaction.rootTapKey,
        secKey: inscriptionTransaction.secKey,
        totalFee: inscriptionTransaction.totalFee,
        writableInscriptions: inscriptionTransaction.writableInscriptions,
        tip: inscriptionTip,
        tipAmountDestination: tipDestination,
      };
      const inscriptionFundingModel = new InscriptionFundingModel({
        id: inscriptionTransaction.id,
        bucket: inscriptionBucket,
        document: doc,
        fundingAddress: inscriptionTransaction.fundingAddress,
        destinationAddress,
        s3Client,
        fundingDao,
      });

      const permission = await rolesDao.get(`I#${userId}`);

      await Promise.all([
        permission
          ? rolePermissionsDao.bind({
              roleId: permission.id,
              action: EActions.ADMIN,
              resource: EResource.INSCRIPTION,
              identifier: inscriptionTransaction.id,
            })
          : rolesDao
              .create({
                id: `I#${userId}`,
                name: "Inscriptions",
              })
              .then((permission) =>
                Promise.all([
                  rolePermissionsDao.bind({
                    roleId: permission.id,
                    action: EActions.ADMIN,
                    resource: EResource.INSCRIPTION,
                    identifier: inscriptionTransaction.id,
                  }),
                  userRolesDao.bind({
                    userId: userId,
                    roleId: permission.id,
                    rolesDao,
                  }),
                ]),
              ),
        fundingDocDao.updateOrSaveInscriptionTransaction(doc, {
          secKeyEnvelopeKeyId: fundingSecKeyEnvelopeKeyId,
        }),
        fundingDao.createFunding({
          address: inscriptionTransaction.fundingAddress,
          network: toBitcoinNetworkName(network),
          id: inscriptionTransaction.id,
          destinationAddress,
          fundingStatus: "funding",
          timesChecked: 0,
          fundingAmountBtc: inscriptionTransaction.fundingAmountBtc,
          fundingAmountSat: Number(
            bitcoinToSats(inscriptionTransaction.fundingAmountBtc),
          ),
          tipAmountSat: inscriptionTip,
          tipAmountDestination: tipDestination,
          meta: {},
          type: "address-inscription",
          createdAt: new Date(),
          // Used during transaction batching. Actual fee can differ
          sizeEstimate:
            inscriptionTransaction.totalFee + inscriptionTransaction.overhead,
          // The creator of the inscription, if it exists
          creatorUserId: userId,
          // The little-endian hash of the scriptPubKey of the funding address, used for electrum subscription
          genesisScriptHash: encodeElectrumScriptHash(
            inscriptionTransaction.fundingAddress,
          ),
        }),
        ...inscriptionTransaction.writableInscriptions.map((f, index) =>
          fundingDocDao.saveInscriptionContent({
            id: {
              fundingAddress: inscriptionTransaction.fundingAddress,
              id: inscriptionTransaction.id,
              inscriptionIndex: index,
            },
            content: f.file!.content,
            mimetype: f.file!.mimetype,
            compress: f.file!.compress,
          }),
        ),
      ]);
      return {
        data: inscriptionFundingModel,
      };
    },
    uploadInscription: async (_, { input }, context, info) => {
      logger.info({ input }, "Uploading inscription");
      const { requireMutation } = context;
      requireMutation(info);

      await verifyAuthorizedUser(context);

      logger.info("Verified authorized user");

      const { files } = input;
      let wasError = false;
      const problems: InscriptionProblem[] = [];
      try {
        const uploads = await Promise.all(
          files
            .map((file) => ({ file, id: uuidV4() }))
            .map(({ file, id }) =>
              Promise.all([
                getS3UploadUrl({
                  key: id,
                  contentType: file.contentType,
                  context,
                }),
                getMultiPartUploadID({
                  key: id,
                  contentType: file.contentType,
                  context,
                }),
              ])
                .then(([uploadUrl, multipartUploadId]) => ({
                  fileName: file.fileName,
                  contentType: file.contentType,
                  id,
                  uploadUrl,
                  multipartUploadId,
                }))
                .catch((error) => {
                  wasError = true;
                  problems.push({
                    fileName: file.fileName,
                    message: error.message,
                    code: 500,
                  });
                  return {
                    fileName: file.fileName,
                    contentType: file.contentType,
                    id,
                    uploadUrl: "",
                    multipartUploadId: "",
                  };
                }),
            ),
        );
        logger.info({ uploads, wasError }, "Got upload URLs");
        if (wasError) {
          return {
            data: null,
            problems,
          };
        }
        return {
          data: {
            files: uploads.map((upload) => ({
              id: upload.id,
              fileName: upload.fileName,
              uploadUrl: upload.uploadUrl,
              multipartUploadId: upload.multipartUploadId,
            })),
          },
        };
      } catch (error: unknown) {
        logger.error(error, "Error uploading inscription");
        if (error instanceof Error) {
          return {
            data: null,
            problems: [
              { fileName: "unknown", message: error.message, code: 500 },
            ],
          };
        }
        return {
          data: null,
          problems: [
            { fileName: "unknown", message: "unknown error", code: 500 },
          ],
        };
      }
    },
  },
  Query: {
    signMultipartUpload: async (_parent, { uploadId, partNumber }, context) => {
      const { uploadsDao } = context;
      const { key, multiPartUploadId } = await uploadsDao.getUpload(uploadId);
      return getSignedMultipartUploadUrl({
        key,
        multiPartUploadId,
        partNumber,
        context,
      });
    },
  },
};
