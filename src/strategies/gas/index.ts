import type { Strategy } from "..";
import computeBill from "./compute-bill";

const GasStrategy: Strategy = {
    computeBill,
    ynabPayee: 'i3p texas gas service',
}

export default GasStrategy;