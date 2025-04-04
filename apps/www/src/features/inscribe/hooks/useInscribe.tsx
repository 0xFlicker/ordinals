import {
  useRequestInscriptionFundingMutation,
  useRequestInscriptionUploadMutation,
} from "./inscribe.generated";
import { useCallback, useState } from "react";
import { FeeLevel, InscriptionUploadFileData } from "@/graphql/types";
import { BitcoinNetworkType } from "sats-connect";
import { fromGraphqlBitcoinNetwork, toGraphqlBitcoinNetwork } from "@/graphql/transforms";

export type PaymentRequest = {
    id: string;
    fundingAmountBtc: string;
    fundingAddress: string;
    destinationAddress: string;
    network: BitcoinNetworkType;
    qrValue: string;
    qrSrc: string;
}

export enum InscribeErrorType {
  TotalFileSizeTooLarge = "TotalFileSizeTooLarge",
}

export class InscribeError extends Error {
  constructor(message: string, public type: InscribeErrorType) {
    super(message);
    this.name = "InscribeError";
  }
}

export class InscribeErrorTotalFileSizeTooLarge extends InscribeError {
  constructor(message: string,  public size: number) {
    super(message, InscribeErrorType.TotalFileSizeTooLarge);
    this.size = size;
  }
}

export const useInscribe = ({
  destinationAddress,
  network,
  feeLevel,
  feePerByte,
  parentInscriptionId,
}:{
  
  destinationAddress?: string;
  network?: BitcoinNetworkType;
  feeLevel?: FeeLevel;
  feePerByte?: number;
  parentInscriptionId?: string;
}) => {
  const [filesToUpload, setFilesToUpload] = useState<InscriptionUploadFileData[]>([]);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);  
  const [
    requestInscriptionUpload,
    {
      loading: requestInscriptionUploadLoading,
      error: requestInscriptionUploadError,
    },
  ] = useRequestInscriptionUploadMutation();
  const [
    requestInscriptionFunding,
    {
      loading: requestInscriptionFundingLoading,
      error: requestInscriptionFundingError,
    },
  ] = useRequestInscriptionFundingMutation();


   const handleCreate = useCallback(async (files?: File[]) => {
    if (!files || files.length === 0 || !destinationAddress || !network || (!feeLevel && !feePerByte)) return;
    // Check total file size doesn't exceed 40kb
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const MAX_SIZE = 40 * 1024; // 40kb in bytes
    
    if (totalSize > MAX_SIZE) {
      throw new InscribeErrorTotalFileSizeTooLarge(`Total file size cannot exceed 40kb. Current size: ${Math.round(totalSize/1024)}kb`, totalSize);
    }
    const { data } = await requestInscriptionUpload({
      variables: {
        input: {
          files: files.map((file) => ({
            fileName: file.name,
            contentType: file.type,
          })),
        },
      },
    });
    if (data?.uploadInscription.data?.files) {
      setFilesToUpload(data.uploadInscription.data.files);
    }
    if (data?.uploadInscription.data?.files) {
      const fileIds: string[] = await Promise.all(data.uploadInscription.data.files.map(async (file, index) => {
        const originalFile = files[index];
        if (!file.uploadUrl) {
          throw new Error("Upload URL is not available");
        }
        const response = await fetch(file.uploadUrl, {
          method: "PUT",
          body: originalFile,
          headers: {
            "Content-Type": originalFile.type,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to upload file");
        }
        return file.id;
      }));

      

      requestInscriptionFunding({
        variables: {
          input: {
            destinationAddress,
            files: fileIds.map((id) => ({
              uploadedFile: {
                id
              }
            })),
            network: toGraphqlBitcoinNetwork(network),
            feeLevel,
            feePerByte,
            parentInscriptionId,
          }
        },
      }).then((response) => {
        if (!response.data?.createInscriptionRequest.data) {
          throw new Error("Failed to create parent inscription");
        }
        setPaymentRequest({
          id: response.data.createInscriptionRequest.data.id,
          fundingAmountBtc: response.data.createInscriptionRequest.data.fundingAmountBtc,
          fundingAddress: response.data.createInscriptionRequest.data.fundingAddress,
          destinationAddress,
          network: fromGraphqlBitcoinNetwork(response.data.createInscriptionRequest.data.network),
          qrValue: response.data.createInscriptionRequest.data.qrValue,
          qrSrc: response.data.createInscriptionRequest.data.qrSrc,
        });
      });
    }
  }, [requestInscriptionUpload, requestInscriptionFunding, destinationAddress, network, feeLevel, feePerByte, parentInscriptionId]);

  return {
    filesToUpload,
    paymentRequest,
    handleCreate,
    requestInscriptionUploadLoading,
    requestInscriptionUploadError,
    requestInscriptionFundingLoading,
    requestInscriptionFundingError,
  };
};
