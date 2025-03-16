import { ApolloError } from "apollo-server-errors";

export type TReason = "INVALID_DESTINATION_ADDRESS" | "INVALID_FILE";
function reasonToMessage(reason: TReason): string {
  switch (reason) {
    case "INVALID_DESTINATION_ADDRESS":
      return "Invalid destination address";
    case "INVALID_FILE":
      return "Invalid file";
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
