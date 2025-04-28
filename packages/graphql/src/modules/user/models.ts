import {
  UserDAO,
  UserRolesDAO,
  UserWithRolesModel,
} from "@0xflick/ordinals-rbac";

export class Web3UserModel {
  public readonly id: string;
  public readonly token?: string;
  private _handle: Promise<string> | null;
  public readonly userDao: UserDAO;

  constructor({
    userId,
    token,
    handle,
    userDao,
  }: {
    userId: string;
    token?: string;
    handle?: string;
    userDao: UserDAO;
  }) {
    this.id = userId;
    this.token = token;
    this._handle = handle ? Promise.resolve(handle) : null;
    this.userDao = userDao;
  }

  public get handle() {
    if (this._handle) {
      return this._handle;
    }
    this._handle = this.primeHandle();
    return this._handle;
  }

  private async primeHandle() {
    const { handle } = await this.userDao.getUserById({ userId: this.id });
    return handle ?? "UNKNOWN";
  }

  private _promiseUserRoles: Promise<UserWithRolesModel> | null = null;
  private async prime({ userRolesDao }: { userRolesDao: UserRolesDAO }) {
    if (this._promiseUserRoles === null) {
      this._promiseUserRoles = Promise.resolve().then(async () => {
        const roleIds: string[] = [];
        for await (const roleId of userRolesDao.getRoleIds(this.id)) {
          roleIds.push(roleId);
        }
        return new UserWithRolesModel({
          userId: this.id,
          roleIds,
        });
      });
    }
    return this._promiseUserRoles;
  }

  public async withRoles({ userRolesDao }: { userRolesDao: UserRolesDAO }) {
    return await this.prime({ userRolesDao });
  }
}
