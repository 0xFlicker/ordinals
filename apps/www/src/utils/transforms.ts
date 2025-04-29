import { UserAddressType } from "@0xflick/ordinals-rbac-models";

import {
  IUserWithRoles,
  UserWithRolesAndAddressesModel,
} from "@0xflick/ordinals-rbac-models";

import { GetUserQuery } from "@/app/actions.generated";
import { IUserWithAddresses } from "@0xflick/ordinals-rbac-models";

export function mapSelfToUser(
  self: GetUserQuery["user"]
): (IUserWithAddresses & IUserWithRoles) | null {
  if (!self || !self.addresses || !self.roles) {
    return null;
  }
  return new UserWithRolesAndAddressesModel({
    userId: self?.id,
    handle: self?.handle,
    addresses: self?.addresses.map((address) => ({
      address: address.address,
      type: address.type === "BTC" ? UserAddressType.BTC : UserAddressType.EVM,
    })),
    roleIds: self?.roles.map((role) => role.id),
  }).toJson();
}
