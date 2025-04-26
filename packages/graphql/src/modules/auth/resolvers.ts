import {
  createJwtTokenForLogin,
  createJwtTokenForNewUser,
  decryptJweToken,
  IUserAddress,
  UserAddressType,
  UserDAO,
  verifyJwtForNewUserCreation,
  verifyJwtToken,
} from "@0xflick/ordinals-rbac";
import { v4 as uuidv4 } from "uuid";
import { Verifier } from "bip322-js";
import { Web3LoginUserModel, Web3UserModel } from "../user/models.js";
import { authorizedUser } from "./controller.js";
import { AuthModule } from "./generated-types/module-types.js";
import { addressToBitcoinNetwork } from "../user/resolvers.js";
import {
  authMessageBitcoin,
  authMessageEthereum,
} from "@0xflick/ordinals-models";
import { verifyMessage } from "ethers";
import { AuthError, EReason } from "./errors.js";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "graphql/auth/resolvers",
});

export const resolvers: AuthModule.Resolvers = {
  Query: {
    appInfo: async (_, __, { authMessageJwtClaimIssuer }) => {
      return {
        name: authMessageJwtClaimIssuer,
        pubKey: process.env.AUTH_MESSAGE_PUBLIC_KEY!,
      };
    },
    self: async (_, { namespace }, context) => {
      const { getToken } = context;
      const user = await authorizedUser({
        namespace,
        ...context,
      });
      const token = getToken(namespace);
      return new Web3UserModel(user.userId, token);
    },
    checkUserExistsForAddress: async (_, { address }, { userDao }) => {
      const user = await userDao.getUserByAddress({ address });
      return !!user;
    },
    checkUserExistsForHandle: async (_, { handle }, { userDao }) => {
      try {
        await userDao.getUserByHandle({ handle });
        return true;
      } catch (error) {
        return false;
      }
    },
  },
  Mutation: {
    signupBitcoin: async (
      _,
      { address, jwe },
      {
        authMessageDomain,
        authMessageJwtClaimIssuer,
        userNonceDao,
        setToken,
        userDao,
        userRolesDao,
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userNonceDao.getNonce(address, nonce);

      if (!userNonceRequest) {
        return {
          token: null,
          problems: [{ message: "Invalid nonce" }],
        };
      }
      const {
        domain,
        expiresAt,
        issuedAt,
        uri,
        address: { address: nonceAddress, type },
      } = userNonceRequest;

      if (nonceAddress !== address) {
        return {
          token: null,
          problems: [{ message: "Invalid address" }],
        };
      }
      if (domain !== authMessageDomain) {
        return {
          token: null,
          problems: [{ message: "Invalid domain" }],
        };
      }
      if (uri !== authMessageJwtClaimIssuer) {
        return {
          token: null,
          problems: [{ message: "Invalid uri" }],
        };
      }
      if (expiresAt < new Date().toISOString()) {
        return {
          token: null,
          problems: [{ message: "Expired nonce" }],
        };
      }
      if (type !== UserAddressType.BTC) {
        return {
          token: null,
          problems: [{ message: "Invalid address type" }],
        };
      }

      try {
        const messageToSign = authMessageBitcoin({
          address,
          domain,
          expirationTime: expiresAt,
          issuedAt,
          uri,
          nonce,
          network: addressToBitcoinNetwork(address),
        });
        const verified = Verifier.verifySignature(
          address,
          messageToSign,
          signature,
        );
        if (!verified) {
          return {
            token: null,
            problems: [{ message: "Invalid signature" }],
          };
        }
        const roleIds: string[] = [];
        for await (const roleId of userRolesDao.getRoleIds(address)) {
          roleIds.push(roleId);
        }

        const { userId } = await userDao.getUserWithAddresses(address);
        logger.info(`User ID: ${userId}`);
        const { handle } = await userDao.getUserById({ userId });
        const token = await createJwtTokenForLogin({
          user: {
            userId,
            handle,
            roleIds,
          },
          issuer: authMessageJwtClaimIssuer,
        });
        setToken(token);
        return {
          user: new Web3UserModel(userId, token),
        };
      } catch (error) {
        logger.error(error, `Error getting user with addresses: ${address}`);
        return {
          user: null,
          problems: [{ message: "User not found" }],
        };
      }
    },
    signupAnonymously: async (
      _,
      { request },
      {
        setToken,
        userDao,
        userRolesDao,
        rolesDao,
        rolePermissionsDao,
        authMessageJwtClaimIssuer,
      },
    ) => {
      const { token, handle } = request;
      const { address, nonce } = await verifyJwtToken(token);
      if (!address) {
        throw new AuthError("Invalid token", EReason.INVALID_TOKEN);
      }
      const { address: addressInfo, type: addressType } =
        address as IUserAddress;

      const userId = uuidv4();
      await userDao.createUser({
        userId,
        handle,
      });
      await userDao.bindAddressToUser(
        userRolesDao,
        rolesDao,
        rolePermissionsDao,
        userId,
        addressInfo,
        addressType,
      );

      const newToken = await createJwtTokenForNewUser({
        address: { address: addressInfo, type: addressType },
        nonce: nonce as string,
        issuer: authMessageJwtClaimIssuer,
      });
      setToken(newToken);
      return {
        user: new Web3UserModel(userId, newToken),
      };
    },
    siwe: async (
      _,
      { address, jwe },
      { authMessageDomain, authMessageJwtClaimIssuer, userNonceDao, setToken },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;

      const userNonceRequest = await userNonceDao.getNonce(address, nonce);
      if (!userNonceRequest) {
        throw new Error("Invalid nonce");
      }
      const {
        domain,
        expiresAt,
        issuedAt,
        uri,
        version,
        chainId,
        address: { address: nonceAddress, type },
      } = userNonceRequest;
      if (nonceAddress !== address) {
        return {
          token: null,
          problems: [{ message: "Invalid address" }],
        };
      }
      if (type !== UserAddressType.EVM) {
        return {
          token: null,
          problems: [{ message: "Invalid address type" }],
        };
      }
      if (domain !== authMessageDomain) {
        return {
          token: null,
          problems: [{ message: "Invalid domain" }],
        };
      }
      if (uri !== authMessageJwtClaimIssuer) {
        return {
          token: null,
          problems: [{ message: "Invalid uri" }],
        };
      }
      if (version !== "1") {
        return {
          token: null,
          problems: [{ message: "Invalid version" }],
        };
      }
      if (expiresAt < new Date().toISOString()) {
        return {
          token: null,
          problems: [{ message: "Expired nonce" }],
        };
      }

      try {
        const messageToSign = authMessageEthereum({
          address,
          chainId: chainId!,
          domain,
          expirationTime: expiresAt,
          issuedAt,
          uri,
          version: version!,
          nonce,
        });
        const recoveredAddress = verifyMessage(messageToSign, signature);
        if (recoveredAddress !== address) {
          return {
            token: null,
            problems: [{ message: "Invalid signature" }],
          };
        }
        const token = await createJwtTokenForNewUser({
          address: { address, type },
          nonce,
          issuer: authMessageJwtClaimIssuer,
        });
        setToken(token, "siwe");
        return {
          token,
        };
      } catch (error) {
        return {
          token: null,
          problems: [
            {
              message: "Invalid signature",
            },
          ],
        };
      }
    },
    siwb: async (
      _,
      { address, jwe },
      {
        authMessageDomain,
        authMessageJwtClaimIssuer,
        userNonceDao,
        setToken,
        userRolesDao,
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userNonceDao.getNonce(address, nonce);

      if (!userNonceRequest) {
        return {
          token: null,
          problems: [{ message: "Invalid nonce" }],
        };
      }
      const {
        domain,
        expiresAt,
        issuedAt,
        uri,
        address: { address: nonceAddress, type },
      } = userNonceRequest;

      if (nonceAddress !== address) {
        return {
          token: null,
          problems: [{ message: "Invalid address" }],
        };
      }
      if (domain !== authMessageDomain) {
        return {
          token: null,
          problems: [{ message: "Invalid domain" }],
        };
      }
      if (uri !== authMessageJwtClaimIssuer) {
        return {
          token: null,
          problems: [{ message: "Invalid uri" }],
        };
      }
      if (expiresAt < new Date().toISOString()) {
        return {
          token: null,
          problems: [{ message: "Expired nonce" }],
        };
      }

      try {
        const messageToSign = authMessageBitcoin({
          address,
          domain,
          expirationTime: expiresAt,
          issuedAt,
          uri,
          nonce,
          network: addressToBitcoinNetwork(address),
        });
        const verified = Verifier.verifySignature(
          address,
          messageToSign,
          signature,
        );
        if (!verified) {
          return {
            token: null,
            problems: [{ message: "Invalid signature" }],
          };
        }
        const roleIds: string[] = [];
        for await (const roleId of userRolesDao.getRoleIds(address)) {
          roleIds.push(roleId);
        }

        const token = await createJwtTokenForNewUser({
          address: { address, type },
          nonce,
          issuer: authMessageJwtClaimIssuer,
        });
        setToken(token, "siwe");
        return {
          token,
        };
      } catch (error) {
        logger.error(error);
        return {
          token: null,
          problems: [{ message: "Invalid signature" }],
        };
      }
    },
    signOutBitcoin: async (_, __, { clearToken }) => {
      // TODO: different tokens for bitcoin and ethereum
      clearToken("siwb");
      return true;
    },
    signOutEthereum: async (_, __, { clearToken }) => {
      // TODO: different tokens for bitcoin and ethereum
      clearToken("siwe");
      return true;
    },
  },
};
