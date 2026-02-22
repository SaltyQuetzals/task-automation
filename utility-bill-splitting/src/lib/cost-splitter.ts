import type { BillSplitResult, SplitItem } from "../types/bill";
import { CATEGORY_MAPPING } from "../config/categories";
import { logger } from "./logger";

/**
 * Get category ID from a category name
 * @param categoryName - Category name from extracted bill data
 * @returns Category ID from YNAB or undefined if not found
 */
function getCategoryId(categoryName: string): string | undefined {
  return CATEGORY_MAPPING[categoryName];
}

/**
 * Split costs evenly between two parties (50/50 split)
 * @param categories - Object mapping category names to amounts
 * @returns Split result with calculations
 */
export function splitCosts(categories: Record<string, number>): BillSplitResult {
  logger.info("Splitting costs between roommates...");

  const splitItems: SplitItem[] = Object.entries(categories).map(([description, amount]) => ({
    description,
    amount,
    yourShare: Math.round((amount / 2) * 100) / 100,
    categoryId: getCategoryId(description),
  }));

  // Calculate totals
  const totalBill = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
  const yourShare = splitItems.reduce((sum, item) => sum + item.yourShare, 0);
  const roommateShare = totalBill / 2; // Roommate pays 50%

  // Calculate reimbursement (in case of rounding, use milliunits)
  // Reimbursement is what roommate owes = total - yourShare (ensures exact match)
  const totalBillMilliunits = Math.round(totalBill * 1000);
  const yourShareMilliunits = splitItems.reduce((sum, item) => sum + Math.round(item.yourShare * 1000), 0);
  const reimbursementAmountMilliunits = totalBillMilliunits - yourShareMilliunits;
  const reimbursementAmount = reimbursementAmountMilliunits / 1000;

  return {
    items: splitItems,
    totalBill,
    yourShare,
    roommateShare,
    reimbursementAmount,
  };
}
