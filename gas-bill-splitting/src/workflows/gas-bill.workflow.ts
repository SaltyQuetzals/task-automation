import { VenmoService } from "@auto-scripts/venmo";
import { logger } from "../lib/logger";
import { GAS_AUTOMATION } from "../config/constants";
import { YnabService } from "../services/ynab.service";
import { CostSplitterService } from "../services/cost-splitter";
import { toDollars } from "../types/domain";
import type { AppConfig, GasTransaction, ProcessingResult } from "../types/domain";

/**
 * Gas bill automation workflow
 * Orchestrates the complete process of finding, splitting, and paying gas bills
 */
export class GasBillWorkflow {
  private ynabService: YnabService;
  private venmoService: VenmoService;

  constructor(config: AppConfig) {
    this.ynabService = new YnabService(config.ynab.apiKey);
    this.venmoService = new VenmoService(config.venmo.accessToken, config.dryRun);
  }

  /**
   * Execute the complete workflow
   */
  async execute(config: AppConfig): Promise<ProcessingResult | null> {
    logger.info(`Starting gas bill splitting automation (dry run: ${config.dryRun})`);

    try {
      // Step 1: Find most recent gas transaction
      const transaction = await this.ynabService.findMostRecentGasTransaction(config.ynab.budgetId);

      if (!transaction) {
        logger.info("No unprocessed gas transaction found. Exiting without action.");
        return null;
      }

      logger.info(
        `Found transaction: ${transaction.id} on ${transaction.date} for $${toDollars(transaction.amount).toFixed(2)}`
      );

      // Step 2: Check if already processed (defensive check)
      if (transaction.memo === GAS_AUTOMATION.PROCESSED_MARKER) {
        logger.info("Transaction already marked as processed. Exiting without action.");
        return null;
      }

      // Step 3: Calculate split amounts
      const split = CostSplitterService.calculateSplit(transaction.amount);

      // Step 4: Update YNAB transaction
      await this.ynabService.updateTransactionWithSplits(
        config.ynab.budgetId,
        transaction.id,
        split.gasAmount,
        split.reimbursementAmount,
        config.ynab.gasCategoryId,
        config.ynab.reimbursementCategoryId,
        config.dryRun
      );

      // Step 5: Send Venmo request
      logger.info("Step 5: Sending Venmo payment request...");
      const note = `Gas Bill (${transaction.date})`;
      const amountDollars = toDollars(split.reimbursementAmount);

      const venmoTransactionId = await this.venmoService.sendPaymentRequest(
        config.venmo.recipientUserId,
        amountDollars,
        note
      );

      logger.info(`Venmo request sent: $${amountDollars.toFixed(2)}`);

      // Step 6: Mark YNAB transaction as processed
      await this.ynabService.markAsProcessed(
        config.ynab.budgetId,
        transaction.id,
        config.dryRun
      );

      logger.success("Gas bill splitting completed successfully!");

      return {
        transaction,
        split,
        venmoTransactionId,
      };
    } catch (error) {
      throw error;
    }
  }
}
