import type { Bill } from "../types";
import GasStrategy from "./gas";
import UtilitiesStrategy from "./utilities";

export type Strategy = {
    computeBill: () => Promise<Bill>;
    ynabPayee: string;
    note: (bill: Bill) => string;
}

type Mode = "gas" | "utilities";
export const STRATEGIES: Record<Mode, Strategy> = {
    gas: GasStrategy,
    utilities: UtilitiesStrategy
}