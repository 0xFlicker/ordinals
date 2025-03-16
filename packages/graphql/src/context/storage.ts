import {
  FundingDocDao,
  createStorageFundingDocDao,
} from "@0xflick/ordinals-backend";
import { IAwsContext } from "./aws.js";
import { IConfigContext } from "./config.js";

export interface IStorageContext {
  fundingDocDao: FundingDocDao;
}

export function createStorageContext({
  s3Client,
  kmsClient,
  inscriptionBucket,
}: IAwsContext & IConfigContext): IStorageContext {
  const fundingDocDao = createStorageFundingDocDao({
    s3Client,
    bucketName: inscriptionBucket,
    kmsClient,
  });
  return {
    fundingDocDao,
  };
}
