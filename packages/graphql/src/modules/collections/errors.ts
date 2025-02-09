import { ApolloError } from "apollo-server-errors";

export type TReason =
  | "COLLECTION_NOT_FOUND"
  | "COLLECTION_ALREADY_EXISTS"
  | "INVALID_METADATA"
  | "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND";
function reasonToMessage(reason: TReason): string {
  switch (reason) {
    case "COLLECTION_ALREADY_EXISTS":
      return "Collection already exists";
    case "INVALID_METADATA":
      return "Invalid metadata";
    case "COLLECTION_NOT_FOUND":
      return "Collection not found";
    case "COLLECTION_PARENT_INSCRIPTION_NOT_FOUND":
      return "Collection parent inscription not found";
    default:
      return "Unknown error";
  }
}

export class CollectionError extends ApolloError {
  constructor(reason: TReason, message?: string) {
    const reasonMessage = reasonToMessage(reason);
    super(message ? `${reasonMessage}: ${message}` : reasonMessage);
  }
}
