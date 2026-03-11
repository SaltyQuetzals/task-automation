import { test, expect, mock } from "bun:test";
import { Temporal } from "temporal-polyfill";
import type { Bill } from "./types";
import { YNABCategory } from "./categories";
import { retrieveScheduledYNABTransaction, retrieveYNABTransaction } from "./ynab";

const FUTURE_DATE = Temporal.PlainDate.from("2026-03-20");
const PAST_DATE = Temporal.PlainDate.from("2026-03-05");
const MEMO = "Automatically Created";
const TOTAL_CENTS = 10000;

const makeBill = (dueDate: Temporal.PlainDate): Bill => ({
  dueDate,
  totalCents: TOTAL_CENTS as Bill["totalCents"],
  splitsCents: {
    [YNABCategory.Reimbursements]: 5000 as Bill["totalCents"],
    [YNABCategory.Electric]: 5000 as Bill["totalCents"],
  },
});

// --- retrieveScheduledYNABTransaction ---

test("retrieveScheduledYNABTransaction: matches payee case-insensitively", async () => {
  const bill = makeBill(FUTURE_DATE);
  const ynabAPI = {
    scheduledTransactions: {
      getScheduledTransactions: mock().mockResolvedValue({
        data: {
          scheduled_transactions: [
            {
              id: "sched-1",
              payee_name: "City of Austin",   // mixed case from YNAB
              date_next: FUTURE_DATE.toString(),
              memo: MEMO,
              amount: -TOTAL_CENTS * 10,
            },
          ],
        },
      }),
    },
  } as any;

  const result = await retrieveScheduledYNABTransaction(ynabAPI, bill, "city of austin", MEMO);

  expect(result).not.toBeNull();
  expect(result!.id).toBe("sched-1");
});

test("retrieveScheduledYNABTransaction: returns null when no match", async () => {
  const bill = makeBill(FUTURE_DATE);
  const ynabAPI = {
    scheduledTransactions: {
      getScheduledTransactions: mock().mockResolvedValue({
        data: { scheduled_transactions: [] },
      }),
    },
  } as any;

  const result = await retrieveScheduledYNABTransaction(ynabAPI, bill, "City of Austin", MEMO);

  expect(result).toBeNull();
});

// --- retrieveYNABTransaction ---

test("retrieveYNABTransaction: matches payee case-insensitively", async () => {
  const bill = makeBill(PAST_DATE);
  const ynabAPI = {
    transactions: {
      getTransactions: mock().mockResolvedValue({
        data: {
          transactions: [
            {
              id: "txn-1",
              payee_name: "City of Austin",  // mixed case from YNAB
              date: PAST_DATE.toString(),
              memo: MEMO,
              amount: -TOTAL_CENTS * 10,
              subtransactions: [{ id: "sub-1" }],
            },
          ],
        },
      }),
    },
  } as any;

  const result = await retrieveYNABTransaction(ynabAPI, bill, "city of austin", MEMO);

  expect(result).not.toBeNull();
  expect(result!.id).toBe("txn-1");
});

test("retrieveYNABTransaction: returns null when no match", async () => {
  const bill = makeBill(PAST_DATE);
  const ynabAPI = {
    transactions: {
      getTransactions: mock().mockResolvedValue({
        data: { transactions: [] },
      }),
    },
  } as any;

  const result = await retrieveYNABTransaction(ynabAPI, bill, "City of Austin", MEMO);

  expect(result).toBeNull();
});
