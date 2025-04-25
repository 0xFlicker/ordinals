import {
  roleIdsToAddresses,
  UserRolesDAO,
  UserWithRolesModel,
} from "@0xflick/ordinals-rbac";

export class Web3UserModel {
  public readonly userId: string;
  public readonly token?: string;

  constructor(userId: string, token?: string) {
    this.userId = userId;
    this.token = token;
  }

  private _promiseUserRoles: Promise<UserWithRolesModel> | null = null;
  private async prime({ userRolesDao }: { userRolesDao: UserRolesDAO }) {
    if (this._promiseUserRoles === null) {
      this._promiseUserRoles = Promise.resolve().then(async () => {
        const roleIds: string[] = [];
        for await (const roleId of userRolesDao.getRoleIds(this.userId)) {
          roleIds.push(roleId);
        }
        return new UserWithRolesModel({
          userId: this.userId,
          roleIds,
          addresses: roleIdsToAddresses(roleIds),
        });
      });
    }
    return this._promiseUserRoles;
  }

  public async withRoles({ userRolesDao }: { userRolesDao: UserRolesDAO }) {
    return await this.prime({ userRolesDao });
  }
}

export class Web3LoginUserModel {
  public readonly userId: string;
  public readonly token: string;
  public readonly user: Web3UserModel;

  constructor({ userId, token }: { userId: string; token: string }) {
    this.userId = userId;
    this.token = token;
    this.user = new Web3UserModel(userId, token);
  }
}
