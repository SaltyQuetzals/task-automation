import { test, expect } from "bun:test";
import {
  BillAutomationError,
  ValidationError,
  EnvValidationError,
  ConfigValidationError,
  SchemaValidationError,
  ServiceError,
  PdfError,
  GeminiError,
  YnabError,
  VenmoError,
} from "./index";

test("BillAutomationError - creates error with code and cause", () => {
  const cause = new Error("Original error");
  const error = new BillAutomationError("Test error", "TEST_CODE", cause);

  expect(error.message).toBe("Test error");
  expect(error.code).toBe("TEST_CODE");
  expect(error.cause).toBe(cause);
  expect(error.name).toBe("BillAutomationError");
  expect(error instanceof BillAutomationError).toBe(true);
});

test("BillAutomationError - toString includes cause", () => {
  const cause = new Error("Root cause");
  const error = new BillAutomationError("Main error", "CODE", cause);
  const str = error.toString();

  expect(str).toContain("BillAutomationError");
  expect(str).toContain("Main error");
  expect(str).toContain("Root cause");
});

test("ValidationError - extends BillAutomationError", () => {
  const error = new ValidationError("Invalid input");

  expect(error instanceof ValidationError).toBe(true);
  expect(error instanceof BillAutomationError).toBe(true);
  expect(error.code).toBe("VALIDATION_ERROR");
});

test("EnvValidationError - includes missing variables", () => {
  const missingVars = ["VAR_A", "VAR_B", "VAR_C"];
  const error = new EnvValidationError(missingVars);

  expect(error.message).toContain("Missing required environment variables");
  expect(error.message).toContain("VAR_A");
  expect(error.missingVars).toEqual(missingVars);
  expect(error instanceof ValidationError).toBe(true);
});

test("ConfigValidationError - extends ValidationError", () => {
  const error = new ConfigValidationError("Invalid config");

  expect(error instanceof ConfigValidationError).toBe(true);
  expect(error instanceof ValidationError).toBe(true);
});

test("SchemaValidationError - extends ValidationError", () => {
  const error = new SchemaValidationError("Schema invalid");

  expect(error instanceof SchemaValidationError).toBe(true);
  expect(error instanceof ValidationError).toBe(true);
});

test("ServiceError - includes service name and status code", () => {
  const error = new ServiceError("TestService", "Connection failed", 500);

  expect(error.message).toContain("TestService");
  expect(error.message).toContain("Connection failed");
  expect(error.message).toContain("500");
  expect(error.service).toBe("TestService");
  expect(error.statusCode).toBe(500);
});

test("ServiceError - works without status code", () => {
  const error = new ServiceError("TestService", "Timeout");

  expect(error.message).toContain("TestService");
  expect(error.message).toContain("Timeout");
  expect(error.statusCode).toBeUndefined();
});

test("PdfError - extends ServiceError", () => {
  const error = new PdfError("Failed to load PDF", 400);

  expect(error instanceof PdfError).toBe(true);
  expect(error instanceof ServiceError).toBe(true);
  expect(error.service).toBe("PDF");
  expect(error.statusCode).toBe(400);
});

test("GeminiError - extends ServiceError", () => {
  const error = new GeminiError("API call failed", 503);

  expect(error instanceof GeminiError).toBe(true);
  expect(error instanceof ServiceError).toBe(true);
  expect(error.service).toBe("Gemini");
});

test("YnabError - extends ServiceError", () => {
  const error = new YnabError("Invalid transaction", 422);

  expect(error instanceof YnabError).toBe(true);
  expect(error instanceof ServiceError).toBe(true);
  expect(error.service).toBe("YNAB");
});

test("VenmoError - extends ServiceError", () => {
  const error = new VenmoError("Unauthorized", 401);

  expect(error instanceof VenmoError).toBe(true);
  expect(error instanceof ServiceError).toBe(true);
  expect(error.service).toBe("Venmo");
});

test("Error hierarchy - instanceof checks work correctly", () => {
  const validationError = new ValidationError("Test");
  const serviceError = new YnabError("Test");

  expect(validationError instanceof ValidationError).toBe(true);
  expect(validationError instanceof BillAutomationError).toBe(true);

  expect(serviceError instanceof YnabError).toBe(true);
  expect(serviceError instanceof ServiceError).toBe(true);
  expect(serviceError instanceof BillAutomationError).toBe(true);

  // Cross checks should fail
  expect(validationError instanceof ServiceError).toBe(false);
  expect(serviceError instanceof ValidationError).toBe(false);
});

test("Error with cause chain", () => {
  const originalError = new Error("Original");
  const wrappedError = new PdfError("PDF Failed", 500, originalError);

  expect(wrappedError.cause).toBe(originalError);
  expect(wrappedError.toString()).toContain("Original");
});
