import { v4 as uuidV4 } from "uuid";
import { InscriptionRequestModule } from "./generated-types/module-types.js";
import { InscriptionFundingModel } from "../inscriptionFunding/models.js";
import {
  InscriptionContent,
  generateFundableGenesisTransaction,
  generatePrivKey,
  generateRevealTransaction,
  isValidTaprootAddress,
} from "@0xflick/inscriptions";
import { InscriptionRequestError } from "./errors.js";
import { toBitcoinNetworkName } from "@0xflick/ordinals-models";
import { toFeeLevel } from "modules/bitcoin/transforms.js";
import { estimateFeesWithMempool } from "../bitcoin/fees.js";
import { MempoolModel } from "modules/bitcoin/models.js";
import { createInscriptionTransaction } from "@0xflick/ordinals-backend";
import { getMultiPartUploadID, getS3UploadUrl } from "./controllers.js";
import { InscriptionProblem } from "../../generated-types/graphql.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const resolvers: InscriptionRequestModule.Resolvers = {
  Mutation: {
    createInscriptionRequest: async (_, { input }, context, info) => {
      const {
        fundingDao,
        s3Client,
        uploadBucket,
        createMempoolBitcoinClient,
        defaultTipDestinationForNetwork,
        inscriptionTip,
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
      const privKey = generatePrivKey();
      const inscriptions: InscriptionContent[] = await Promise.all(
        files.map(async (file) => {
          if (file.inlineFile) {
            return {
              content: new Uint8Array(
                Buffer.from(file.inlineFile.base64Content, "base64"),
              ),
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
              content: new Uint8Array(byteArray),
              mimeType: contentType,
            };
          }
          throw new InscriptionRequestError("INVALID_FILE");
        }),
      );
      // for (const file of files) {
      //   if (file.uploadedFile) {
      //     const inscription = await uploadInscription(file.uploadedFile);
      //   }
      // }
      const tipDestination = defaultTipDestinationForNetwork(
        toBitcoinNetworkName(network),
      );
      await createInscriptionTransaction({
        address: destinationAddress,
        feeRate,
        network: toBitcoinNetworkName(network),
        tip: inscriptionTip,
        inscriptions,
        tipAmountDestination: tipDestination,
      });
      // const inscriptionRequest = await fundingDao.createFunding({
      //   address: destinationAddress,
      // });
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
};

export default resolvers;
