import {
  TAllowedAction,
  TPermission,
  UserAddressType,
} from "@0xflick/ordinals-rbac-models";

import {
  IUserWithRoles,
  UserWithRolesAndAddressesModel,
} from "@0xflick/ordinals-rbac-models";

import { GetUserQuery } from "@/app/actions.generated";
import { IUserWithAddresses } from "@0xflick/ordinals-rbac-models";
import {
  graphQlAllowedActionToPermission,
  graphqlActionToEAction,
  graphqlResourceToEResource,
} from "@/features/auth/transforms/allowedActions";

export type TFullUser = IUserWithAddresses &
  IUserWithRoles & {
    allowedActions: TAllowedAction[];
    permissions: TPermission[];
  };

export function mapSelfToUser(self: GetUserQuery["user"]): TFullUser {
  const user = new UserWithRolesAndAddressesModel({
    userId: self?.id,
    handle: self?.handle,
    addresses: self?.addresses.map((address) => ({
      address: address.address,
      type: address.type === "BTC" ? UserAddressType.BTC : UserAddressType.EVM,
    })),
    roleIds: self?.roles.map((role) => role.id),
  }).toJson();
  return {
    ...user,
    allowedActions:
      self?.allowedActions.map(({ action, resource, identifier }) => ({
        action: graphqlActionToEAction(action),
        resource: graphqlResourceToEResource(resource),
        identifier: identifier ?? undefined,
      })) ?? [],
    permissions:
      self?.allowedActions?.map(graphQlAllowedActionToPermission) ?? [],
  };
}
