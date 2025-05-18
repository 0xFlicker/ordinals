import {
  awsEndpoint,
  awsRegion,
  deploymentS3,
  deploymentKMS,
  inscriptionBucket,
  uploadBucket,
  mainnetMempoolUrl,
  regtestMempoolUrl,
  testnetMempoolUrl,
  tableNames,
  mainnetMempoolAuth,
  testnetMempoolAuth,
  testnet4MempoolUrl,
} from "@0xflick/ordinals-backend";
import { BitcoinNetworkNames, lazySingleton } from "@0xflick/ordinals-models";

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

export const regtestDefaultTipDestination = lazySingleton(() => {
  if (!process.env.REGTEST_DEFAULT_TIP_DESTINATION) {
    throw new Error("REGTEST_DEFAULT_TIP_DESTINATION not set");
  }
  return process.env.REGTEST_DEFAULT_TIP_DESTINATION;
});

export const testnetDefaultTipDestination = lazySingleton(() => {
  if (!process.env.TESTNET_DEFAULT_TIP_DESTINATION) {
    throw new Error("TESTNET_DEFAULT_TIP_DESTINATION not set");
  }
  return process.env.TESTNET_DEFAULT_TIP_DESTINATION;
});

export const mainnetDefaultTipDestination = lazySingleton(() => {
  if (!process.env.MAINNET_DEFAULT_TIP_DESTINATION) {
    throw new Error("MAINNET_DEFAULT_TIP_DESTINATION not set");
  }
  return process.env.MAINNET_DEFAULT_TIP_DESTINATION;
});

export const testnet4DefaultTipDestination = lazySingleton(() => {
  if (!process.env.TESTNET4_DEFAULT_TIP_DESTINATION) {
    throw new Error("TESTNET4_DEFAULT_TIP_DESTINATION not set");
  }
  return process.env.TESTNET4_DEFAULT_TIP_DESTINATION;
});

export const parentInscriptionSecKeyEnvelopeKeyId = lazySingleton(() => {
  if (!process.env.PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID) {
    throw new Error("PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID not set");
  }
  return process.env.PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID;
});

export const fundingSecKeyEnvelopeKeyId = lazySingleton(() => {
  if (!process.env.FUNDING_SEC_KEY_ENVELOPE_KEY_ID) {
    throw new Error("FUNDING_SEC_KEY_ENVELOPE_KEY_ID not set");
  }
  return process.env.FUNDING_SEC_KEY_ENVELOPE_KEY_ID;
});

export const defaultTipDestinationForNetwork = (
  network: BitcoinNetworkNames,
) => {
  // if (network === "regtest") {
  //   return regtestDefaultTipDestination.get();
  // }
  switch (network) {
    case "regtest":
      return regtestDefaultTipDestination.get();
    case "testnet":
      return testnetDefaultTipDestination.get();
    case "mainnet":
      return mainnetDefaultTipDestination.get();
    case "testnet4":
      return testnet4DefaultTipDestination.get();
    default:
      throw new Error(
        `Default tip destination not set for network: ${network}`,
      );
  }
};

export interface IConfigContext {
  awsEndpoint?: string;
  awsRegion?: string;
  deploymentS3?: string;
  deploymentKMS?: string;
  inscriptionBucket: string;
  uploadBucket: string;
  parentInscriptionSecKeyEnvelopeKeyId: string;
  fundingSecKeyEnvelopeKeyId: string;
  inscriptionTip: number;
  regtestDefaultTipDestination: string;
  axolotlInscriptionTip: number;
  axolotlInscriptionTipDestination: string;
  axolotlAllowanceContractAddress: `0x${string}`;
  axolotlAllowanceChainId: number;
  bitcoinRegtestMempoolEndpoint: string | null;
  bitcoinTestnetMempoolEndpoint: string | null;
  bitcoinTestnet4MempoolEndpoint: string | null;
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
  defaultTipDestinationForNetwork: (network: BitcoinNetworkNames) => string;
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
    get deploymentKMS() {
      return deploymentKMS.get();
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
    get parentInscriptionSecKeyEnvelopeKeyId() {
      return parentInscriptionSecKeyEnvelopeKeyId.get();
    },
    get fundingSecKeyEnvelopeKeyId() {
      return fundingSecKeyEnvelopeKeyId.get();
    },
    get regtestDefaultTipDestination() {
      return regtestDefaultTipDestination.get();
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
    get bitcoinTestnet4MempoolEndpoint() {
      return testnet4MempoolUrl.get();
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
    defaultTipDestinationForNetwork,
  };
}
