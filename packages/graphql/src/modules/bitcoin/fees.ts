import { FeeLevel, InputMaybe } from "../../generated-types/graphql.js";
import { toFeeLevel } from "./transforms.js";
import { getFeeEstimates } from "@0xflick/ordinals-backend";
import { BitcoinNetworkNames } from "@0xflick/ordinals-models";

export async function estimateFeesWithMempool({
  network,
  feePerByte,
  feeLevel,
}: {
  network: BitcoinNetworkNames;
  feePerByte?: InputMaybe<number>;
  feeLevel?: InputMaybe<FeeLevel>;
}): Promise<number> {
  let finalFee: number;
  if (feePerByte) {
    finalFee = feePerByte;
  } else if (feeLevel) {
    const feeEstimate = await getFeeEstimates(network);
    if (!feeEstimate.problems && feeEstimate.fees) {
      finalFee = toFeeLevel(feeLevel, feeEstimate.fees);
    } else {
      throw new Error(`Failed to get fee estimates for network: ${network}`);
    }
  } else {
    const feeEstimate = await getFeeEstimates(network);
    if (!feeEstimate.problems && feeEstimate.fees) {
      finalFee = toFeeLevel("MEDIUM", feeEstimate.fees);
    } else {
      throw new Error(`Failed to get fee estimates for network: ${network}`);
    }
  }
  return finalFee;
}
