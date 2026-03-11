import { test, expect, mock, beforeEach } from "bun:test";
import { Temporal } from "temporal-polyfill";
import type { Bill } from "./types";
import { YNABCategory } from "./categories";
import type { TransactionDetail, ScheduledTransactionDetail } from "ynab";
import type { Strategy } from "./strategies";

// Mock the ynab module helpers before importing updateYNAB
const mockRetrieveScheduledYNABTransaction = mock();
const mockCreateScheduledYNABTransaction = mock();
const mockRetrieveYNABTransaction = mock();
const mockCreateSplitYNABTransaction = mock();

mock.module("./ynab", () => ({
  retrieveScheduledYNABTransaction: mockRetrieveScheduledYNABTransaction,
  createScheduledYNABTransaction: mockCreateScheduledYNABTransaction,
  retrieveYNABTransaction: mockRetrieveYNABTransaction,
  createSplitYNABTransaction: mockCreateSplitYNABTransaction,
  isScheduledTransaction: (txn: any) => "date_next" in txn,
}));

const { updateYNAB, updateExternalSources } = await import("./index");

const PAYEE = "test payee";
const TODAY = Temporal.PlainDate.from("2026-03-11");
const FUTURE_DATE = Temporal.PlainDate.from("2026-03-20");
const PAST_DATE = Temporal.PlainDate.from("2026-03-05");

const makeBill = (dueDate: Temporal.PlainDate): Bill => ({
  dueDate,
  totalCents: 10000 as Bill["totalCents"],
  splitsCents: {
    [YNABCategory.Reimbursements]: 5000 as Bill["totalCents"],
    [YNABCategory.Electric]: 5000 as Bill["totalCents"],
  },
});

const makeTransaction = (subtransactions: unknown[] = []): TransactionDetail =>
  ({ id: "txn-1", subtransactions, payee_name: PAYEE, date: PAST_DATE.toString(), memo: "Automatically Created" } as unknown as TransactionDetail);

const makeScheduledTransaction = (): ScheduledTransactionDetail =>
  ({ id: "sched-1", date_next: FUTURE_DATE.toString(), payee_name: PAYEE } as unknown as ScheduledTransactionDetail);

const mockYnabAPI = {
  transactions: {
    deleteTransaction: mock(),
  },
} as any;

const mockFindLatestChargeRequest = mock();
const mockSendPaymentRequest = mock();
const mockVenmoClient = {
  findLatestChargeRequest: mockFindLatestChargeRequest,
  sendPaymentRequest: mockSendPaymentRequest,
} as any;

const makeStrategy = (note = "Test note"): Strategy => ({
  computeBill: mock(),
  ynabPayee: PAYEE,
  note: () => note,
});

beforeEach(() => {
  mockRetrieveScheduledYNABTransaction.mockReset();
  mockCreateScheduledYNABTransaction.mockReset();
  mockRetrieveYNABTransaction.mockReset();
  mockCreateSplitYNABTransaction.mockReset();
  mockYnabAPI.transactions.deleteTransaction.mockReset();
  mockFindLatestChargeRequest.mockReset();
  mockSendPaymentRequest.mockReset();
});

// --- Bill not yet due ---

test("bill not yet due: scheduled transaction exists → does nothing", async () => {
  const bill = makeBill(FUTURE_DATE);
  mockRetrieveScheduledYNABTransaction.mockResolvedValue(makeScheduledTransaction());

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockRetrieveScheduledYNABTransaction).toHaveBeenCalledTimes(1);
  expect(mockCreateScheduledYNABTransaction).not.toHaveBeenCalled();
  expect(mockRetrieveYNABTransaction).not.toHaveBeenCalled();
});

test("bill not yet due: no scheduled transaction → creates one", async () => {
  const bill = makeBill(FUTURE_DATE);
  mockRetrieveScheduledYNABTransaction.mockResolvedValue(null);
  mockCreateScheduledYNABTransaction.mockResolvedValue(makeScheduledTransaction());

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockCreateScheduledYNABTransaction).toHaveBeenCalledTimes(1);
  expect(mockRetrieveYNABTransaction).not.toHaveBeenCalled();
});

// --- Bill due or past due ---

test("bill past due: transaction exists with splits → does nothing", async () => {
  const bill = makeBill(PAST_DATE);
  const txn = makeTransaction([{ id: "sub-1" }]);
  mockRetrieveYNABTransaction.mockResolvedValue(txn);

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockRetrieveYNABTransaction).toHaveBeenCalledTimes(1);
  expect(mockCreateSplitYNABTransaction).not.toHaveBeenCalled();
  expect(mockYnabAPI.transactions.deleteTransaction).not.toHaveBeenCalled();
});

test("bill past due: no transaction found → creates split transaction", async () => {
  const bill = makeBill(PAST_DATE);
  const txn = makeTransaction([{ id: "sub-1" }]);
  mockRetrieveYNABTransaction.mockResolvedValue(null);
  mockCreateSplitYNABTransaction.mockResolvedValue(txn);

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockCreateSplitYNABTransaction).toHaveBeenCalledTimes(1);
  expect(mockYnabAPI.transactions.deleteTransaction).not.toHaveBeenCalled();
});

test("bill past due: transaction found but no subtransactions → deletes and recreates", async () => {
  const bill = makeBill(PAST_DATE);
  const txnNoSplits = makeTransaction([]);
  const txnWithSplits = makeTransaction([{ id: "sub-1" }]);
  mockRetrieveYNABTransaction.mockResolvedValue(txnNoSplits);
  mockYnabAPI.transactions.deleteTransaction.mockResolvedValue({});
  mockCreateSplitYNABTransaction.mockResolvedValue(txnWithSplits);

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockYnabAPI.transactions.deleteTransaction).toHaveBeenCalledWith("last-used", txnNoSplits.id);
  expect(mockCreateSplitYNABTransaction).toHaveBeenCalledTimes(1);
});

// --- Due date equals today (boundary) ---

test("bill due exactly today: treated as past due", async () => {
  const bill = makeBill(TODAY);
  const txn = makeTransaction([{ id: "sub-1" }]);
  mockRetrieveYNABTransaction.mockResolvedValue(txn);

  await updateYNAB(mockYnabAPI, PAYEE, bill, TODAY);

  expect(mockRetrieveYNABTransaction).toHaveBeenCalledTimes(1);
  expect(mockRetrieveScheduledYNABTransaction).not.toHaveBeenCalled();
});
