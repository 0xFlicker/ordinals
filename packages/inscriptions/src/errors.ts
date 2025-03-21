export class RateLimitedError extends Error {}
export class PaddingTooLowError extends Error {
  public minPaddingNeeded: number;

  constructor(paddingGiven: number, minPaddingNeeded: number) {
    super(
      `Padding too low. The minimum padding needed is ${minPaddingNeeded} but only ${paddingGiven} provided.`,
    );
    this.minPaddingNeeded = minPaddingNeeded;
  }
}
export class InvalidAddressError extends Error {
  constructor(address: string) {
    super(`Invalid address: ${address}`);
  }
}

export class CannotFitInscriptionsError extends Error {
  constructor(fundingId?: string) {
    super(
      `Cannot fit inscriptions into transaction.${
        fundingId ? ` Funding ID: ${fundingId}` : ""
      }`,
    );
  }
}
