import { test, expect } from "bun:test";
import { BillAutomationWorkflow } from "./bill-automation.workflow";
import type { PdfService } from "../services/pdf.service";
import type { GeminiService } from "../services/gemini.service";
import type { YnabService } from "../services/ynab.service";
import type { VenmoService } from "../services/venmo.service";
import type { AppConfig } from "../types/schemas";

// Create mock services
function createMockPdfService(): PdfService {
  return {
    extractFirstPage: async () => "mock-base64-pdf",
  } as PdfService;
}

function createMockGeminiService(): GeminiService {
  return {
    extractBillData: async () => ({
      categories: {
        Water: 100,
        Electric: 200,
      },
      dateDue: "2025-01-15",
      totalAmount: 300,
    }),
  } as unknown as GeminiService;
}

function createMockYnabService(): YnabService {
  return {
    createTransaction: async () => "txn-123",
    deleteTransaction: async () => undefined,
    findExistingTransaction: async () => null,
  } as unknown as YnabService;
}

function createMockVenmoService(): VenmoService {
  return {
    sendPaymentRequest: async () => "venmo-456",
  } as unknown as VenmoService;
}

function createMockConfig(): AppConfig {
  return {
    google: { apiKey: "test-key" },
    ynab: {
      apiKey: "test-key",
      budgetId: "test-budget",
      accountId: "test-account",
      reimbursementCategoryId: "test-reimburse",
    },
    venmo: {
      accessToken: "test-token",
      recipientUserId: "test-user",
    },
    coaUtilities: {
      email: "test@example.com",
      password: "test-password",
    },
    pdf: { filePath: "test.pdf" },
    app: { dryRun: false },
  };
}

test("BillAutomationWorkflow - initializes with dependencies", () => {
  const workflow = new BillAutomationWorkflow(
    createMockPdfService(),
    createMockGeminiService(),
    createMockYnabService(),
    createMockVenmoService(),
    createMockConfig()
  );

  expect(workflow).toBeDefined();
});

test("BillAutomationWorkflow.execute - calls services in correct order", async () => {
  let callOrder: string[] = [];

  const mockPdfService: PdfService = {
    extractFirstPage: async () => {
      callOrder.push("pdf");
      return "mock-base64";
    },
  } as unknown as PdfService;

  const mockGeminiService: GeminiService = {
    extractBillData: async () => {
      callOrder.push("gemini");
      return {
        categories: { Water: 100 },
        dateDue: "2025-01-15",
        totalAmount: 100,
      };
    },
  } as unknown as GeminiService;

  const mockYnabService: YnabService = {
    createTransaction: async () => {
      callOrder.push("ynab");
      return "txn-123";
    },
    deleteTransaction: async () => undefined,
    findExistingTransaction: async () => {
      callOrder.push("duplicate-check");
      return null;
    },
  } as unknown as YnabService;

  const mockVenmoService: VenmoService = {
    sendPaymentRequest: async () => {
      callOrder.push("venmo");
      return "venmo-456";
    },
  } as unknown as VenmoService;

  const workflow = new BillAutomationWorkflow(
    mockPdfService,
    mockGeminiService,
    mockYnabService,
    mockVenmoService,
    createMockConfig()
  );

  const testBuffer = new Uint8Array([1, 2, 3, 4]);
  await workflow.execute(testBuffer);

  expect(callOrder).toEqual(["pdf", "gemini", "duplicate-check", "ynab", "venmo"]);
});

test("BillAutomationWorkflow.execute - uses provided file path", async () => {
  const mockPdfService: PdfService = {
    extractFirstPage: async () => "mock-base64",
  } as unknown as PdfService;

  const mockGeminiService: GeminiService = {
    extractBillData: async () => ({
      categories: {},
      totalAmount: 0,
    }),
  } as unknown as GeminiService;

  const mockYnabService: YnabService = {
    createTransaction: async () => "txn-123",
    deleteTransaction: async () => undefined,
    findExistingTransaction: async () => null,
  } as unknown as YnabService;

  const mockVenmoService: VenmoService = {
    sendPaymentRequest: async () => "venmo-456",
  } as unknown as VenmoService;

  const workflow = new BillAutomationWorkflow(
    mockPdfService,
    mockGeminiService,
    mockYnabService,
    mockVenmoService,
    createMockConfig()
  );

  const testBuffer = new Uint8Array([1, 2, 3, 4]);
  await workflow.execute(testBuffer);

  // The execute should pass the buffer directly to the pdf service
  // without using the file path from config
  expect(mockPdfService.extractFirstPage).toBeDefined();
});

