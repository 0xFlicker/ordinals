import { S3Client } from "@aws-sdk/client-s3";
import { InscriptionFundingModel } from "./models.js";
import { FundingDao, FundingDocDao } from "@0xflick/ordinals-backend";
import { BitcoinNetworkNames } from "@0xflick/ordinals-models";

export async function getUrl({
  network,
  id,
  bitcoinRegtestMempoolEndpoint,
  bitcoinTestnetMempoolEndpoint,
  bitcoinTestnet4MempoolEndpoint,
  bitcoinMainnetMempoolEndpoint,
}: {
  network: BitcoinNetworkNames;
  id: string;
  bitcoinRegtestMempoolEndpoint: string;
  bitcoinTestnetMempoolEndpoint: string;
  bitcoinTestnet4MempoolEndpoint: string;
  bitcoinMainnetMempoolEndpoint: string;
}) {
  switch (network) {
    case "regtest":
      return `${bitcoinRegtestMempoolEndpoint}/tx/${id}`;
    case "testnet":
      return `${bitcoinTestnetMempoolEndpoint}/tx/${id}`;
    case "mainnet":
      return `${bitcoinMainnetMempoolEndpoint}/tx/${id}`;
    case "testnet4":
      return `${bitcoinTestnet4MempoolEndpoint}/tx/${id}`;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

export async function getFundingModel({
  id,
  fundingDao,
  fundingDocDao,
  inscriptionBucket,
  s3Client,
}: {
  id: string;
  fundingDao: FundingDao;
  fundingDocDao: FundingDocDao;
  inscriptionBucket: string;
  s3Client: S3Client;
}) {
  const funding = await fundingDao.getFunding(id);
  if (!funding) {
    throw new Error(`Funding not found: ${id}`);
  }
  const document = await fundingDocDao.getInscriptionTransaction({
    id,
    fundingAddress: funding.address,
  });
  return new InscriptionFundingModel({
    id,
    document,
    bucket: inscriptionBucket,
    fundingAddress: funding.address,
    destinationAddress: funding.destinationAddress,
    s3Client,
    fundingDao,
    funding,
  });
}
