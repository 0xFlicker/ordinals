import { ApolloError } from "apollo-server-errors";

export type TReason =
  | "INVALID_DESTINATION_ADDRESS"
  | "INVALID_FILE"
  | "INVALID_REQUEST"
  | "INVALID_FEE_LEVEL";
function reasonToMessage(reason: TReason): string {
  switch (reason) {
    case "INVALID_DESTINATION_ADDRESS":
      return "Invalid destination address";
    case "INVALID_FILE":
      return "Invalid file";
    case "INVALID_REQUEST":
      return "Invalid request";
    case "INVALID_FEE_LEVEL":
      return "Invalid fee level";
    default:
      return "Unknown error";
  }
}

export class InscriptionRequestError extends ApolloError {
  constructor(reason: TReason, message?: string) {
    const reasonMessage = reasonToMessage(reason);
    super(message ? `${reasonMessage}: ${message}` : reasonMessage);
  }
}
