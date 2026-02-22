import { config, loadConfig } from "./config";
import { PdfService } from "./services/pdf.service";
import { GeminiService } from "./services/gemini.service";
import { YnabService } from "./services/ynab.service";
import { VenmoService } from "./services/venmo.service";
import { BillAutomationWorkflow } from "./workflows/bill-automation.workflow";
import { BillAutomationError } from "./errors";
import { downloadBill } from "./lib";
import { logger } from "./lib/logger";

async function main(): Promise<void> {
  try {
    logger.info("Starting Bill Automation...");

    // Validate and load configuration
    loadConfig();

    if (config.app.dryRun) {
      logger.warn("DRY RUN MODE ENABLED - No Venmo requests will be sent");
    }

    // Initialize services
    const pdfService = new PdfService();
    const geminiService = new GeminiService(config.google.apiKey);
    const ynabService = new YnabService(
      config.ynab.apiKey,
      config.ynab.budgetId,
      config.ynab.accountId,
      config.ynab.reimbursementCategoryId
    );
    const venmoService = new VenmoService(
      config.venmo?.accessToken || "",
      config.app.dryRun
    );

    // Create and execute workflow
    const workflow = new BillAutomationWorkflow(
      pdfService,
      geminiService,
      ynabService,
      venmoService,
      config
    );

    // Step 1: Download and encode PDF
    logger.info("Downloading bill from utility website...");
    const buffer = await downloadBill(config.coaUtilities.email, config.coaUtilities.password);

    await workflow.execute(
      buffer
    );
  } catch (error) {
    // Handle different error types
    if (error instanceof BillAutomationError) {
      logger.error(`${error.name}: ${error.message}`);
      if (error.cause) {
        logger.error({ cause: error.cause instanceof Error ? error.cause.message : String(error.cause) });
      }
    } else {
      logger.error(error, "Unexpected error");
    }
    process.exit(1);
  }
}

main();
