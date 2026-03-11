import { YNABCategory } from "./categories";

export type Cents = number & { __brand: "Cents"; };

export type Bill = {
  dueDate: string;
  totalCents: Cents;
  splitsCents: { [YNABCategory.Reimbursements]: Cents } & Partial<Record<YNABCategory, Cents>>;
};

