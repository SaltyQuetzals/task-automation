import * as ynab from "ynab";
import type { SaveSubTransaction } from "ynab";
import type { SplitItem } from "../types/bill";
import { logger } from "../lib/logger";
import { toMilliunits, type BudgetId, type AccountId, type CategoryId, type Milliunits, type DateString } from "../types/domain";

/**
 * Service for YNAB API integration
 */
export class YnabService {
  private client: ynab.API;
  private budgetId: BudgetId;
  private accountId: AccountId;
  private reimbursementCategoryId: CategoryId;

  constructor(apiKey: string, budgetId: BudgetId, accountId: AccountId, reimbursementCategoryId: CategoryId) {
    this.client = new ynab.API(apiKey);
    this.budgetId = budgetId;
    this.accountId = accountId;
    this.reimbursementCategoryId = reimbursementCategoryId;
  }

  /**
   * Find existing transaction by date and amount to prevent duplicates
   * @param date - Transaction date in YYYY-MM-DD format
   * @param amountMilliunits - Transaction amount in milliunits
   * @returns Transaction ID if found, null otherwise
   */
  async findExistingTransaction(date: DateString, amountMilliunits: Milliunits): Promise<string | null> {
    try {
      const response = await this.client.transactions.getTransactionsByAccount(
        this.budgetId,
        this.accountId,
        date
      );

      if (!response.data?.transactions) {
        return null;
      }

      const transactions = response.data.transactions;

      // Look for transactions on the same date with the same amount and utilities-related memo
      const existingTransaction = transactions.find((tx) => {
        const dateMatch = tx.date === date;
        const amountMatch = tx.amount === -amountMilliunits || tx.amount === amountMilliunits;
        const memoMatch = tx.memo && (tx.memo.includes("Utilities") || tx.memo.includes("Automatically Created"));

        return dateMatch && amountMatch && memoMatch;
      });

      if (existingTransaction?.id) {
        logger.warn(`Found existing transaction on ${date} with matching amount: ${existingTransaction.id}`);
        return existingTransaction.id;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Could not check for duplicate transactions: ${message}`);
      return null;
    }
  }

  /**
   * Create a YNAB transaction with split categories
   * @param splitItems - Array of split items with categories (amounts in dollars)
   * @param billedDate - Date of the transaction (optional, defaults to today)
   * @returns Transaction ID if successful
   * @throws Error if transaction creation fails
   */
  async createTransaction(splitItems: SplitItem[], billedDate?: DateString): Promise<string> {
    logger.info("Creating YNAB transaction...");

    // Calculate totals (amounts are in dollars, convert to milliunits for YNAB)
    const totalBill = splitItems.reduce((sum, item) => sum + item.amount, 0);
    const totalBillMilliunits = toMilliunits(totalBill);

    // Sum all item shares (in milliunits) to handle rounding
    const totalYourShareMilliunits = splitItems.reduce((sum, item) => sum + toMilliunits(item.yourShare), 0);

    // Reimbursement is whatever's left after splitting items
    const reimbursementAmountMilliunits = totalBillMilliunits - totalYourShareMilliunits;

    // Prepare subtransactions for splits
    const subtransactions: SaveSubTransaction[] = splitItems.map((item) => ({
      amount: toMilliunits(item.yourShare), // YNAB uses milliunits
      payee_id: null,
      category_id: item.categoryId || "",
      memo: item.description,
    }));

    // Add reimbursement split
    subtransactions.push({
      amount: reimbursementAmountMilliunits,
      payee_id: null,
      category_id: this.reimbursementCategoryId,
      memo: "Reimbursements",
    });

    // Prepare the transaction wrapper
    const transactionWrapper: ynab.PostTransactionsWrapper = {
      transaction: {
        account_id: this.accountId,
        date: billedDate || (new Date().toISOString().split("T")[0] as DateString),
        payee_name: "Utilities Split",
        memo: "Automatically Created",
        category_id: null,
        amount: totalBillMilliunits,
        cleared: ynab.TransactionClearedStatus.Uncleared,
        approved: false,
        subtransactions,
      },
    };

    logger.debug({ transactionWrapper }, "Transaction structure");

    try {
      const response = await this.client.transactions.createTransactions(this.budgetId, transactionWrapper);

      // Extract transaction ID from response
      let transactionId: string | null = null;

      if (response.data?.transactions?.[0]?.id) {
        transactionId = response.data.transactions[0].id;
      } else if (response.data?.transaction?.id) {
        transactionId = response.data.transaction.id;
      }

      if (!transactionId) {
        throw new Error("No transaction ID returned from YNAB API");
      }

      logger.info(`Transaction created in YNAB: ${transactionId}`);

      return transactionId;
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);

      // Try to extract more detailed error info from YNAB SDK
      if (error instanceof Error && error.message.includes("interceptors")) {
        // This is likely an axios error from the YNAB SDK
        const errorObj = error as unknown as Record<string, unknown>;
        if (errorObj.response) {
          const response = errorObj.response as Record<string, unknown>;
          const data = response.data as Record<string, unknown>;
          if (data?.error) {
            message = `YNAB API Error: ${JSON.stringify(data.error)}`;
          } else {
            message = `YNAB API Error (${response.status}): ${JSON.stringify(data)}`;
          }
        }
      }

      throw new Error(`Failed to create YNAB transaction: ${message}`);
    }
  }

  /**
   * Delete a YNAB transaction (used for rollback)
   * @param transactionId - ID of transaction to delete
   * @throws Error if deletion fails
   */
  async deleteTransaction(transactionId: string): Promise<void> { // TODO: use TransactionId type when adopted everywhere
    logger.info(`Deleting YNAB transaction ${transactionId}...`);

    try {
      await this.client.transactions.deleteTransaction(this.budgetId, transactionId);
      logger.info(`Transaction deleted: ${transactionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete YNAB transaction: ${message}`);
    }
  }
}
