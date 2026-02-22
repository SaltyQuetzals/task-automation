/**
 * Branded types for type safety
 */

/** Amount in milliunits (1/1000th of a dollar) */
export type Milliunits = number & { readonly __brand: "milliunits" };

/** Amount in dollars */
export type Dollars = number & { readonly __brand: "dollars" };

/** Date string in YYYY-MM-DD format */
export type DateString = string & { readonly __brand: "dateString" };

/** YNAB Budget ID */
export type BudgetId = string & { readonly __brand: "budgetId" };

/** YNAB Category ID */
export type CategoryId = string & { readonly __brand: "categoryId" };

/** YNAB Transaction ID */
export type TransactionId = string & { readonly __brand: "transactionId" };

/** Venmo User ID */
export type VenmoUserId = string & { readonly __brand: "venmoUserId" };

/**
 * Helper functions to create branded types
 */

export function toMilliunits(dollars: number): Milliunits {
  return Math.round(dollars * 1000) as Milliunits;
}

export function toDollars(milliunits: Milliunits): Dollars {
  return (milliunits / 1000) as Dollars;
}

export function asDateString(date: string): DateString {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date string format: ${date}. Expected YYYY-MM-DD`);
  }
  return date as DateString;
}

export function asBudgetId(id: string): BudgetId {
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    throw new Error(`Invalid budget ID format: ${id}`);
  }
  return id as BudgetId;
}

export function asCategoryId(id: string): CategoryId {
  if (!id || id.length === 0) {
    throw new Error("Category ID cannot be empty");
  }
  return id as CategoryId;
}

export function asTransactionId(id: string): TransactionId {
  if (!id || id.length === 0) {
    throw new Error("Transaction ID cannot be empty");
  }
  return id as TransactionId;
}

export function asVenmoUserId(id: string): VenmoUserId {
  if (!id || id.length === 0) {
    throw new Error("Venmo user ID cannot be empty");
  }
  return id as VenmoUserId;
}

/**
 * Domain models
 */

export interface GasTransaction {
  id: TransactionId;
  date: DateString;
  amount: Milliunits;
  memo: string | null;
  payeeName: string | null;
}

export interface GasBillSplit {
  gasAmount: Milliunits;
  reimbursementAmount: Milliunits;
  totalAmount: Milliunits;
}

export interface ProcessingResult {
  transaction: GasTransaction;
  split: GasBillSplit;
  venmoTransactionId: string;
}

/**
 * Application configuration (imported from config/env.ts)
 */
export interface AppConfig {
  ynab: {
    apiKey: string;
    budgetId: BudgetId;
    gasCategoryId: CategoryId;
    reimbursementCategoryId: CategoryId;
  };
  venmo: {
    accessToken: string;
    recipientUserId: VenmoUserId;
  };
  dryRun: boolean;
}
