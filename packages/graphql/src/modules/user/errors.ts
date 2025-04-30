import { ApolloError } from "apollo-server-errors";

export type TReason =
  | "INVALID_REQUEST"
  | "INVALID_ADDRESS"
  | "INVALID_DOMAIN"
  | "INVALID_URI"
  | "INVALID_VERSION"
  | "INVALID_EXPIRATION"
  | "INVALID_SIGNATURE"
  | "INVALID_NONCE";
function reasonToMessage(reason: TReason): string {
  switch (reason) {
    case "INVALID_REQUEST":
      return "Invalid request";
    case "INVALID_ADDRESS":
      return "Invalid address";
    case "INVALID_DOMAIN":
      return "Invalid domain";
    case "INVALID_URI":
      return "Invalid uri";
    case "INVALID_VERSION":
      return "Invalid version";
    case "INVALID_EXPIRATION":
      return "Invalid expiration";
    case "INVALID_SIGNATURE":
      return "Invalid signature";
    case "INVALID_NONCE":
      return "Invalid nonce";
    default:
      return "Unknown error";
  }
}

export class UserError extends ApolloError {
  constructor(reason: TReason, message?: string) {
    const reasonMessage = reasonToMessage(reason);
    super(message ? `${reasonMessage}: ${message}` : reasonMessage);
  }
}
