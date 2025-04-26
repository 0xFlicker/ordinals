import {
  KeyLike,
  importJWK,
  importPKCS8,
  CompactDecryptResult,
  SignJWT,
  compactDecrypt,
  JWTPayload,
  JWTVerifyResult,
} from "jose";
import {
  generateRolesFromIds,
  namespacedClaim,
  IUserWithRoles,
  IUserAddress,
} from "@0xflick/ordinals-rbac-models";

export async function decryptJweToken(
  jwe: string,
): Promise<CompactDecryptResult> {
  const key = await jwkKey;
  const decrypted = await compactDecrypt(jwe, key);
  return decrypted;
}

export async function createJwtTokenForNewUser({
  address,
  nonce,
  issuer,
}: {
  address: IUserAddress;
  nonce: string;
  issuer: string;
}): Promise<string> {
  const key = await jwkKey;
  return await new SignJWT({
    address,
    nonce,
  })
    .setProtectedHeader({ alg: "ES512" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime("20m")
    .sign(key);
}

export async function createJwtTokenForAddressAddition({
  userId,
  address,
  issuer,
}: {
  userId: string;
  address: { type: "evm" | "btc"; address: string };
  issuer: string;
}): Promise<string> {
  const key = await jwkKey;
  return await new SignJWT({
    address,
  })
    .setProtectedHeader({ alg: "ES512" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime("20m")
    .sign(key);
}

export async function createJwtTokenForLogin({
  user,
  issuer,
}: {
  user: IUserWithRoles;
  issuer: string;
}): Promise<string> {
  const key = await jwkKey;
  return await new SignJWT({
    [namespacedClaim("roles", issuer)]: user.roleIds,
  })
    .setProtectedHeader({ alg: "ES512" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime("7d")
    .sign(key);
}

export const jwkKey = new Promise<KeyLike>(async (resolve, reject) => {
  if ((global as any).promisePrivateKeys) {
    await (global as any).promisePrivateKeys;
  }
  process.env.AUTH_MESSAGE_JWK &&
    importJWK(JSON.parse(process.env.AUTH_MESSAGE_JWK), "ECDH-ES+A128KW").then(
      (k: any) => {
        resolve(k);
      },
      reject,
    );
});
