/**
 * Constants for gas bill automation
 */

export const GAS_AUTOMATION = {
  /** Payee name pattern to identify gas bill transactions */
  PAYEE_PATTERN: "i3p texas gas service",

  /** Memo to mark transactions as processed */
  PROCESSED_MARKER: "Automatically split" as const,

  /** Category memo labels */
  CATEGORY_MEMOS: {
    gas: "Gas",
    reimbursement: "Reimbursements",
  },

  /** Split ratio (50% each) */
  SPLIT_RATIO: 0.5,
} as const;

export const LOGGING = {
  PREFIX: "[GAS BILL]",
} as const;
