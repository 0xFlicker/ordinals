export enum UserAddressType {
  EVM = "EVM",
  BTC = "BTC",
}

export interface IUserAddress {
  type: UserAddressType;
  address: string;
}

export interface IUserNonce {
  address: IUserAddress;
  domain: string;
  nonce: string;
  uri: string;
  expiresAt: string;
  issuedAt: string;
  version?: string;
  chainId?: number;
}

export interface IUser {
  userId: string;
  handle?: string;
}

export interface IUserWithAddresses extends IUser {
  addresses: IUserAddress[];
}

export interface IUserWithRoles extends IUser {
  roleIds: string[];
}

export class UserNonceModel implements IUserNonce {
  public readonly address: IUserAddress;
  public readonly domain: string;
  public readonly nonce: string;
  public readonly uri: string;
  public readonly expiresAt: string;
  public readonly issuedAt: string;
  public readonly version?: string;
  public readonly chainId?: number;

  constructor(obj: IUserNonce) {
    this.address = obj.address;
    this.domain = obj.domain;
    this.nonce = obj.nonce;
    this.uri = obj.uri;
    this.expiresAt = obj.expiresAt;
    this.issuedAt = obj.issuedAt;
    this.version = obj.version;
    this.chainId = obj.chainId;
  }

  static fromJson(json: any): UserNonceModel {
    return new UserNonceModel(json);
  }

  toJson(): IUserNonce {
    return {
      address: this.address,
      domain: this.domain,
      nonce: this.nonce,
      uri: this.uri,
      expiresAt: this.expiresAt,
      issuedAt: this.issuedAt,
      version: this.version,
      chainId: this.chainId,
    };
  }
}

export class UserModel implements IUser {
  public readonly userId: string;
  public readonly handle?: string;

  constructor(obj: IUser) {
    this.userId = obj.userId;
    this.handle = obj.handle;
  }

  static fromJson(json: any): UserModel {
    return new UserModel(json);
  }

  toJson(): IUser {
    const json: IUser = {
      userId: this.userId,
    };
    if (this.handle !== undefined) {
      json.handle = this.handle;
    }
    return json;
  }
}

export class UserWithAddressesModel
  extends UserModel
  implements IUserWithAddresses
{
  public readonly addresses: IUserAddress[];

  constructor(obj: IUserWithAddresses) {
    super(obj);
    this.addresses = obj.addresses;
  }

  static fromJson(json: any): UserWithAddressesModel {
    return new UserWithAddressesModel(json);
  }

  toJson(): IUserWithAddresses {
    return {
      ...super.toJson(),
      addresses: this.addresses,
    };
  }
}

export class UserWithRolesModel extends UserModel implements IUserWithRoles {
  public readonly roleIds: string[];

  constructor(obj: IUserWithRoles) {
    super(obj);
    this.roleIds = obj.roleIds;
  }

  static fromJson(json: any): UserWithRolesModel {
    return new UserWithRolesModel(json);
  }

  toJson(): IUserWithRoles {
    return {
      ...super.toJson(),
      roleIds: this.roleIds,
    };
  }
}
