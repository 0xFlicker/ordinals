import { z } from "zod";

// Zod schemas matching JWT structures
export const NewUserJwtPayloadSchema = z.object({
  address: z.object({
    address: z.string(),
    type: z.enum(["EVM", "BTC"]),
  }),
  nonce: z.string(),
});

export const AddressAdditionJwtPayloadSchema = z.object({
  address: z.object({
    address: z.string(),
    type: z.enum(["EVM", "BTC"]),
  }),
});

export const LoginJwtPayloadSchema = z.object({
  // dynamic key validation will happen in function, see below
});
