import { test, expect, beforeEach, afterEach } from "bun:test";
import { GeminiService } from "./gemini.service";
import { setLogger, resetLogger } from "../lib/logger";

// Suppress logger output during tests
const noop = () => {};
const noopLogger = {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => noopLogger,
  level: "silent",
} as any;

beforeEach(() => {
  setLogger(noopLogger);
});

afterEach(() => {
  resetLogger();
});

// Mock the GoogleGenAI client
const mockResponse = {
  text: JSON.stringify({
    Water: 50.0,
    Electric: 120.5,
    "Clean Community Service": 1.0,
    "Street Service": 1.0,
    "Drainage Service": 1.0,
    "Solid Waste Services": 1.0,
    Wastewater: 1.0,
    dateDue: "2025-01-15",
  }),
};

test("GeminiService.extractBillData - successfully extracts bill data", async () => {
  const service = new GeminiService("test-api-key");

  // Mock the generateContent method
  service["client"].models.generateContent = async () => mockResponse as unknown as any;

  const result = await service.extractBillData("fake-base64", ["Water", "Electric"]);

  expect(result.categories).toBeDefined();
  expect(result.categories.Water).toBe(50.0);
  expect(result.categories.Electric).toBe(120.5);
  expect(result.dateDue).toBe("2025-01-15");
  // 50 + 120.5 + 5 category values of 1.0 = 175.5
  expect(result.totalAmount).toBe(175.5);
});

test("GeminiService.extractBillData - handles missing dateDue", async () => {
  const service = new GeminiService("test-api-key");

  const responseWithoutDate = {
    text: JSON.stringify({
      Water: 50.0,
      Electric: 1.0,
      "Clean Community Service": 1.0,
      "Street Service": 1.0,
      "Drainage Service": 1.0,
      "Solid Waste Services": 1.0,
      Wastewater: 1.0,
    }),
  };

  service["client"].models.generateContent = async () => responseWithoutDate as unknown as any;

  const result = await service.extractBillData("fake-base64", ["Water"]);

  expect(result.dateDue).toBeUndefined();
  expect(result.categories.Water).toBe(50.0);
});

test("GeminiService.extractBillData - throws on empty response", async () => {
  const service = new GeminiService("test-api-key");

  service["client"].models.generateContent = async () => ({ text: "" }) as unknown as any;

  try {
    await service.extractBillData("fake-base64", ["Water"]);
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("No text");
  }
});

test("GeminiService.extractBillData - calculates total amount correctly", async () => {
  const service = new GeminiService("test-api-key");

  service["client"].models.generateContent = async () => ({
    text: JSON.stringify({
      Water: 100.25,
      Electric: 200.75,
      Wastewater: 50.0,
      "Clean Community Service": 1.0,
      "Street Service": 1.0,
      "Drainage Service": 1.0,
      "Solid Waste Services": 1.0,
    }),
  }) as unknown as any;

  const result = await service.extractBillData("fake-base64", ["Water", "Electric", "Wastewater"]);

  // 100.25 + 200.75 + 50 + 4 category values of 1.0 = 355
  expect(result.totalAmount).toBe(355.0);
});

test("GeminiService.extractBillData - retries on timeout error", async () => {
  const service = new GeminiService("test-api-key");

  let callCount = 0;
  service["client"].models.generateContent = async () => {
    callCount++;
    if (callCount === 1) {
      // First call: timeout (AbortError) - must contain "Abort" to trigger retry
      await Promise.reject(new Error("The operation was aborted."));
    }
    // Second call: success
    return mockResponse as unknown as any;
  };

  try {
    const result = await service.extractBillData("fake-base64", ["Water", "Electric"]);
    expect(callCount).toBe(2);
    expect(result.categories.Water).toBe(50.0);
    expect(result.categories.Electric).toBe(120.5);
  } catch (error) {
    // If we got here, the retry didn't work
    expect.unreachable(`Should have retried and succeeded, but got: ${(error as Error).message}`);
  }
});

test("GeminiService.extractBillData - fails after max retries on timeout", async () => {
  const service = new GeminiService("test-api-key");

  let callCount = 0;
  service["client"].models.generateContent = async () => {
    callCount++;
    throw new Error("The operation was aborted.");
  };

  try {
    await service.extractBillData("fake-base64", ["Water"]);
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("aborted");
    // Should have tried 3 times (max retries)
    expect(callCount).toBe(3);
  }
});

test("GeminiService.extractBillData - does not retry on non-timeout errors", async () => {
  const service = new GeminiService("test-api-key");

  let callCount = 0;
  service["client"].models.generateContent = async () => {
    callCount++;
    throw new Error("Invalid API key");
  };

  try {
    await service.extractBillData("fake-base64", ["Water"]);
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("Invalid API key");
    // Should only be called once, no retries
    expect(callCount).toBe(1);
  }
});
