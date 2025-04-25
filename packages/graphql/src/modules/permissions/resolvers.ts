import { PermissionsModule } from "./generated-types/module-types.js";
import { graphqlPermissionToModel } from "./transforms.js";
import { Web3UserModel } from "../user/models.js";
import { RoleModel } from "./models.js";
import { verifyAuthorizedUser } from "../auth/controller.js";
import {
  EActions,
  EResource,
  and,
  defaultAdminStrategyAll,
  isActionOnResource,
} from "@0xflick/ordinals-rbac-models";

const canPerformCreateRoleAction = defaultAdminStrategyAll(
  EResource.ROLE,
  isActionOnResource({
    action: EActions.CREATE,
    resource: EResource.ROLE,
  }),
);

const canPerformUpdateRoleAction = defaultAdminStrategyAll(
  EResource.ROLE,
  isActionOnResource({
    action: EActions.UPDATE,
    resource: EResource.ROLE,
  }),
);

const canPerformUpdateUserAndRoleAction = and(
  canPerformCreateRoleAction,
  canPerformUpdateRoleAction,
);

const canPerformDeleteRoleAction = defaultAdminStrategyAll(
  EResource.ROLE,
  isActionOnResource({
    action: EActions.DELETE,
    resource: EResource.ROLE,
  }),
);
export const resolvers: PermissionsModule.Resolvers = {
  Mutation: {
    createRole: async (_, { name, permissions }, context) => {
      const { rolePermissionsDao, rolesDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformCreateRoleAction,
        ...context,
      });
      const role = await rolesDao.create({
        name,
      });
      if (permissions && permissions.length > 0) {
        await rolePermissionsDao.batchBind({
          roleId: role.id,
          permissions: permissions.map(graphqlPermissionToModel),
        });
      }
      return new RoleModel(rolesDao, rolePermissionsDao, role.id, role);
    },
    role: async (_, { id }, context) => {
      const { rolesDao, rolePermissionsDao } = context;
      const role = await rolesDao.get(id);
      return new RoleModel(rolesDao, rolePermissionsDao, id, role);
    },
  },
  Query: {
    role: async (_, { id }, context) => {
      const { rolesDao, rolePermissionsDao } = context;
      const role = await rolesDao.get(id);
      return new RoleModel(rolesDao, rolePermissionsDao, id, role);
    },
    roles: async (_, __, context) => {
      const { rolesDao, rolePermissionsDao } = context;
      const roles: RoleModel[] = [];
      for await (const role of rolesDao.listAll()) {
        roles.push(new RoleModel(rolesDao, rolePermissionsDao, role.id, role));
      }
      return roles;
    },
  },
  Role: {
    addPermissions: async (role, { permissions }, context) => {
      const { rolePermissionsDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformUpdateRoleAction,
        ...context,
      });
      await rolePermissionsDao.batchBind({
        roleId: role.id,
        permissions: permissions.map(graphqlPermissionToModel),
      });
      return role;
    },
    bindToUser: async ({ id }, { userId }, context) => {
      const { userRolesDao, rolesDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformUpdateUserAndRoleAction,
        ...context,
      });
      await userRolesDao.bind({
        roleId: id,
        userId,
        rolesDao,
      });
      return new Web3UserModel(userId);
    },
    removePermissions: async (role, { permissions }, context) => {
      const { rolePermissionsDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformUpdateRoleAction,
        ...context,
      });
      await rolePermissionsDao.batchUnlink({
        roleId: role.id,
        permissions: permissions.map(graphqlPermissionToModel),
      });
      return role;
    },
    unbindFromUser: async ({ id }, { userId }, context) => {
      const { userRolesDao, rolesDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformUpdateUserAndRoleAction,
        ...context,
      });
      await userRolesDao.unlink({
        roleId: id,
        userId,
        rolesDao,
      });
      return new Web3UserModel(userId);
    },
    delete: async ({ id }, _, context) => {
      const { rolesDao, userRolesDao, rolePermissionsDao } = context;
      await verifyAuthorizedUser({
        authorizer: canPerformDeleteRoleAction,
        ...context,
      });
      await rolesDao.deleteRole(userRolesDao, rolePermissionsDao, id);
      return true;
    },
    id: (role) => role.id,
    name: async (role) => (await role.name()) ?? "",
    permissions: async (role) => (await role.permissions()) ?? [],
    userCount: async (role) => (await role.userCount()) ?? 0,
  },
};
