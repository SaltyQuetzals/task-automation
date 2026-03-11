import type { Strategy } from "..";
import type { Bill } from "../../types";
import computeBill from "./compute-bill";

const GasStrategy: Strategy = {
    computeBill,
    ynabPayee: 'i3p texas gas service',
    note: (bill: Bill) => `Gas Bill (due ${bill.dueDate.toString()})`
}

export default GasStrategy;