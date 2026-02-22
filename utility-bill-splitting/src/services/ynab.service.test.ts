import { test, expect } from "bun:test";
import { YnabService } from "./ynab.service";
import type { SplitItem } from "../types/bill";

// Mock YNAB client
const mockCreateResponse = {
  data: {
    transactions: [{ id: "txn-123" }],
  },
};

const mockDeleteResponse = undefined;

test("YnabService.createTransaction - successfully creates transaction", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  // Mock the API call
  service["client"].transactions.createTransactions = async () => mockCreateResponse as any;

  const splitItems: SplitItem[] = [
    { description: "Water", amount: 100, yourShare: 50, categoryId: "water-cat" },
    { description: "Electric", amount: 200, yourShare: 100, categoryId: "electric-cat" },
  ];

  const transactionId = await service.createTransaction(splitItems, "2025-01-15");

  expect(transactionId).toBe("txn-123");
});

test("YnabService.createTransaction - handles transaction response from data.transaction", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  // Mock alternative response structure
  service["client"].transactions.createTransactions = async () => ({
    data: {
      transaction: { id: "txn-456" },
    },
  }) as any;

  const splitItems: SplitItem[] = [{ description: "Water", amount: 100, yourShare: 50 }];

  const transactionId = await service.createTransaction(splitItems);

  expect(transactionId).toBe("txn-456");
});

test("YnabService.createTransaction - throws when no transaction ID in response", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  service["client"].transactions.createTransactions = async () => ({
    data: {},
  }) as any;

  const splitItems: SplitItem[] = [{ description: "Water", amount: 100, yourShare: 50 }];

  try {
    await service.createTransaction(splitItems);
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("No transaction ID");
  }
});

test("YnabService.createTransaction - handles rounding correctly", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  let capturedTransaction: any;
  service["client"].transactions.createTransactions = async (_budgetId, wrapper) => {
    capturedTransaction = wrapper;
    return mockCreateResponse as any;
  };

  const splitItems: SplitItem[] = [
    { description: "Water", amount: 100.33, yourShare: 50.165, categoryId: "water-cat" },
    { description: "Electric", amount: 100.33, yourShare: 50.165, categoryId: "electric-cat" },
  ];

  await service.createTransaction(splitItems);

  // Check that amounts are in milliunits
  const subtransactions = capturedTransaction.transaction.subtransactions;
  const totalAmount = 100.33 + 100.33; // 200.66
  const totalMilliunits = Math.round(totalAmount * 1000); // 200660
  expect(subtransactions[0].amount).toBe(50165); // 50.165 * 1000
  expect(subtransactions[1].amount).toBe(50165);
  // Reimbursement should balance the total
  expect(subtransactions[2].amount).toBe(totalMilliunits - 50165 - 50165); // Total - splits
});

test("YnabService.deleteTransaction - successfully deletes transaction", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  service["client"].transactions.deleteTransaction = async () => mockDeleteResponse as any;

  await service.deleteTransaction("txn-123");
  // If no error is thrown, test passes
});

test("YnabService.deleteTransaction - throws on API error", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  service["client"].transactions.deleteTransaction = async () => {
    throw new Error("API Error");
  };

  try {
    await service.deleteTransaction("txn-123");
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain("Failed to delete");
  }
});

test("YnabService.createTransaction - uses today's date if not provided", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  let capturedDate: string | undefined;
  service["client"].transactions.createTransactions = async (_budgetId, wrapper) => {
    capturedDate = wrapper.transaction?.date;
    return mockCreateResponse as any;
  };

  const splitItems: SplitItem[] = [{ description: "Water", amount: 100, yourShare: 50 }];
  await service.createTransaction(splitItems);

  // Check that date is in YYYY-MM-DD format
  expect(capturedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("YnabService.findExistingTransaction - finds matching transaction", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  const mockTransactions = {
    data: {
      transactions: [
        {
          id: "existing-txn-123",
          date: "2025-01-15",
          amount: 200000, // 200 * 1000 milliunits
          memo: "Utilities Split - Automatically Created",
        },
      ],
    },
  };

  service["client"].transactions.getTransactionsByAccount = async () => mockTransactions as any;

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBe("existing-txn-123");
});

test("YnabService.findExistingTransaction - handles negative amounts", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  const mockTransactions = {
    data: {
      transactions: [
        {
          id: "existing-txn-456",
          date: "2025-01-15",
          amount: -200000, // Negative amount
          memo: "Utilities Split - Automatically Created",
        },
      ],
    },
  };

  service["client"].transactions.getTransactionsByAccount = async () => mockTransactions as any;

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBe("existing-txn-456");
});

test("YnabService.findExistingTransaction - returns null when no match found", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  const mockTransactions = {
    data: {
      transactions: [
        {
          id: "other-txn",
          date: "2025-01-15",
          amount: 150000, // Different amount
          memo: "Other transaction",
        },
      ],
    },
  };

  service["client"].transactions.getTransactionsByAccount = async () => mockTransactions as any;

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBeNull();
});

test("YnabService.findExistingTransaction - ignores non-utilities transactions", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  const mockTransactions = {
    data: {
      transactions: [
        {
          id: "other-txn",
          date: "2025-01-15",
          amount: 200000,
          memo: "Grocery shopping", // No utilities/auto-created marker
        },
      ],
    },
  };

  service["client"].transactions.getTransactionsByAccount = async () => mockTransactions as any;

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBeNull();
});

test("YnabService.findExistingTransaction - handles API errors gracefully", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  service["client"].transactions.getTransactionsByAccount = async () => {
    throw new Error("API connection failed");
  };

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBeNull();
});

test("YnabService.findExistingTransaction - returns null when no transactions in response", async () => {
  const service = new YnabService("test-key", "budget-123", "account-123", "reimburse-cat-123");

  service["client"].transactions.getTransactionsByAccount = async () => ({
    data: { transactions: undefined },
  }) as any;

  const existingId = await service.findExistingTransaction("2025-01-15", 200000);

  expect(existingId).toBeNull();
});
