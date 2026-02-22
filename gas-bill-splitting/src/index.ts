import { loadConfig } from "./config/env";
import { GasBillWorkflow } from "./workflows/gas-bill.workflow";
import { logger } from "./lib/logger";
import { GasBillError } from "./errors/base";

/**
 * Main entry point for gas bill automation
 */
async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const workflow = new GasBillWorkflow(config);
    await workflow.execute(config);
    process.exit(0);
  } catch (error) {
    if (error instanceof GasBillError) {
      logger.error(error.toString());
    } else {
      logger.error(`${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
