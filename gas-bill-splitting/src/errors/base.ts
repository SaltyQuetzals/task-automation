/**
 * Base error class for gas bill automation errors
 */
export class GasBillError extends Error {
  constructor(
    message: string,
    public step: "fetch" | "calculate" | "update_ynab" | "send_venmo" | "mark_processed",
    public override cause?: unknown
  ) {
    super(message);
    this.name = "GasBillError";
    Object.setPrototypeOf(this, GasBillError.prototype);
  }

  override toString(): string {
    let result = `${this.name} [${this.step}]: ${this.message}`;
    if (this.cause) {
      if (this.cause instanceof Error) {
        result += `\nCause: ${this.cause.message}`;
      } else if (typeof this.cause === "object") {
        result += `\nCause: ${JSON.stringify(this.cause, null, 2)}`;
      } else {
        result += `\nCause: ${String(this.cause)}`;
      }
    }
    return result;
  }
}

/**
 * Error when transaction lookup fails
 */
export class TransactionLookupError extends GasBillError {
  constructor(message: string, cause?: unknown) {
    super(message, "fetch", cause);
    this.name = "TransactionLookupError";
    Object.setPrototypeOf(this, TransactionLookupError.prototype);
  }
}

/**
 * Error when YNAB operations fail
 */
export class YnabOperationError extends GasBillError {
  constructor(message: string, cause?: unknown) {
    super(message, "update_ynab", cause);
    this.name = "YnabOperationError";
    Object.setPrototypeOf(this, YnabOperationError.prototype);
  }
}

/**
 * Error when Venmo operations fail
 */
export class VenmoOperationError extends GasBillError {
  constructor(message: string, cause?: unknown) {
    super(message, "send_venmo", cause);
    this.name = "VenmoOperationError";
    Object.setPrototypeOf(this, VenmoOperationError.prototype);
  }
}
