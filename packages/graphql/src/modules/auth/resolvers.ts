import {
  createJwtTokenSingleSubject,
  decryptJweToken,
  namespacedClaim,
} from "@0xflick/ordinals-rbac";
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
    self: async (_, __, context) => {
      const { getToken } = context;
      const user = await authorizedUser(context);
      const token = getToken("siwe") || getToken("siwb");
      return new Web3UserModel(user.address, token);
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
      },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userDao.get(address, nonce);
      if (!userNonceRequest) {
        throw new Error("Invalid nonce");
      }
      const { domain, expiresAt, issuedAt, uri, version, chainId } =
        userNonceRequest;

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
      const token = await createJwtTokenSingleSubject({
        user: {
          address,
          roleIds,
        },
        nonce,
        issuer: authMessageJwtClaimIssuer,
        payload: {
          [namespacedClaim("chainId", authMessageJwtClaimIssuer)]: chainId,
        },
      });
      setToken(token, "siwe");
      return new Web3LoginUserModel({
        address,
        token,
      });
    },
    siwb: async (
      _,
      { address, jwe },
      { authMessageDomain, authMessageJwtClaimIssuer, userDao, setToken },
    ) => {
      const { protectedHeader, plaintext } = await decryptJweToken(jwe);
      const signature = Buffer.from(plaintext).toString("utf8");
      const nonce = protectedHeader.kid!;
      const userNonceRequest = await userDao.get(address, nonce);

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
      const token = await createJwtTokenSingleSubject({
        user: {
          address,
          roleIds: [] as string[],
        },
        nonce,
        issuer: authMessageJwtClaimIssuer,
      });
      setToken(token, "siwb");
      return new Web3LoginUserModel({
        address,
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
