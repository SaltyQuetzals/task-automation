import { logger } from "../lib/logger";
import { GAS_AUTOMATION } from "../config/constants";
import type { Milliunits, GasBillSplit } from "../types/domain";
import { toDollars } from "../types/domain";

/**
 * Service for calculating bill splits
 */
export class CostSplitterService {
  /**
   * Calculate 50/50 split of gas bill
   */
  static calculateSplit(totalAmount: Milliunits): GasBillSplit {
    logger.info("Step 3: Calculating split amounts...");

    // Use integer arithmetic to avoid floating point rounding issues
    const reimbursementAmount = Math.floor(totalAmount * GAS_AUTOMATION.SPLIT_RATIO) as Milliunits;
    const gasAmount = (totalAmount - reimbursementAmount) as Milliunits;

    logger.info(
      `Total: $${toDollars(totalAmount).toFixed(2)}, Gas: $${toDollars(gasAmount).toFixed(2)}, Reimbursement: $${toDollars(reimbursementAmount).toFixed(2)}`
    );

    return {
      totalAmount,
      gasAmount,
      reimbursementAmount,
    };
  }
}
