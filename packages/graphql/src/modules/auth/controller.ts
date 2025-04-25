import { Context } from "../../context/index.js";
import { AuthError } from "./errors.js";
import {
  TAllowedAction,
  UserAddressType,
  UserWithRolesModel,
  verifyJwtToken,
} from "@0xflick/ordinals-rbac-models";

export async function verifyAuthorizedUser({
  getToken,
  userRolesDao,
  authMessageJwtClaimIssuer,
  namespace,
  rolePermissionsDao,
  authorizer,
}: {
  getToken: Context["getToken"];
  userRolesDao: Context["userRolesDao"];
  authMessageJwtClaimIssuer: Context["authMessageJwtClaimIssuer"];
  rolePermissionsDao: Context["rolePermissionsDao"];
  namespace?: string;
  authorizer?: (item: TAllowedAction[], user: UserWithRolesModel) => boolean;
}) {
  const user = await authorizedUser({
    getToken,
    userRolesDao,
    authMessageJwtClaimIssuer,
    namespace,
  });

  return authorizer
    ? defaultAuthorizer({ user, authorizer, rolePermissionsDao })
    : user;
}

export async function defaultAuthorizer({
  rolePermissionsDao,
  user,
  authorizer,
}: {
  rolePermissionsDao: Context["rolePermissionsDao"];
  user: UserWithRolesModel;
  authorizer: (item: TAllowedAction[], user: UserWithRolesModel) => boolean;
}) {
  const permissionsFromDb = await rolePermissionsDao.allowedActionsForRoleIds(
    user.roleIds,
  );

  let isAuthorized = authorizer(permissionsFromDb, user);
  if (isAuthorized) {
    return user;
  }
  // FIXME: auth: ens
  // TODO: removal, use real auth
  // const chainIdFromToken = user.decodedToken?.[
  //   namespacedClaim("chainId", authMessageJwtClaimIssuer)
  // ] as string | undefined;
  // if (chainIdFromToken) {
  //   const provider = providerForChain(Number(chainIdFromToken));
  //   const adminEns = ensAdminForChain(Number(chainIdFromToken));
  //   const adminAddress = await provider.resolveName(adminEns);
  //   if (adminAddress === user.address) {
  //     isAuthorized = true;
  //   }
  // }

  if (!isAuthorized) {
    throw new AuthError("Forbidden", "NOT_AUTHORIZED");
  }
  return user;
}

export async function authorizedUser({
  getToken,
  userRolesDao,
  authMessageJwtClaimIssuer,
  namespace,
}: {
  getToken: Context["getToken"];
  userRolesDao: Context["userRolesDao"];
  authMessageJwtClaimIssuer: Context["authMessageJwtClaimIssuer"];
  namespace?: string;
}) {
  const token = getToken(namespace);

  if (!token) {
    throw new AuthError("Not authenticated", "NOT_AUTHENTICATED");
  }
  let addressType: string | undefined;
  switch (namespace) {
    case "siwb":
      addressType = UserAddressType.BTC;
      break;
    case "siwe  ":
      addressType = UserAddressType.EVM;
      break;
    default:
      addressType = undefined;
  }
  const user = await verifyJwtToken({
    token,
    issuer: authMessageJwtClaimIssuer,
    addressType,
  });
  if (!user) {
    throw new AuthError("Invalid token", "NOT_AUTHENTICATED");
  }

  // Now that we have the user, and know their address, we can check the roles
  const roleIds: string[] = [];
  for await (const roleId of userRolesDao.getRoleIds(user.userId)) {
    roleIds.push(roleId);
  }

  // Now verify with roleIds
  await verifyJwtToken({
    token,
    roleIds,
    issuer: authMessageJwtClaimIssuer,
  });

  return user;
}
