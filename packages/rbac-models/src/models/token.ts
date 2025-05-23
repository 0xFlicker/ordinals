import { CompactEncrypt, decodeJwt, importSPKI } from "jose";
import { IRole } from "./roles.js";
import {
  UserAddressType,
  UserModel,
  UserWithAddressesModel,
  UserWithRolesModel,
} from "./user.js";
import { promisePublicKey } from "./verifyJwt.js";

export function generateRoles(roles: IRole[], issuer: string) {
  return generateRolesFromIds({
    roles: roles.map((role) => role.id),
    issuer,
  });
}

export function namespacedClaim(claim: string, issuer: string) {
  return `${issuer}/${claim}`;
}

export function generateRolesFromIds({
  roles,
  issuer,
}: {
  roles?: string[];
  issuer: string;
}) {
  return roles?.length
    ? roles.reduce(
        (memo, role) => {
          memo[namespacedClaim(`role/${role}`, issuer)] = true;
          return memo;
        },
        {} as Record<string, boolean>,
      )
    : {};
}

// export function decodeJwtToken(token: string, issuer: string): UserModel {
//   const result = decodeJwt(token);
//   if (result.iss !== issuer) {
//     throw new Error("Issuer mismatch");
//   }
//   const roleNamespace = namespacedClaim("role/", issuer);
//   const roleIds = Object.entries(result)
//     .filter(([k, v]) => v && k.includes(roleNamespace))
//     .map(([k]) => k.replace(roleNamespace, ""));
//   return new UserWithRolesModel({
//     userId: result.sub!,
//     roleIds,
//   });
// }

export async function createJweRequest({
  signature,
  nonce,
  pubKeyStr,
  protectedHeader,
}: {
  signature: string;
  nonce: string;
  pubKeyStr?: string;
  protectedHeader?: Record<string, unknown>;
}) {
  const ge = new CompactEncrypt(new TextEncoder().encode(signature));
  const pubKey = pubKeyStr
    ? await importSPKI(pubKeyStr, "ECDH-ES+A128KW", {
        extractable: true,
      })
    : await promisePublicKey;
  const jwe = await ge
    .setProtectedHeader({
      kid: nonce,
      alg: "ECDH-ES+A128KW",
      enc: "A128GCM",
      crv: "P-521",
      ...protectedHeader,
    })
    .encrypt(pubKey);
  return jwe;
}

export class TokenModel {
  public static JWT_CLAIM_ISSUER =
    process.env.AUTH_MESSAGE_JWT_CLAIM_ISSUER ?? "dapp";
}
