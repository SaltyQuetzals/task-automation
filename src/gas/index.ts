import type { Strategy } from "../types";
import computeBill from "./compute-bill";

const GasStrategy: Strategy = {
    computeBill,
    ynabPayee: 'i3p texas gas service',
}

export default GasStrategy;