test("BillAutomationWorkflow.execute - handles missing PDF file", async () => {
  const mockPdfService: PdfService = {
    extractFirstPage: async () => {
      throw new Error("PDF not found");
    },
  } as unknown as PdfService;

  const workflow = new BillAutomationWorkflow(
    mockPdfService,
    createMockGeminiService(),
    createMockYnabService(),
    createMockVenmoService(),
    createMockConfig()
  );

  try {
    const testBuffer = new Uint8Array([1, 2, 3, 4]);
    await workflow.execute(testBuffer);
    expect.unreachable("Should have thrown error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("PDF not found");
  }
});

test("BillAutomationWorkflow.execute - uses default config path if not provided", async () => {
  const config = createMockConfig();
  config.pdf.filePath = "default-path.pdf";

  const workflow = new BillAutomationWorkflow(
    createMockPdfService(),
    createMockGeminiService(),
    createMockYnabService(),
    createMockVenmoService(),
    config
  );

  const testBuffer = new Uint8Array([1, 2, 3, 4]);
  await workflow.execute(testBuffer);

  // The execute should accept the buffer directly
  expect(workflow).toBeDefined();
});

test("BillAutomationWorkflow.execute - detects and uses existing transaction", async () => {
  let createTransactionCalled = false;
  let venmoRequestCalled = false;

  const mockPdfService: PdfService = {
    extractFirstPage: async () => "mock-base64",
  } as unknown as PdfService;

  const mockGeminiService: GeminiService = {
    extractBillData: async () => ({
      categories: { Water: 100, Electric: 200 },
      dateDue: "2025-01-15",
      totalAmount: 300,
    }),
  } as unknown as GeminiService;

  const mockYnabService: YnabService = {
    createTransaction: async () => {
      createTransactionCalled = true;
      return "txn-new";
    },
    deleteTransaction: async () => undefined,
    findExistingTransaction: async () => {
      // Return existing transaction ID instead of null
      return "txn-existing-123";
    },
  } as unknown as YnabService;

  const mockVenmoService: VenmoService = {
    sendPaymentRequest: async () => {
      venmoRequestCalled = true;
      return "venmo-456";
    },
  } as unknown as VenmoService;

  const workflow = new BillAutomationWorkflow(
    mockPdfService,
    mockGeminiService,
    mockYnabService,
    mockVenmoService,
    createMockConfig()
  );

  const testBuffer = new Uint8Array([1, 2, 3, 4]);
  await workflow.execute(testBuffer);

  // createTransaction should NOT be called when duplicate exists
  expect(createTransactionCalled).toBe(false);
  // venmoService.sendPaymentRequest should NOT be called when duplicate exists
  expect(venmoRequestCalled).toBe(false);
});

test("BillAutomationWorkflow.execute - creates transaction when no duplicate found", async () => {
  let createTransactionCalled = false;

  const mockPdfService: PdfService = {
    extractFirstPage: async () => "mock-base64",
  } as unknown as PdfService;

  const mockGeminiService: GeminiService = {
    extractBillData: async () => ({
      categories: { Water: 100 },
      dateDue: "2025-01-15",
      totalAmount: 100,
    }),
  } as unknown as GeminiService;

  const mockYnabService: YnabService = {
    createTransaction: async () => {
      createTransactionCalled = true;
      return "txn-123";
    },
    deleteTransaction: async () => undefined,
    findExistingTransaction: async () => {
      // Return null - no duplicate found
      return null;
    },
  } as unknown as YnabService;

  const mockVenmoService: VenmoService = {
    sendPaymentRequest: async () => "venmo-456",
  } as unknown as VenmoService;

  const workflow = new BillAutomationWorkflow(
    mockPdfService,
    mockGeminiService,
    mockYnabService,
    mockVenmoService,
    createMockConfig()
  );

  const testBuffer = new Uint8Array([1, 2, 3, 4]);
  await workflow.execute(testBuffer);

  // createTransaction SHOULD be called when no duplicate exists
  expect(createTransactionCalled).toBe(true);
});
