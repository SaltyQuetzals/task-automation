/**
 * Base error class for all bill automation errors
 * Includes context, error code, and original cause for debugging
 */
export class BillAutomationError extends Error {
  constructor(
    message: string,
    public code: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BillAutomationError.prototype);
  }

  /**
   * Format error for logging
   */
  override toString(): string {
    let result = `${this.name}: ${this.message}`;
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
