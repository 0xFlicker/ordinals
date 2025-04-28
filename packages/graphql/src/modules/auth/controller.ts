import { Context } from "../../context/index.js";
import { AuthError } from "./errors.js";
import {
  TAllowedAction,
  TokenModel,
  UserAddressType,
  UserWithRolesModel,
  verifyJwtForLogin,
  verifyJwtToken,
} from "@0xflick/ordinals-rbac-models";

export async function verifyAuthorizedUser({
  getToken,
  userRolesDao,
  namespace,
  rolePermissionsDao,
  authorizer,
}: {
  getToken: Context["getToken"];
  userRolesDao: Context["userRolesDao"];
  rolePermissionsDao: Context["rolePermissionsDao"];
  namespace?: string;
  authorizer?: (item: TAllowedAction[], user: UserWithRolesModel) => boolean;
}) {
  const user = await authorizedUser({
    getToken,
    userRolesDao,
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
  namespace,
}: {
  getToken: Context["getToken"];
  userRolesDao: Context["userRolesDao"];
  namespace?: string;
}) {
  const token = getToken(namespace);
  if (!token) {
    throw new AuthError("Not authenticated", "NOT_AUTHENTICATED");
  }

  const user = await verifyJwtForLogin(token);
  if (!user) {
    throw new AuthError("Invalid token", "NOT_AUTHENTICATED");
  }

  const roleIds: string[] = [];
  for await (const roleId of userRolesDao.getRoleIds(user.userId)) {
    roleIds.push(roleId);
  }

  return new UserWithRolesModel({
    ...user,
    roleIds,
  });
}
