import { v4 as uuidV4 } from "uuid";
import { InscriptionRequestModule } from "./generated-types/module-types.js";
import { InscriptionFundingModel } from "../inscriptionFunding/models.js";
import {
  InscriptionContent,
  bitcoinToSats,
  generateFundableGenesisTransaction,
  generatePrivKey,
  generateRevealTransaction,
  isValidTaprootAddress,
} from "@0xflick/inscriptions";
import { InscriptionRequestError } from "./errors.js";
import {
  TInscriptionDoc,
  hashAddress,
  toAddressInscriptionId,
  toBitcoinNetworkName,
} from "@0xflick/ordinals-models";
import { estimateFeesWithMempool } from "../bitcoin/fees.js";
import { MempoolModel } from "../../modules/bitcoin/models.js";
import {
  createInscriptionTransaction,
  encryptEnvelope,
  serializeEnvelope,
} from "@0xflick/ordinals-backend";
import {
  getMultiPartUploadID,
  getS3UploadUrl,
  getSignedMultipartUploadUrl,
} from "./controllers.js";
import { InscriptionProblem } from "../../generated-types/graphql.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "inscription-request-resolvers",
});

const resolvers: InscriptionRequestModule.Resolvers = {
  Mutation: {
    createInscriptionRequest: async (_, { input }, context, info) => {
      const {
        fundingDao,
        fundingDocDao,
        kmsClient,
        inscriptionBucket,
        s3Client,
        uploadBucket,
        createMempoolBitcoinClient,
        defaultTipDestinationForNetwork,
        inscriptionTip,
        fundingSecKeyEnvelopeKeyId,
      } = context;
      const {
        files,
        destinationAddress,
        network,
        feeLevel,
        feePerByte,
        parentInscriptionId,
      } = input;
      if (!isValidTaprootAddress(destinationAddress)) {
        throw new InscriptionRequestError("INVALID_DESTINATION_ADDRESS");
      }
      const feeRate = await estimateFeesWithMempool({
        mempoolBitcoinClient: new MempoolModel(
          createMempoolBitcoinClient({
            network: toBitcoinNetworkName(network),
          }),
        ),
        feePerByte,
        feeLevel,
      });
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
      const id = toAddressInscriptionId(
        hashAddress(inscriptionTransaction.fundingAddress),
      );
      const secKey = serializeEnvelope(
        await encryptEnvelope({
          plaintext: inscriptionTransaction.secKey,
          kmsClient,
          keyId: fundingSecKeyEnvelopeKeyId,
        }),
      );
      const doc: TInscriptionDoc = {
        id,
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
        secKey,
        totalFee: inscriptionTransaction.totalFee,
        writableInscriptions: inscriptionTransaction.writableInscriptions,
        tip: inscriptionTip,
        tipAmountDestination: tipDestination,
      };
      const inscriptionFundingModel = new InscriptionFundingModel({
        id,
        bucket: inscriptionBucket,
        document: doc,
        fundingAddress: inscriptionTransaction.fundingAddress,
        destinationAddress,
        s3Client,
      });

      await Promise.all([
        fundingDocDao.updateOrSaveInscriptionTransaction(doc, {
          skipEncryption: true,
        }),
        fundingDao.createFunding({
          address: inscriptionTransaction.fundingAddress,
          network: toBitcoinNetworkName(network),
          id,
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
          sizeEstimate: inscriptionTransaction.totalFee,
        }),
        ...inscriptionTransaction.writableInscriptions.map((f, index) =>
          fundingDocDao.saveInscriptionContent({
            id: {
              fundingAddress: inscriptionTransaction.fundingAddress,
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
        data: inscriptionFundingModel,
      };
    },
    uploadInscription: async (_, { input }, context, info) => {
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

export default resolvers;
