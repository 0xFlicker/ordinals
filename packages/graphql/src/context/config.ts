import {
  awsEndpoint,
  awsRegion,
  deploymentS3,
  inscriptionBucket,
  uploadBucket,
  mainnetMempoolUrl,
  regtestMempoolUrl,
  testnetMempoolUrl,
  tableNames,
  mainnetMempoolAuth,
  testnetMempoolAuth,
} from "@0xflick/ordinals-backend";
import { lazySingleton } from "@0xflick/ordinals-models";

export const axolotlInscriptionTip = lazySingleton(() => {
  const envNum = Number(process.env.AXOLOTL_INSCRIPTION_TIP);
  return Number.isInteger(envNum) ? envNum : 0;
});

export const axolotlInscriptionTipDestination = lazySingleton(() => {
  if (!process.env.AXOLOTL_INSCRIPTION_TIP_DESTINATION) {
    throw new Error("AXOLOTL_INSCRIPTION_TIP_DESTINATION not set");
  }
  return process.env.AXOLOTL_INSCRIPTION_TIP_DESTINATION;
});

export const axolotlAllowanceContractAddress = lazySingleton(() => {
  if (!process.env.AXOLOTL_ALLOWANCE_CONTRACT_ADDRESS) {
    throw new Error("AXOLOTL_ALLOWANCE_CONTRACT_ADDRESS not set");
  }
  return process.env.AXOLOTL_ALLOWANCE_CONTRACT_ADDRESS as `0x${string}`;
});

export const axolotlAllowanceChainId = lazySingleton(() => {
  const envNum = Number(process.env.AXOLOTL_ALLOWANCE_CHAIN_ID);
  if (!Number.isInteger(envNum)) {
    throw new Error("AXOLOTL_ALLOWANCE_CHAIN_ID not set");
  }
  return envNum;
});

export const inscriptionTip = lazySingleton(() => {
  const envNum = Number(process.env.INSCRIPTION_TIP);
  return Number.isInteger(envNum) ? envNum : 0;
});

export const authMessageDomain = lazySingleton(() => {
  if (!process.env.AUTH_MESSAGE_DOMAIN) {
    throw new Error("AUTH_MESSAGE_DOMAIN not set");
  }
  return process.env.AUTH_MESSAGE_DOMAIN;
});

export const authMessageExpirationTimeSeconds = lazySingleton(() => {
  const time = Number(process.env.AUTH_MESSAGE_EXPIRATION_TIME_SECONDS);
  if (!Number.isInteger(time)) {
    throw new Error("AUTH_MESSAGE_EXPIRATION_TIME_SECONDS not set");
  }
  return Number(process.env.AUTH_MESSAGE_EXPIRATION_TIME_SECONDS);
});

export const authMessageJwtClaimIssuer = lazySingleton(() => {
  if (!process.env.AUTH_MESSAGE_JWT_CLAIM_ISSUER) {
    throw new Error("AUTH_MESSAGE_JWT_CLAIM_ISSUER not set");
  }
  return process.env.AUTH_MESSAGE_JWT_CLAIM_ISSUER;
});

export const sepoliaEnsRegistryAddress = lazySingleton(() => {
  if (!process.env.SEPOLIA_ENS_REGISTRY_ADDRESS) {
    throw new Error("SEPOLIA_ENS_REGISTRY_ADDRESS not set");
  }
  return process.env.SEPOLIA_ENS_REGISTRY_ADDRESS;
});

export const sepoliaEnsUniversalResolverAddress = lazySingleton(() => {
  if (!process.env.SEPOLIA_ENS_UNIVERSAL_RESOLVER_ADDRESS) {
    throw new Error("SEPOLIA_ENS_UNIVERSAL_RESOLVER_ADDRESS not set");
  }
  return process.env.SEPOLIA_ENS_UNIVERSAL_RESOLVER_ADDRESS;
});

