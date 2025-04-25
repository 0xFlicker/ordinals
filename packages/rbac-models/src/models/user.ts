import { importSPKI, JWTPayload, jwtVerify, KeyLike } from "jose";
import { generateRolesFromIds, namespacedClaim, TokenModel } from "./token.js";

export interface INonceRequest {
  userId?: string;
  address: IUserAddress;
  domain: string;
  nonce: string;
  uri: string;
  expiresAt: string;
  issuedAt: string;
  version?: string;
  chainId?: number;
}

export enum UserAddressType {
  EVM = "evm",
  BTC = "btc",
}

export interface IUserAddress {
  type: UserAddressType;
  address: string;
}

export interface IUser {
  userId: string;
  addresses: IUserAddress[];
  nonce?: string;
}

export interface IUserWithRoles {
  userId: string;
  addresses: IUserAddress[];
  roleIds: string[];
  nonceClaim?: string;
  decodedToken?: JWTPayload;
}

export class UserTokenExpiredError extends Error {
  constructor() {
    super("User token has expired");
  }
}

export class UserTokenNoAddressError extends Error {
  constructor() {
    super("User token has no address");
  }
}

export class UserTokenNoNonceError extends Error {
  constructor() {
    super("User token has no nonce");
  }
}

export class UserTokenIssuerMismatchError extends Error {
  constructor() {
    super("User token issuer does not match");
  }
}

export class UserTokenRolesMismatchError extends Error {
  constructor() {
    super("User token roles does not match");
  }
}

export function roleIdsToAddresses(roleIds: string[]): IUserAddress[] {
  return roleIds
    .map((roleId) => {
      const [type, address] = roleId.split("#");
      switch (type) {
        case "EVM":
          return {
            type: UserAddressType.EVM,
            address,
          };
        case "BTC":
          return {
            type: UserAddressType.BTC,
            address,
          };
        default:
          return null;
      }
    })
    .filter((a) => a !== null) as IUserAddress[];
}

/**
 *
 * @param token
 * @param roleIds
 * @param nonce
 * @returns {Promise<UserWithRolesModel>}
 * @throws UserTokenExpiredError | UserTokenNoAddressError | UserTokenNoNonceError | UserTokenIssuerMismatchError | UserTokenRolesMismatchError
 */
export async function verifyJwtToken({
  token,
  roleIds,
  nonce,
  payload,
  issuer,
  addressType,
}: {
  token: string;
  roleIds?: string[];
  nonce?: string;
  payload?: JWTPayload;
  issuer: string;
  addressType?: string;
}): Promise<UserWithRolesModel> {
  const result = await jwtVerify(token, await promisePublicKey, {
    ...payload,
    ...generateRolesFromIds({
      roles: roleIds,
      issuer,
    }),
    ...(typeof addressType === "string"
      ? {
          [namespacedClaim("at", issuer)]: addressType,
        }
      : {}),
    ...(typeof nonce === "string"
      ? {
          [namespacedClaim("nonce", issuer)]: nonce,
        }
      : {}),
    issuer,
  });

  const userId = result.payload.sub;
  if (!userId) {
    throw new UserTokenNoAddressError();
  }
  const roleNamespace = namespacedClaim("role/", issuer);
  const roleIdsFromToken = Object.entries(result.payload)
    .filter(([k, v]) => v && k.includes(roleNamespace))
    .map(([k]) => k.replace(roleNamespace, ""));

  if (roleIds && roleIdsFromToken.length !== roleIds?.length) {
    throw new UserTokenRolesMismatchError();
  }
  for (const roleId of roleIdsFromToken) {
    if (roleIds && !roleIds.includes(roleId)) {
      throw new UserTokenRolesMismatchError();
    }
  }

  const expired =
    result.payload.exp && result.payload.exp * 1000 - Date.now() < 0;
  if (expired && result.payload.exp) {
    console.log("expiration on token", result.payload.exp * 1000, Date.now());
    throw new UserTokenExpiredError();
  }
  const nonceClaim = result.payload[namespacedClaim("nonce", issuer)] as string;
  if (typeof nonceClaim === "undefined") {
    throw new UserTokenNoNonceError();
  }
  return new UserWithRolesModel({
    userId,
    addresses: roleIdsToAddresses(roleIdsFromToken),
    roleIds: roleIdsFromToken,
    nonce,
    nonceClaim,
    decodedToken: result.payload,
  });
}

export class UserModel implements IUser {
  public readonly userId: string;
  public readonly addresses: IUserAddress[];
  public readonly nonce?: string;

  constructor(obj: IUser) {
    this.userId = obj.userId;
    this.addresses = obj.addresses;
    this.nonce = obj.nonce;
  }

  public fromPartial(partial: Partial<IUser>): UserModel {
    return UserModel.fromJson({
      ...this.toJson(),
      ...partial,
    });
  }

  public static fromJson(json: any): UserModel {
    return new UserModel({
      userId: json.userId,
      addresses: json.addresses,
      nonce: json.nonce,
    });
  }

  public toJson(): IUser {
    return {
      addresses: this.addresses,
      nonce: this.nonce,
      userId: this.userId,
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJson());
  }

  public equals(other: UserModel): boolean {
    return (
      this.addresses === other.addresses &&
      this.nonce === other.nonce &&
      this.userId === other.userId
    );
  }

  public clone(): UserModel {
    return new UserModel(this.toJson());
  }

  public static fromString(str: string): UserModel {
    return UserModel.fromJson(JSON.parse(str));
  }
}

export class UserWithRolesModel implements IUserWithRoles, IUser {
  public readonly userId: string;
  public readonly nonceClaim?: string;
  public roleIds: string[];

  public decodedToken?: JWTPayload;

  public get addresses(): IUserAddress[] {
    return this._user.addresses;
  }

  private _user: UserModel;

  constructor(obj: IUserWithRoles & IUser & { decodedToken?: JWTPayload }) {
    this._user = UserModel.fromJson(obj);
    this.roleIds = obj.roleIds;
    this.nonceClaim = obj.nonceClaim;
    this.decodedToken = obj.decodedToken;
    this.userId = obj.userId;
  }

  public get nonce(): string | undefined {
    return this._user.nonce;
  }

  public hasRole(roleId: string): boolean {
    return this.roleIds.includes(roleId);
  }

  public fromPartial(partial: Partial<IUserWithRoles>): UserWithRolesModel {
    return new UserWithRolesModel({
      ...this.toJson(),
      ...partial,
    });
  }

  public static fromJson(json: any): UserWithRolesModel {
    return new UserWithRolesModel({
      addresses: json.addresses,
      roleIds: json.roleIds,
      decodedToken: json.decodedToken,
      nonceClaim: json.nonceClaim,
      nonce: json.nonce,
      userId: json.userId,
    });
  }

  public toJson(): IUserWithRoles {
    return {
      addresses: this.addresses,
      roleIds: this.roleIds,
      nonceClaim: this.nonceClaim,
      decodedToken: this.decodedToken,
      userId: this.userId,
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJson());
  }
}

export const promisePublicKey = new Promise<KeyLike>(
  async (resolve, reject) => {
    if ((global as any).promisePrivateKeys) {
      await (global as any).promisePrivateKeys;
    }
    if (!process.env.AUTH_MESSAGE_PUBLIC_KEY) {
      resolve("" as any);
    }
    importSPKI(process.env.AUTH_MESSAGE_PUBLIC_KEY ?? "", "ECDH-ES+A128KW", {
      extractable: true,
    }).then(resolve, reject);
  },
);
