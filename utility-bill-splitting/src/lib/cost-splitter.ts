import type { BillSplitResult, SplitItem } from "../types/bill";
import { CATEGORY_MAPPING } from "../config/categories";
import { logger } from "./logger";
import { toMilliunits, toDollars, type Dollars, type Milliunits, type CategoryId } from "../types/domain";

/**
 * Get category ID from a category name
 * @param categoryName - Category name from extracted bill data
 * @returns Category ID from YNAB or undefined if not found
 */
function getCategoryId(categoryName: string): CategoryId | undefined {
  const id = CATEGORY_MAPPING[categoryName];
  if (!id) return undefined;
  // Validate and cast to CategoryId
  if (!id || id.length === 0) return undefined;
  return id as CategoryId;
}

/**
 * Split costs evenly between two parties (50/50 split)
 * Amounts are in dollars, internally converted to milliunits for accurate calculations
 * @param categories - Object mapping category names to amounts in dollars
 * @returns Split result with calculations in dollars
 */
export function splitCosts(categories: Record<string, number>): BillSplitResult {
  logger.info("Splitting costs between roommates...");

  // Convert all amounts to milliunits for precise arithmetic
  const categoriesInMilliunits: Record<string, Milliunits> = {};
  for (const [category, dollars] of Object.entries(categories)) {
    categoriesInMilliunits[category] = toMilliunits(dollars as Dollars);
  }

  // Calculate split in milliunits
  const totalBillMilliunits = Object.values(categoriesInMilliunits).reduce(
    (sum: number, amount) => sum + amount,
    0
  ) as Milliunits;
  const yourShareMilliunits = Math.floor(totalBillMilliunits / 2) as Milliunits;
  const roommateShareMilliunits = (totalBillMilliunits - yourShareMilliunits) as Milliunits;

  // Build split items
  const splitItems: SplitItem[] = Object.entries(categoriesInMilliunits).map(([description, amountMilliunits]) => ({
    description,
    amount: toDollars(amountMilliunits),
    yourShare: toDollars(Math.floor(amountMilliunits / 2) as Milliunits),
    categoryId: getCategoryId(description),
  }));

  // Convert results back to dollars
  const totalBill = toDollars(totalBillMilliunits);
  const yourShare = toDollars(yourShareMilliunits);
  const roommateShare = toDollars(roommateShareMilliunits);
  const reimbursementAmount = roommateShare; // Roommate owes their share

  return {
    items: splitItems,
    totalBill,
    yourShare,
    roommateShare,
    reimbursementAmount,
  };
}
