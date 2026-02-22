import type z from "zod";
import type { ExtractedItemsSchema, LineItem } from "./schemas";
import type { Dollars, CategoryId } from "./domain";

export interface SplitItem {
  description: string;
  amount: Dollars;
  yourShare: Dollars;
  categoryId?: CategoryId;
}

export interface ExtractedBill {
  categories: Omit<z.infer<typeof ExtractedItemsSchema>, 'dateDue'>;
  dateDue?: string;
  totalAmount: Dollars;
}

export interface BillSplitResult {
  items: SplitItem[];
  totalBill: Dollars;
  yourShare: Dollars;
  roommateShare: Dollars;
  reimbursementAmount: Dollars;
}
