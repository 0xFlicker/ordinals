import {
  createJwtTokenSingleSubject,
  decryptJweToken,
  namespacedClaim,
  roleIdsToAddresses,
  UserAddressType,
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
  },
  Mutation: {
    siwe: async (
      _,
      { address, jwe },
      {
        authMessageDomain,
        authMessageJwtClaimIssuer,
        userDao,
        setToken,
        userRolesDao,
        rolesDao,
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;

      const userNonceRequest = await userDao.getNonce(address, nonce);
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
        throw new Error("Invalid address");
      }
      if (type !== UserAddressType.EVM) {
        throw new Error("Invalid address type");
      }
      if (domain !== authMessageDomain) {
        throw new Error("Invalid domain");
      }
      if (uri !== authMessageJwtClaimIssuer) {
        throw new Error("Invalid uri");
      }
      if (version !== "1") {
        throw new Error("Invalid version");
      }
      if (expiresAt < new Date().toISOString()) {
        throw new Error("Expired nonce");
      }

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
        throw new Error("Invalid signature");
      }
      const roleIds: string[] = [];
      for await (const roleId of userRolesDao.getRoleIds(address)) {
        roleIds.push(roleId);
      }
      const roleId = `${UserAddressType.EVM}#${address}`;
      let role = await rolesDao.get(roleId);
      let userId: string | undefined;
      for await (const u of userRolesDao.getUsers(roleId)) {
        userId = u;
        break;
      }
      if (!userId) {
        userId = uuidv4();
      }
      if (!role) {
        role = await rolesDao.create({
          id: roleId,
          name: `${UserAddressType.EVM}: ${address}`,
        });
      }
      const token = await createJwtTokenSingleSubject({
        user: {
          userId,
          addresses: roleIdsToAddresses(roleIds),
          roleIds,
        },
        nonce,
        issuer: authMessageJwtClaimIssuer,
        addressType: UserAddressType.EVM,
        payload: {
          [namespacedClaim("chainId", authMessageJwtClaimIssuer)]: chainId,
        },
      });
      setToken(token, "siwe");
      return new Web3LoginUserModel({
        userId,
        token,
      });
    },
    siwb: async (
      _,
      { address, jwe },
      {
        authMessageDomain,
        authMessageJwtClaimIssuer,
        userDao,
        setToken,
        userRolesDao,
        rolesDao,
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userDao.getNonce(address, nonce);

      if (!userNonceRequest) {
        throw new Error("Invalid nonce");
      }
      const { domain, expiresAt, issuedAt, uri } = userNonceRequest;

      if (domain !== authMessageDomain) {
        throw new Error("Invalid domain");
      }
      if (uri !== authMessageJwtClaimIssuer) {
        throw new Error("Invalid uri");
      }
      if (expiresAt < new Date().toISOString()) {
        throw new Error("Expired nonce");
      }

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
        throw new Error("Invalid signature");
      }
      const roleIds: string[] = [];
      for await (const roleId of userRolesDao.getRoleIds(address)) {
        roleIds.push(roleId);
      }
      const roleId = `${UserAddressType.EVM}#${address}`;
      let role = await rolesDao.get(roleId);
      let userId: string | undefined;
      for await (const u of userRolesDao.getUsers(roleId)) {
        userId = u;
        break;
      }
      if (!userId) {
        userId = uuidv4();
      }
      if (!role) {
        role = await rolesDao.create({
          id: roleId,
          name: `${UserAddressType.EVM}: ${address}`,
        });
      }
      const token = await createJwtTokenSingleSubject({
        user: {
          userId,
          addresses: roleIdsToAddresses(roleIds),
          roleIds,
        },
        nonce,
        issuer: authMessageJwtClaimIssuer,
        addressType: UserAddressType.BTC,
      });
      setToken(token, "siwb");
      return new Web3LoginUserModel({
        userId,
        token,
      });
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
