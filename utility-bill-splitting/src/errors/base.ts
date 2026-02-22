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
      result += `\nCause: ${this.cause instanceof Error ? this.cause.message : String(this.cause)}`;
    }
    return result;
  }
}
