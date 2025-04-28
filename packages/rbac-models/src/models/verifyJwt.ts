import { JWTPayload, KeyLike, importSPKI, jwtVerify } from "jose";
import { z } from "zod";
import { UserAddressType, IUserAddress } from "./user.js";
import { namespacedClaim } from "./token.js";

// Strongly typed JWT payloads
export interface NewUserJwtPayload extends JWTPayload {
  address: IUserAddress;
  nonce: string;
}

export interface AddressAdditionJwtPayload extends JWTPayload {
  address: IUserAddress;
}

export interface LoginJwtPayload extends JWTPayload {
  [key: string]: unknown;
}

// Return types
export interface VerifiedNewUserInfo {
  address: IUserAddress;
  nonce: string;
}

export interface VerifiedAddressInfo {
  userId: string;
  newAddress: IUserAddress;
}

export interface VerifiedLoginInfo {
  userId: string;
}

// Runtime validation schemas
const NewUserJwtPayloadSchema = z.object({
  address: z.object({
    address: z.string(),
    type: z.enum(["EVM", "BTC"]),
  }),
  nonce: z.string(),
});

const AddressAdditionJwtPayloadSchema = z.object({
  address: z.object({
    address: z.string(),
    type: z.enum(["EVM", "BTC"]),
  }),
});

// Small reusable validator
function assertValidPayload<T>(payload: unknown, schema: z.Schema<T>): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error("Invalid JWT payload structure");
  }
  return result.data;
}

export function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export async function importSPKIKey(pem: string) {
  return await importSPKI(pem, "ES512");
}

function mapAddressType(type: "EVM" | "BTC"): UserAddressType {
  switch (type) {
    case "EVM":
      return UserAddressType.EVM;
    case "BTC":
      return UserAddressType.BTC;
    default:
      throw new Error("Invalid address type");
  }
}

export async function verifyJwtToken<T extends JWTPayload = JWTPayload>(
  token: string,
  publicKey?: KeyLike,
): Promise<T> {
  publicKey = publicKey ?? (await promisePublicKey);
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["ES512"],
  });

  const exp = payload.exp;
  if (typeof exp === "number" && exp * 1000 < Date.now()) {
    throw new Error("JWT expired");
  }

  return payload as T;
}

// New user account creation
export async function verifyJwtForNewUserCreation(
  token: string,
  publicKey?: KeyLike,
): Promise<VerifiedNewUserInfo> {
  const payload = await verifyJwtToken<NewUserJwtPayload>(token, publicKey);

  const { address, nonce } = assertValidPayload(
    payload,
    NewUserJwtPayloadSchema,
  );

  return {
    address: {
      address: address.address!,
      type: mapAddressType(address.type),
    },
    nonce,
  };
}

// Add verified address to existing user
export async function verifyJwtForAddressAddition(
  token: string,
  expectedUserId: string,
  publicKey?: KeyLike,
): Promise<VerifiedAddressInfo> {
  const payload = await verifyJwtToken<AddressAdditionJwtPayload>(
    token,
    publicKey,
  );

  const { address } = assertValidPayload(
    payload,
    AddressAdditionJwtPayloadSchema,
  );
  const sub = payload.sub;

  if (!sub) {
    throw new Error("JWT missing subject (userId)");
  }
  if (sub !== expectedUserId) {
    throw new Error("User ID mismatch in token");
  }

  return {
    userId: sub,
    newAddress: {
      address: address.address!,
      type: mapAddressType(address.type),
    },
  };
}

// User login
export async function verifyJwtForLogin(
  token: string,
  publicKey?: KeyLike,
): Promise<VerifiedLoginInfo> {
  const payload = await verifyJwtToken<LoginJwtPayload>(token, publicKey);

  const sub = payload.sub;

  if (!sub) {
    throw new Error("Missing user ID in token");
  }

  return {
    userId: sub,
  };
}

// Public key lazy-loaded promise
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
