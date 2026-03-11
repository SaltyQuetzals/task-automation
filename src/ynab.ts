import * as ynab from "ynab";
import type { Bill, Cents } from "./types";
import { env } from "./env";
import { CATEGORY_MAPPING, YNABCategory } from "./categories";

export const isScheduledTransaction = (
  txn: ynab.ScheduledTransactionDetail | ynab.TransactionDetail
): txn is ynab.ScheduledTransactionDetail => {
  return "date_next" in txn;
};

export const retrieveYNABTransaction = async (ynabAPI: ynab.API, bill: Bill, payee: string, memo: string) => {
  const response = await ynabAPI.transactions.getTransactions("last-used");
  const transactions = response.data.transactions;

  const filtered = transactions
    .filter(t => t.payee_name?.toLocaleLowerCase().includes(payee) && t.date === bill.dueDate.toString() && t.memo === memo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return filtered[0] ?? null;
}

export const retrieveScheduledYNABTransaction = async (ynabAPI: ynab.API, bill: Bill, payee: string, memo: string) => {
  const response = await ynabAPI.scheduledTransactions.getScheduledTransactions("last-used");
  const transactions = response.data.scheduled_transactions;

  const filtered = transactions
    .filter(t => t.payee_name?.toLocaleLowerCase().includes(payee) && t.date_next === bill.dueDate.toString() && t.memo === memo)
    .sort((a, b) => new Date(b.date_next).getTime() - new Date(a.date_next).getTime());

  return filtered[0] ?? null;
}

export const createScheduledYNABTransaction = async (ynabAPI: ynab.API, bill: Bill, payee: string, memo: string) => {
  const createResponse = await ynabAPI.scheduledTransactions.createScheduledTransaction("last-used", {
    scheduled_transaction: {
      payee_name: payee.toLocaleUpperCase(),
      account_id: env.YNAB_ACCOUNT,
      date: bill.dueDate.toString(),
      amount: bill.totalCents * 10, // YNAB uses milliunits, not cents
      frequency: 'never',
      memo
    }
  });

  const detailResponse = await ynabAPI.scheduledTransactions.getScheduledTransactionById("last-used", createResponse.data.scheduled_transaction.id);
  return detailResponse.data.scheduled_transaction;
}

export const createSplitYNABTransaction = async (ynabAPI: ynab.API, bill: Bill, payee: string, memo: string) => {
  const createResponse = await ynabAPI.transactions.createTransaction("last-used", {
    transaction: {
      payee_name: payee.toLocaleUpperCase(),
      account_id: env.YNAB_ACCOUNT,
      date: bill.dueDate.toString(),
      amount: bill.totalCents * 10, // YNAB uses milliunits, not cents
      subtransactions: Object.entries(bill.splitsCents).map(([key, cents]) => ({
        amount: cents * 10, // YNAB uses milliunits, not cents
        category_id: CATEGORY_MAPPING[key as YNABCategory]
      })),
      memo
    }
  });

  const {transaction} = createResponse.data;

  if (!transaction) {
    throw new Error('Failed to create split YNAB transaction');
  }

  const detailResponse = await ynabAPI.transactions.getTransactionById("last-used", transaction.id);
  return detailResponse.data.transaction;
}