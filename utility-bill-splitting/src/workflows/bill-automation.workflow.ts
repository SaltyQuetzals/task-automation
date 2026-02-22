import type { PdfService } from "../services/pdf.service";
import type { GeminiService } from "../services/gemini.service";
import type { YnabService } from "../services/ynab.service";
import type { VenmoService } from "../services/venmo.service";
import type { AppConfig } from "../types/schemas";
import { splitCosts } from "../lib/cost-splitter";
import { formatVenmoNote } from "../lib/formatters";
import { downloadBill } from "../lib/download-bill";
import { CATEGORY_MAPPING } from "../config/categories";
import { logger } from "../lib/logger";

/**
 * Main workflow for bill automation
 * Orchestrates PDF reading, AI extraction, YNAB transaction, and Venmo request
 */
export class BillAutomationWorkflow {
  constructor(
    private pdfService: PdfService,
    private geminiService: GeminiService,
    private ynabService: YnabService,
    private venmoService: VenmoService,
    private config: AppConfig
  ) {}

  /**
   * Execute the complete bill automation workflow
   * @param email - Email for downloading bill from utility website
   * @param password - Password for downloading bill from utility website
   * @throws Error if any step fails
   */
  async execute(buffer: Uint8Array<ArrayBuffer>): Promise<void> {
    try {
      const pdfBuffer = buffer.buffer;
      const pdfBase64 = await this.pdfService.extractFirstPage(pdfBuffer);

      // Step 2: Extract line items using Gemini
      logger.info("Extracting line items from PDF...");
      const categoryHints = Object.keys(CATEGORY_MAPPING);
      const extracted = await this.geminiService.extractBillData(pdfBase64, categoryHints);
      const { categories, dateDue } = extracted;

      // Log extracted items
      logger.info(`Extracted ${Object.values(categories).length} line items:`);
      Object.entries(categories).forEach((item) => {
        logger.info(`  - ${item[0]}: $${item[1].toFixed(2)}`);
      });
      if (dateDue) {
        logger.info(`Due date: ${dateDue}`);
      }

      // Step 3: Split costs
      logger.info("Calculating cost split...");
      const splitResult = splitCosts(categories);

      logger.info("Split breakdown:");
      logger.info(`  Total bill: $${splitResult.totalBill.toFixed(2)}`);
      logger.info(`  Your share: $${splitResult.yourShare.toFixed(2)}`);
      logger.info(`  Roommate's share: $${splitResult.roommateShare.toFixed(2)}`);
      logger.info(`  Reimbursement amount: $${splitResult.reimbursementAmount.toFixed(2)}`);

      // Step 4: Check for duplicate YNAB transaction
      logger.info("Checking for duplicate transactions...");
      const totalBillMilliunits = Math.round(splitResult.totalBill * 1000);
      const transactionDate = dateDue || new Date().toISOString().split("T")[0]!;

      const existingTransactionId = await this.ynabService.findExistingTransaction(
        transactionDate,
        totalBillMilliunits
      );

      let ynabTransactionId: string;
      let venmoTransactionId: string | null = null;

      if (existingTransactionId) {
        logger.info(`Using existing transaction: ${existingTransactionId}`);
        ynabTransactionId = existingTransactionId;
        logger.info("Skipping Venmo request - transaction already processed");
      } else {
        // Create YNAB transaction if it doesn't exist
        ynabTransactionId = await this.ynabService.createTransaction(
          splitResult.items,
          dateDue
        );

        // Step 5: Send Venmo request only for new transactions
        logger.info("Processing Venmo request...");
        const note = formatVenmoNote(dateDue);
        venmoTransactionId = await this.venmoService.sendPaymentRequest(
          this.config.venmo?.recipientUserId || "",
          splitResult.reimbursementAmount,
          note
        );
      }

      // Success!
      logger.info("Bill automation completed successfully!");
      logger.info(`YNAB Transaction ID: ${ynabTransactionId}`);
      if (venmoTransactionId) {
        logger.info(`Venmo Transaction ID: ${venmoTransactionId}`);
      }
    } catch (error) {
      // Attempt rollback if transaction was created
      if (error instanceof Error && error.message.includes("Venmo")) {
        logger.error("Venmo request failed - attempting YNAB rollback...");
        // In a real scenario, we'd track the YNAB transaction ID and rollback
        // For now, just log the error
      }
      throw error;
    }
  }
}
