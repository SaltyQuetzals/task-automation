import * as ynab from "ynab";
import { logger } from "../lib/logger";
import { GAS_AUTOMATION } from "../config/constants";
import {
  type BudgetId,
  type CategoryId,
  type TransactionId,
  type Milliunits,
  type DateString,
  toDollars,
  asTransactionId,
} from "../types/domain";
import { TransactionLookupError, YnabOperationError } from "../errors/base";

/**
 * YNAB API service
 */
export class YnabService {
  private client: ynab.API;

  constructor(apiKey: string) {
    this.client = new ynab.API(apiKey);
  }

  /**
   * Find the most recent unprocessed gas transaction
   */
  async findMostRecentGasTransaction(budgetId: BudgetId): Promise<{
    id: TransactionId;
    date: DateString;
    amount: Milliunits;
    memo: string | null;
    payeeName: string | null;
  } | null> {
    try {
      logger.info("Step 1: Finding most recent Texas Gas Service transaction...");

      // Get all payees
      const payeesResponse = await this.client.payees.getPayees(budgetId);
      const payees = payeesResponse.data?.payees || [];

      // Find payee matching gas service pattern
      const gasPayee = payees.find((p) =>
        p.name.toLowerCase().includes(GAS_AUTOMATION.PAYEE_PATTERN)
      );

      if (!gasPayee) {
        logger.warn(`No payee matching '${GAS_AUTOMATION.PAYEE_PATTERN}' found`);
        return null;
      }

      logger.info(`Found payee: ${gasPayee.name} (ID: ${gasPayee.id})`);

      // Get transactions for this payee
      const txResponse = await this.client.transactions.getTransactionsByPayee(
        budgetId,
        gasPayee.id
      );
      const transactions = txResponse.data?.transactions || [];

      if (transactions.length === 0) {
        logger.warn("No transactions found for this payee");
        return null;
      }

      // Filter valid and unprocessed transactions, sort by date descending
      const unprocessed = transactions
        .filter((tx) => !tx.deleted && tx.memo !== GAS_AUTOMATION.PROCESSED_MARKER)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (unprocessed.length === 0) {
        logger.warn("No unprocessed transactions found");
        return null;
      }

      const mostRecent = unprocessed[0]!;
      return {
        id: asTransactionId(mostRecent.id),
        date: mostRecent.date as DateString,
        amount: mostRecent.amount as Milliunits,
        memo: mostRecent.memo ?? null,
        payeeName: mostRecent.payee_name ?? null,
      };
    } catch (error) {
      throw new TransactionLookupError(
        `Failed to find gas transaction: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Update transaction with split categories
   */
  async updateTransactionWithSplits(
    budgetId: BudgetId,
    transactionId: TransactionId,
    gasAmount: Milliunits,
    reimbursementAmount: Milliunits,
    gasCategoryId: CategoryId,
    reimbursementCategoryId: CategoryId,
    dryRun: boolean
  ): Promise<void> {
    try {
      logger.info("Step 4: Updating YNAB transaction with splits...");

      if (!dryRun) {
        await this.client.transactions.updateTransaction(budgetId, transactionId, {
          transaction: {
            category_id: null,
            subtransactions: [
              {
                amount: gasAmount,
                category_id: gasCategoryId,
                memo: GAS_AUTOMATION.CATEGORY_MEMOS.gas,
              },
              {
                amount: reimbursementAmount,
                category_id: reimbursementCategoryId,
                memo: GAS_AUTOMATION.CATEGORY_MEMOS.reimbursement,
              },
            ],
          },
        });
        logger.info("Transaction updated with subtransactions");
      } else {
        logger.info(
          `[DRY RUN] Would update transaction with subtransactions (Gas: $${toDollars(gasAmount).toFixed(2)}, Reimbursement: $${toDollars(reimbursementAmount).toFixed(2)})`
        );
      }
    } catch (error) {
      throw new YnabOperationError(
        `Failed to update YNAB transaction: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Mark transaction as processed
   */
  async markAsProcessed(
    budgetId: BudgetId,
    transactionId: TransactionId,
    dryRun: boolean
  ): Promise<void> {
    try {
      logger.info("Step 6: Marking transaction as processed...");

      if (!dryRun) {
        await this.client.transactions.updateTransaction(budgetId, transactionId, {
          transaction: {
            memo: GAS_AUTOMATION.PROCESSED_MARKER,
          },
        });
        logger.info("Transaction marked as processed");
      } else {
        logger.info(
          `[DRY RUN] Would mark transaction with memo '${GAS_AUTOMATION.PROCESSED_MARKER}'`
        );
      }
    } catch (error) {
      throw new YnabOperationError(
        `Failed to mark transaction as processed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }
}
