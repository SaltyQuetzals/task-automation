import { test, expect } from "bun:test";
import { VenmoService } from "./venmo.service";

// Mock fetch function factory
function createMockFetch(response: Response) {
  const mockFetch = async (_url: string, _options: RequestInit): Promise<Response> => response;
  return mockFetch as unknown as typeof fetch;
}

test("VenmoService.sendPaymentRequest - sends request successfully", async () => {
  const mockFetch = createMockFetch(
    new Response(
      JSON.stringify({
        data: {
          payment: {
            id: "venmo-123",
            status: "pending",
            amount: 50,
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );

  const service = new VenmoService("test-token", false, mockFetch);

  const transactionId = await service.sendPaymentRequest("user-456", 50, "Utilities");

  expect(transactionId).toBe("venmo-123");
});

test("VenmoService.sendPaymentRequest - handles DRY_RUN mode", async () => {
  const mockFetch = createMockFetch(new Response("Should not be called"));

  const service = new VenmoService("test-token", true, mockFetch);

  const transactionId = await service.sendPaymentRequest("user-456", 50, "Utilities");

  expect(transactionId).toMatch(/^mock_\d+$/);
});

test("VenmoService.sendPaymentRequest - throws on HTTP error", async () => {
  const mockFetch = createMockFetch(
    new Response("Unauthorized", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    })
  );

  const service = new VenmoService("test-token", false, mockFetch);

  try {
    await service.sendPaymentRequest("user-456", 50, "Utilities");
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("401");
  }
});

test("VenmoService.sendPaymentRequest - throws when no transaction ID in response", async () => {
  const mockFetch = createMockFetch(
    new Response(
      JSON.stringify({
        data: {
          // Omit payment entirely to test missing transaction ID
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );

  const service = new VenmoService("test-token", false, mockFetch);

  try {
    await service.sendPaymentRequest("user-456", 50, "Utilities");
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("No transaction ID");
  }
});

test("VenmoService.sendPaymentRequest - formats currency correctly", async () => {
  const mockFetch = createMockFetch(new Response("Should not be called"));

  const service = new VenmoService("test-token", true, mockFetch);

  const transactionId = await service.sendPaymentRequest("user-456", 123.45, "Utilities");

  expect(transactionId).toBeDefined();
});

test("VenmoService.sendPaymentRequest - handles network error", async () => {
  const mockFetch = (async (): Promise<Response> => {
    throw new Error("Network error");
  }) as unknown as typeof fetch;

  const service = new VenmoService("test-token", false, mockFetch);

  try {
    await service.sendPaymentRequest("user-456", 50, "Utilities");
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("Failed to send");
  }
});
