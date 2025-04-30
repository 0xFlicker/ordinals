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
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "graphql/auth/controller",
});

export async function verifyAuthorizedUser({
  getToken,
  userRolesDao,
  namespace,
  rolePermissionsDao,
  authorizer,
  userDao,
  clearToken,
}: {
  namespace?: string;
  authorizer?: (item: TAllowedAction[], user: UserWithRolesModel) => boolean;
} & Pick<
  Context,
  "getToken" | "clearToken" | "userRolesDao" | "rolePermissionsDao" | "userDao"
>) {
  const user = await authorizedUser({
    getToken,
    userRolesDao,
    namespace,
    clearToken,
    userDao,
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
  userDao,
  namespace,
  clearToken,
}: {
  namespace?: string;
} & Pick<Context, "getToken" | "clearToken" | "userRolesDao" | "userDao">) {
  const token = getToken(namespace);
  if (!token) {
    throw new AuthError("Not authenticated", "NOT_AUTHENTICATED");
  }

  const user = await verifyJwtForLogin(token);
  if (!user) {
    throw new AuthError("Invalid token", "NOT_AUTHENTICATED");
  }

  // check if user is in the database
  try {
    const userFromDb = await userDao.getUserById({ userId: user.userId });
    if (!userFromDb) {
      throw new AuthError("User not found", "NOT_AUTHENTICATED");
    }
  } catch (error) {
    logger.warn(
      {
        userId: user.userId,
        token,
      },
      "User not found in database",
    );
    // Who is this? erase the user
    clearToken(namespace);
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError("User not found", "NOT_AUTHENTICATED");
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
