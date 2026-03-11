import type { Strategy } from "..";
import computeBill from "./compute-bill";

const UtilitiesStrategy: Strategy = {
    computeBill,
    ynabPayee: 'City of Austin'
}

export default UtilitiesStrategy;