export const sepoliaEnsAdmin = lazySingleton(() => {
  if (!process.env.SEPOLIA_ENS_ADMIN) {
    throw new Error("SEPOLIA_ENS_ADMIN not set");
  }
  return process.env.SEPOLIA_ENS_ADMIN;
});

export const sepoliaRpcUrl = lazySingleton(() => {
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error("SEPOLIA_RPC_URL not set");
  }
  return process.env.SEPOLIA_RPC_URL;
});

export const defaultTipDestination = lazySingleton(() => {
  if (!process.env.DEFAULT_TIP_DESTINATION) {
    throw new Error("DEFAULT_TIP_DESTINATION not set");
  }
  return process.env.DEFAULT_TIP_DESTINATION;
});

export interface IConfigContext {
  awsEndpoint?: string;
  awsRegion?: string;
  deploymentS3?: string;
  inscriptionBucket: string;
  uploadBucket: string;
  inscriptionTip: number;
  defaultTipDestination: string;
  axolotlInscriptionTip: number;
  axolotlInscriptionTipDestination: string;
  axolotlAllowanceContractAddress: `0x${string}`;
  axolotlAllowanceChainId: number;
  bitcoinRegtestMempoolEndpoint: string | null;
  bitcoinTestnetMempoolEndpoint: string | null;
  bitcoinTestnetMempoolAuth: string | null;
  bitcoinMainnetMempoolEndpoint: string | null;
  bitcoinMainnetMempoolAuth: string | null;
  authMessageDomain: string;
  authMessageExpirationTimeSeconds: number;
  authMessageJwtClaimIssuer: string;
  tableNames: Record<string, string>;
  sepoliaEnsRegistryAddress: string;
  sepoliaEnsUniversalResolverAddress: string;
  sepoliaEnsAdmin: string;
  sepoliaRpcUrl: string;
}
export function createConfigContext(): IConfigContext {
  return {
    get awsEndpoint() {
      return awsEndpoint.get();
    },
    get awsRegion() {
      return awsRegion.get();
    },
    get deploymentS3() {
      return deploymentS3.get();
    },
    get inscriptionBucket() {
      return inscriptionBucket.get();
    },
    get uploadBucket() {
      return uploadBucket.get();
    },
    get inscriptionTip() {
      return inscriptionTip.get();
    },
    get defaultTipDestination() {
      return defaultTipDestination.get();
    },
    get axolotlAllowanceChainId() {
      return axolotlAllowanceChainId.get();
    },
    get axolotlInscriptionTipDestination() {
      return axolotlInscriptionTipDestination.get();
    },
    get axolotlAllowanceContractAddress() {
      return axolotlAllowanceContractAddress.get();
    },
    get axolotlInscriptionTip() {
      return axolotlInscriptionTip.get();
    },
    get bitcoinRegtestMempoolEndpoint() {
      return regtestMempoolUrl.get();
    },
    get bitcoinTestnetMempoolEndpoint() {
      return testnetMempoolUrl.get();
    },
    get bitcoinTestnetMempoolAuth() {
      return testnetMempoolAuth.get();
    },
    get bitcoinMainnetMempoolEndpoint() {
      return mainnetMempoolUrl.get();
    },
    get bitcoinMainnetMempoolAuth() {
      return mainnetMempoolAuth.get();
    },
    get authMessageDomain() {
      return authMessageDomain.get();
    },
    get authMessageExpirationTimeSeconds() {
      return authMessageExpirationTimeSeconds.get();
    },
    get authMessageJwtClaimIssuer() {
      return authMessageJwtClaimIssuer.get();
    },
    get tableNames() {
      return tableNames.get();
    },
    get sepoliaEnsRegistryAddress() {
      return sepoliaEnsRegistryAddress.get();
    },
    get sepoliaEnsUniversalResolverAddress() {
      return sepoliaEnsUniversalResolverAddress.get();
    },
    get sepoliaEnsAdmin() {
      return sepoliaEnsAdmin.get();
    },
    get sepoliaRpcUrl() {
      return sepoliaRpcUrl.get();
    },
  };
}
