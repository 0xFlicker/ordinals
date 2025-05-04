import {
  createJwtTokenForAddressAddition,
  createJwtTokenForLogin,
  createJwtTokenForNewUser,
  decryptJweToken,
  UserAddressType,
  verifyJwtForLogin,
  verifyJwtForNewUserCreation,
} from "@0xflick/ordinals-rbac";
import { v4 as uuidv4 } from "uuid";
import { Verifier } from "bip322-js";
import { Web3UserModel } from "../user/models.js";
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
    self: async (_, {}, context) => {
      const { getToken, userDao } = context;
      const user = await authorizedUser(context);
      const token = getToken();
      return new Web3UserModel({
        userId: user.userId,
        token,
        handle: user.handle,
        userDao,
      });
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
    signInBitcoin: async (
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
          data: {
            token,
            user: new Web3UserModel({
              userId,
              token,
              userDao,
            }),
          },
        };
      } catch (error) {
        logger.error(error, `Error getting user with addresses: ${address}`);
        return {
          user: null,
          problems: [{ message: "User not found" }],
        };
      }
    },
    signUpAnonymously: async (
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
      const { address, nonce } = await verifyJwtForNewUserCreation(token);
      if (!address) {
        throw new AuthError("Invalid token", EReason.INVALID_TOKEN);
      }
      const { address: addressInfo, type: addressType } = address;

      const userId = uuidv4();
      await userDao.createUser({
        userId,
        handle,
      });
      const roleId = await userDao.bindAddressToUser(
        userRolesDao,
        rolesDao,
        rolePermissionsDao,
        userId,
        addressInfo,
        addressType,
      );

      const newToken = await createJwtTokenForLogin({
        user: {
          userId,
          roleIds: [roleId],
        },
        issuer: authMessageJwtClaimIssuer,
      });
      setToken(newToken);
      return {
        user: new Web3UserModel({
          userId,
          token: newToken,
          handle,
          userDao,
        }),
      };
    },
    siwe: async (
      _,
      { address, jwe },
      {
        authMessageDomain,
        authMessageJwtClaimIssuer,
        userDao,
        userNonceDao,
        userRolesDao,
        setToken,
        getToken,
      },
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
          data: null,
          problems: [{ message: "Invalid address" }],
        };
      }
      if (type !== UserAddressType.EVM) {
        return {
          data: null,
          problems: [{ message: "Invalid address type" }],
        };
      }
      if (domain !== authMessageDomain) {
        return {
          data: null,
          problems: [{ message: "Invalid domain" }],
        };
      }
      if (uri !== authMessageJwtClaimIssuer) {
        return {
          data: null,
          problems: [{ message: "Invalid uri" }],
        };
      }
      if (version !== "1") {
        return {
          data: null,
          problems: [{ message: "Invalid version" }],
        };
      }
      if (expiresAt < new Date().toISOString()) {
        return {
          data: null,
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
            data: null,
            problems: [{ message: "Invalid signature" }],
          };
        }
        // check if user exists
        try {
          const user = await userDao.getUserByAddress({ address });
          const roleIds: string[] = [];
          for await (const roleId of userRolesDao.getRoleIds(user.userId)) {
            roleIds.push(roleId);
          }
          // Create a full user token
          const token = await createJwtTokenForLogin({
            user: {
              userId: user.userId,
              handle: user.handle,
              roleIds,
            },
            issuer: authMessageJwtClaimIssuer,
          });
          setToken(token);
          return {
            data: {
              token,
              user: new Web3UserModel({
                userId: user.userId,
                token,
                handle: user.handle,
                userDao,
              }),
              type: "EXISTING_USER",
            },
          };
        } catch (error) {
          // No user found with that address, but what about the token?
          const token = getToken();
          if (!token) {
            // User not found, create a token that can be used in the future to create a user
            const newToken = await createJwtTokenForNewUser({
              address: { address, type },
              nonce,
              issuer: authMessageJwtClaimIssuer,
            });
            return {
              data: {
                token: newToken,
                type: "NEW_USER",
              },
            };
          }
          const user = await verifyJwtForLogin(token);
          if (!user) {
            throw new Error("Invalid token");
          }
          // User found, generate a JWT that can be used to link the address to the user
          const linkedToken = await createJwtTokenForAddressAddition({
            address: { address, type: "EVM" },
            userId: user.userId,
            issuer: authMessageJwtClaimIssuer,
          });
          return {
            data: {
              user: new Web3UserModel({
                userId: user.userId,
                token,
                userDao,
              }),
              token: linkedToken,
              type: "LINKED_USER_REQUEST",
            },
          };
        }
      } catch (error) {
        return {
          data: null,
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
        getToken,
        userRolesDao,
        userDao,
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userNonceDao.getNonce(address, nonce);

      if (!userNonceRequest) {
        return {
          data: null,
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
          data: null,
          problems: [{ message: "Invalid address" }],
        };
      }
      if (domain !== authMessageDomain) {
        return {
          data: null,
          problems: [{ message: "Invalid domain" }],
        };
      }
      if (uri !== authMessageJwtClaimIssuer) {
        return {
          data: null,
          problems: [{ message: "Invalid uri" }],
        };
      }
      if (expiresAt < new Date().toISOString()) {
        return {
          data: null,
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
            data: null,
            problems: [{ message: "Invalid signature" }],
          };
        }
        logger.debug({ address, nonce }, "Verified SIWB");

        let userId: string;
        try {
          const { userId: userIdFromDb } = await userDao.getUserWithAddresses(
            address,
          );
          userId = userIdFromDb;
          logger.debug(
            { userId, address, nonce },
            "User found with that address",
          );
          // TODO: user could have a different address in the session token, but we are ignoring that for now
        } catch (error) {
          // No user found with that address, but what about the token?
          const token = getToken();
          if (!token) {
            logger.debug(
              { address, nonce },
              "No token found, creating new user token",
            );
            // User not found, create a token that can be used in the future to create a user
            const newToken = await createJwtTokenForNewUser({
              address: { address, type },
              nonce,
              issuer: authMessageJwtClaimIssuer,
            });
            return {
              data: {
                token: newToken,
                type: "NEW_USER",
              },
            };
          }
          const user = await verifyJwtForLogin(token);
          if (!user) {
            throw new Error("Invalid token");
          }
          logger.debug(
            { address, nonce, userId: user.userId },
            "User found, generating linked token for new address",
          );
          // User found, generate a JWT that can be used to link the address to the user
          const linkedToken = await createJwtTokenForAddressAddition({
            address: { address, type: "BTC" },
            userId: user.userId,
            issuer: authMessageJwtClaimIssuer,
          });
          return {
            data: {
              user: new Web3UserModel({
                userId: user.userId,
                token,
                userDao,
              }),
              token: linkedToken,
              type: "LINKED_USER_REQUEST",
            },
          };
        }

        const roleIds: string[] = [];
        for await (const roleId of userRolesDao.getRoleIds(userId)) {
          roleIds.push(roleId);
        }

        const { handle } = await userDao.getUserById({ userId });
        logger.debug({ userId, address, nonce }, "User found, creating token");
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
          data: {
            token,
            user: new Web3UserModel({
              userId,
              handle,
              token,
              userDao,
            }),
            type: "EXISTING_USER",
          },
        };
      } catch (error) {
        logger.error(error);
        return {
          data: null,
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
