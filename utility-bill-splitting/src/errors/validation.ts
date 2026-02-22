import { BillAutomationError } from "./base";

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends BillAutomationError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Environment variable validation error
 */
export class EnvValidationError extends ValidationError {
  constructor(
    public missingVars: string[],
    cause?: unknown
  ) {
    const message = `Missing required environment variables: ${missingVars.join(", ")}`;
    super(message, cause);
    Object.setPrototypeOf(this, EnvValidationError.prototype);
  }
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends ValidationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, ConfigValidationError.prototype);
  }
}

/**
 * Schema validation error - thrown when Zod schema validation fails
 */
export class SchemaValidationError extends ValidationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}
