import { YNABCategory } from "./categories";
import { Temporal } from "temporal-polyfill";
export type Cents = number & { __brand: "Cents"; };

export type Bill = {
  dueDate: Temporal.PlainDate;
  totalCents: Cents;
  splitsCents: { [YNABCategory.Reimbursements]: Cents } & Partial<Record<YNABCategory, Cents>>;
};

export type Strategy = {
  computeBill: () => Promise<Bill>;
  ynabPayee: string;
}