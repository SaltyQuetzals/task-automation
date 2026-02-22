import type z from "zod";
import type { ExtractedItemsSchema, LineItem } from "./schemas";

export interface SplitItem {
  description: string;
  amount: number;
  yourShare: number;
  categoryId?: string;
}

export interface ExtractedBill {
  categories: Omit<z.infer<typeof ExtractedItemsSchema>, 'dateDue'>;
  dateDue?: string;
  totalAmount: number;
}

export interface BillSplitResult {
  items: SplitItem[];
  totalBill: number;
  yourShare: number;
  roommateShare: number;
  reimbursementAmount: number;
}
