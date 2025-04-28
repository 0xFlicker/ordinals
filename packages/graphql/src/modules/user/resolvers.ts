import {
  BitcoinNetworkNames,
  authMessageBitcoin,
  authMessageEthereum,
} from "@0xflick/ordinals-models";
import { createLogger } from "@0xflick/ordinals-backend";
import { Address } from "@cmdcode/tapscript";
import { RoleModel } from "../permissions/models.js";
import { UserModule } from "./generated-types/module-types.js";
import { modelPermissionToGraphql } from "../permissions/transforms.js";
import { Web3UserModel } from "./models.js";
import { IUserAddress, UserAddressType } from "@0xflick/ordinals-rbac-models";
import { AddressType } from "../../generated-types/graphql.js";

const logger = createLogger({
  name: "graphql/user-resolvers",
});

export function addressToBitcoinNetwork(address: string): BitcoinNetworkNames {
  const { network } = Address.decode(address);
  switch (network) {
    case "main":
      return "mainnet";
    case "testnet":
      return "testnet";
    case "regtest":
      return "regtest";
    default:
      throw new Error(`Unknown network ${network}`);
  }
}

function addressToGraphqlAddress(addressType: UserAddressType): AddressType {
  switch (addressType) {
    case UserAddressType.EVM:
      return "EVM";
    case UserAddressType.BTC:
      return "BTC";
  }
}

export const resolvers: UserModule.Resolvers = {
  Web3User: {
    roles: async (user, _, { userRolesDao, rolesDao, rolePermissionsDao }) => {
      const userRoles = await user.withRoles({ userRolesDao });
      return userRoles.roleIds.map(
        (roleId) => new RoleModel(rolesDao, rolePermissionsDao, roleId),
      );
    },
    addresses: async (user, _, { userDao }) => {
      const userAddresses = await userDao.getUsersAddresses(user.id);
      return userAddresses.map((address) => ({
        address: address.address,
        type: addressToGraphqlAddress(address.type),
      }));
    },
    handle: async (user, _, { userDao }) => {
      logger.info("handle", { user });
      return user.handle;
    },
    allowedActions: async (
      { id },
      _,
      { userRolesDao, rolePermissionsDao, userDao },
    ) => {
      const permissions = await userDao.allowedActionsForUserId(
        userRolesDao,
        rolePermissionsDao,
        id,
      );
      return permissions.map(modelPermissionToGraphql);
    },
  },
  Query: {
    user: async (_, { id }, { getToken, userDao }) => {
      return new Web3UserModel({
        userId: id,
        token: getToken(),
        userDao: userDao,
      });
    },
  },
  Mutation: {
    nonceEthereum: async (
      _,
      { address, chainId },
      {
        userNonceDao,
        authMessageDomain,
        authMessageExpirationTimeSeconds,
        authMessageJwtClaimIssuer,
      },
    ) => {
      const now = Date.now();
      const expirationTime = new Date(
        now + authMessageExpirationTimeSeconds * 1000,
      ).toISOString();
      const issuedAt = new Date(now).toISOString();
      const nonce = await userNonceDao.createNonce({
        address: {
          address,
          type: UserAddressType.EVM,
        },
        domain: authMessageDomain,
        expiresAt: expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
        version: "1",
        chainId,
      });

      const messageToSign = authMessageEthereum({
        address,
        chainId,
        nonce,
        domain: authMessageDomain,
        expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
        version: "1",
      });

      return {
        nonce,
        messageToSign,
        domain: authMessageDomain,
        expiration: expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
        version: "1",
        chainId,
        pubKey: process.env.AUTH_MESSAGE_PUBLIC_KEY!,
        address: {
          address,
          type: "EVM",
        },
      };
    },
    nonceBitcoin: async (
      _,
      { address },
      {
        userNonceDao,
        authMessageDomain,
        authMessageExpirationTimeSeconds,
        authMessageJwtClaimIssuer,
      },
    ) => {
      const now = Date.now();
      const expirationTime = new Date(
        now + authMessageExpirationTimeSeconds * 1000,
      ).toISOString();
      const issuedAt = new Date(now).toISOString();
      const nonce = await userNonceDao.createNonce({
        address: {
          address,
          type: UserAddressType.BTC,
        },
        domain: authMessageDomain,
        expiresAt: expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
      });

      const messageToSign = authMessageBitcoin({
        address,
        nonce,
        domain: authMessageDomain,
        expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
        network: addressToBitcoinNetwork(address),
      });

      return {
        nonce,
        messageToSign,
        domain: authMessageDomain,
        expiration: expirationTime,
        issuedAt,
        uri: authMessageJwtClaimIssuer,
        pubKey: process.env.AUTH_MESSAGE_PUBLIC_KEY!,
        address: {
          address,
          type: "BTC",
        },
      };
    },
  },
};
