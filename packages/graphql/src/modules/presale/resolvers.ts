import { generatePrivKey, satsToBitcoin } from "@0xflick/inscriptions";
import { PresaleModule } from "./generated-types/module-types.js";
import { validateFrameMessage } from "@0xflick/ordinals-backend/src/frame/validate.js";
import {
  ID_Collection,
  ID_Presale,
  IPresaleModel,
} from "@0xflick/ordinals-models";
import { createLogger } from "@0xflick/ordinals-backend";
import {
  toBitcoinNetworkName,
  toGraphqlBitcoinNetworkName,
} from "../bitcoin/transforms.js";
import { toGraphqlPresaleStatus } from "../axolotl/transforms.js";
import { Address } from "@cmdcode/tapscript";
import { BitcoinNetwork } from "../../generated-types/graphql.js";

interface IPresaleCollectionMeta {
  maxPresaleCount?: string;
  presaleCostSat: string;
  tipAmountSat: string;
  tipDestinationAddress: string;
}

const logger = createLogger({ name: "presale" });

function verifyAddress(
  address: string,
  network: BitcoinNetwork,
): { code: string; message: string }[] {
  const problems: {
    code: string;
    message: string;
  }[] = [];
  try {
    const a = Address.decode(address);
    if (a.type !== "p2tr") {
      problems.push({
        code: "invalid-address",
        message: "Invalid address",
      });
    }

    if (
      (network === "MAINNET" && a.network !== "main") ||
      (network === "TESTNET" && a.network !== "testnet") ||
      (network === "REGTEST" && a.network !== "regtest")
    ) {
      problems.push({
        code: "invalid-network",
        message: `Invalid network ${a.network}`,
      });
    }
  } catch (e) {
    problems.push({
      code: "invalid-address",
      message: "Invalid address",
    });
  }
  return problems;
}

export const resolvers: PresaleModule.Resolvers = {
  Query: {
    presale: async (_, { id }, { typedFundingDao }) => {
      const fundingDao = typedFundingDao<{}, IPresaleCollectionMeta>();
      const presale = await fundingDao.getPresale(id as ID_Presale);
      return {
        data: {
          destinationAddress: presale.destinationAddress,
          fundingAddress: presale.address,
          fundingAmountBtc: satsToBitcoin(BigInt(presale.fundingAmountSat)),
          fundingAmountSats: presale.fundingAmountSat,
          id: presale.id,
          network: toGraphqlBitcoinNetworkName(presale.network),
          status: toGraphqlPresaleStatus(presale.fundingStatus),
        },
      };
    },
  },
  Mutation: {
    // presale: async (
    //   _,
    //   {
    //     request: {
    //       count,
    //       collectionId,
    //       destinationAddress,
    //       farcasterVerifiedPayload,
    //       farcasterFid,
    //       feeRate,
    //       network,
    //     },
    //   },
    //   { typedFundingDao, createMempoolBitcoinClient },
    // ) => {
    //   // Get the collection to verify that it exists and read config
    //   const fundingDao = typedFundingDao<{}, IPresaleCollectionMeta>();
    //   const collection = await fundingDao.getCollection(
    //     collectionId as ID_Collection,
    //   );
    //   const problems = verifyAddress(destinationAddress, network);
    //   if (!collection) {
    //     problems.push({
    //       code: "collection-not-found",
    //       message: `Collection not found with ID ${collectionId}`,
    //     });
    //   }
    //   if (farcasterFid && farcasterVerifiedPayload) {
    //     const response = await validateFrameMessage(farcasterVerifiedPayload);
    //     if (response.valid === false) {
    //       problems.push({
    //         code: "farcaster-verification",
    //         message: "Farcaster verification failed",
    //       });
    //     }
    //     if (response.message.data.fid !== farcasterFid) {
    //       problems.push({
    //         code: "farcaster-verification",
    //         message: "Farcaster FID does not match",
    //       });
    //     }
    //   }
    //   let amount = 0;
    //   const {
    //     tipAmountSat: tipAmountSatStr,
    //     tipDestinationAddress,
    //     presaleCostSat: presaleCostSatStr,
    //     maxPresaleCount: maxPresaleCountStr,
    //   } = collection?.meta || {};
    //   if (!presaleCostSatStr) {
    //     problems.push({
    //       code: "collection-meta-missing",
    //       message: "Collection meta is missing",
    //     });
    //   }
    //   if (count <= 0) {
    //     problems.push({
    //       code: "invalid-count",
    //       message: "Count must be greater than 0",
    //     });
    //   }
    //   const maxPresaleCount = Number(maxPresaleCountStr);
    //   if (maxPresaleCountStr && count > maxPresaleCount) {
    //     problems.push({
    //       code: "max-presale-count-exceeded",
    //       message: "Max presale count exceeded",
    //     });
    //   }
    //   const presaleCostSat = Number(presaleCostSatStr);
    //   const tipAmountSat = Number(tipAmountSatStr);
    //   if (problems.length > 0) {
    //     return {
    //       problems,
    //     };
    //   }
    //   amount +=
    //     ((Number.isInteger(presaleCostSat) ? presaleCostSat : 0) +
    //       (tipAmountSat ?? 0)) *
    //     count;
    //   // Generate a new private key for the presale payment taproot
    //   const privKey = generatePrivKey();
    //   const networkName = toBitcoinNetworkName(network);
    //   const mempoolClient = createMempoolBitcoinClient({
    //     network: networkName,
    //   });
    //   let finalFeeRate: number;
    //   if (!feeRate) {
    //     const feeRecommendedResponse =
    //       await mempoolClient.fees.getFeesRecommended();
    //     finalFeeRate = feeRecommendedResponse.fastestFee;
    //   } else {
    //     finalFeeRate = feeRate;
    //   }
    //   const {
    //     amount: finalAmount,
    //     fundingAddress,
    //     tapKey,
    //   } = await generatePresaleAddress({
    //     amount,
    //     feeRate: finalFeeRate,
    //     network: networkName,
    //     privKey,
    //   });
    //   const fundingAmountBtc = satsToBitcoin(BigInt(finalAmount));
    //   const presale: IPresaleModel = {
    //     address: fundingAddress,
    //     collectionId: collectionId as ID_Collection,
    //     destinationAddress,
    //     fundingAmountBtc,
    //     fundingAmountSat: finalAmount,
    //     fundingStatus: "pending",
    //     id: tapKey as ID_Presale,
    //     network: networkName,
    //     secKey: privKey,
    //     timesChecked: 0,
    //     ...(farcasterFid && { farcasterFid }),
    //     tipAmountDestination: tipDestinationAddress,
    //     tipAmountSat,
    //   };
    //   try {
    //     await fundingDao.createPresale(presale);
    //   } catch (e) {
    //     logger.error(e);
    //     return {
    //       problems: [
    //         {
    //           code: "presale-creation-failed",
    //           message: "Failed to create presale",
    //         },
    //       ],
    //     };
    //   }
    //   return {
    //     data: {
    //       destinationAddress,
    //       fundingAddress,
    //       fundingAmountBtc,
    //       fundingAmountSats: finalAmount,
    //       id: tapKey,
    //       network,
    //       status: "PENDING",
    //     },
    //   };
    // },
  },
};
