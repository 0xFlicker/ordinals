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
import {
  IUserAddress,
  UserAddressType,
  verifyJwtForAddressAddition,
} from "@0xflick/ordinals-rbac-models";
import { AddressType } from "../../generated-types/graphql.js";
import { verifyAuthorizedUser } from "../auth/controller.js";
import { UserError } from "./errors.js";
import {
  createJwtTokenForLogin,
  createJwtTokenForNewUser,
  decryptJweToken,
} from "@0xflick/ordinals-rbac";
import { verifyMessage } from "ethers";
import { Verifier } from "bip322-js";

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
    linkVerifiedAddress: async (user, { request }, context, info) => {
      const {
        requireMutation,
        userDao,
        userRolesDao,
        rolesDao,
        rolePermissionsDao,
        authMessageJwtClaimIssuer,
        setToken,
      } = context;
      requireMutation(info);
      const { roleIds, userId } = await verifyAuthorizedUser(context);
      const { address, siweJwe, siwbJwe } = request;
      if (!siweJwe && !siwbJwe) {
        throw new UserError(
          "INVALID_REQUEST",
          "One of siweJwe or siwbJwe must be provided",
        );
      }
      if (siweJwe && siwbJwe) {
        throw new UserError(
          "INVALID_REQUEST",
          "Only one of siweJwe or siwbJwe can be provided",
        );
      }
      if (siweJwe) {
        if (userId !== user.id) {
          throw new UserError("INVALID_REQUEST", "Invalid request");
        }
        const { newAddress } = await verifyJwtForAddressAddition(
          siweJwe,
          userId,
        );
        if (newAddress.address !== address) {
          throw new UserError("INVALID_REQUEST", "Invalid request");
        }
        // bind the address to the user, creates a new role
        const roleId = await userDao.bindAddressToUser(
          userRolesDao,
          rolesDao,
          rolePermissionsDao,
          userId,
          newAddress.address,
          newAddress.type,
        );

        // generate a new user token
        const token = await createJwtTokenForLogin({
          user: {
            userId,
            roleIds: [...roleIds, roleId],
          },
          issuer: authMessageJwtClaimIssuer,
        });

        // cookie nom nom
        setToken(token);

        return new Web3UserModel({
          userId,
          userDao,
          token,
        });
      } else if (siwbJwe) {
        // SIWB
        if (userId !== user.id) {
          throw new UserError("INVALID_REQUEST", "Invalid request");
        }
        const { newAddress } = await verifyJwtForAddressAddition(
          siwbJwe,
          userId,
        );

        if (newAddress.address !== address) {
          throw new UserError("INVALID_REQUEST", "Invalid request");
        }

        // bind the address to the user, creates a new role
        const roleId = await userDao.bindAddressToUser(
          userRolesDao,
          rolesDao,
          rolePermissionsDao,
          userId,
          newAddress.address,
          newAddress.type,
        );

        // generate a new user token with the new role
        const token = await createJwtTokenForLogin({
          user: {
            userId,
            roleIds: [...roleIds, roleId],
          },
          issuer: authMessageJwtClaimIssuer,
        });

        // cookie nom nom
        setToken(token);

        return new Web3UserModel({
          userId,
          userDao,
          token,
        });
      }

      // We should never get here, but this makes typescript feel better
      throw new UserError("INVALID_REQUEST", "Invalid request");
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
    user: async (_, { id }, { getToken, userDao }) => {
      return new Web3UserModel({
        userId: id,
        token: getToken(),
        userDao: userDao,
      });
    },
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
