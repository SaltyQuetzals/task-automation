import type { CATEGORY_MAPPING } from "./categories";

export type Bill = {
    dueDate: string;
    total: number;
    splits?: Partial<Record<keyof typeof CATEGORY_MAPPING, number>>;
}