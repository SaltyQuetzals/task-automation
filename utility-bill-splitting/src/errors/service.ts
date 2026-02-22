import { BillAutomationError } from "./base";

/**
 * Service error - base class for external service failures
 */
export class ServiceError extends BillAutomationError {
  constructor(
    public service: string,
    message: string,
    public statusCode?: number,
    cause?: unknown
  ) {
    const fullMessage = statusCode ? `${service} (${statusCode}): ${message}` : `${service}: ${message}`;
    super(fullMessage, "SERVICE_ERROR", cause);
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * PDF processing error
 */
export class PdfError extends ServiceError {
  constructor(message: string, statusCode?: number, cause?: unknown) {
    super("PDF", message, statusCode, cause);
    Object.setPrototypeOf(this, PdfError.prototype);
  }
}

/**
 * Google Gemini API error
 */
export class GeminiError extends ServiceError {
  constructor(message: string, statusCode?: number, cause?: unknown) {
    super("Gemini", message, statusCode, cause);
    Object.setPrototypeOf(this, GeminiError.prototype);
  }
}

/**
 * YNAB API error
 */
export class YnabError extends ServiceError {
  constructor(message: string, statusCode?: number, cause?: unknown) {
    super("YNAB", message, statusCode, cause);
    Object.setPrototypeOf(this, YnabError.prototype);
  }
}

/**
 * Venmo API error
 */
export class VenmoError extends ServiceError {
  constructor(message: string, statusCode?: number, cause?: unknown) {
    super("Venmo", message, statusCode, cause);
    Object.setPrototypeOf(this, VenmoError.prototype);
  }
}
