import type { Strategy } from "..";
import type { Bill } from "../../types";
import computeBill from "./compute-bill";

const UtilitiesStrategy: Strategy = {
    computeBill,
    ynabPayee: 'City of Austin',
    note: (bill: Bill) => `Utilities Bill (due ${bill.dueDate.toString()})`
}

export default UtilitiesStrategy;