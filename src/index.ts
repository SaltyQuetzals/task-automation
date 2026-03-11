import computeGasBill from "./compute-gas-bill";
import computeUtilitiesBill from "./compute-utilities-bill";
import type { Bill } from "./types";

const [, , command] = process.argv;

type Mode = "gas" | "utilities";

const isMode = (val: string): val is Mode => {
  return val === "gas" || val === "utilities";
};

const STRATEGIES: Record<Mode, () => Promise<Bill>> = {
  gas: computeGasBill,
  utilities: computeUtilitiesBill,
};

const workflow = async (mode: Mode) => {
  const billCalculationStrategy = STRATEGIES[mode];
  const bill = await billCalculationStrategy();
  console.log('bill =', bill);
};

const main = async () => {
  if (!command) {
    throw new Error(`A command must be provided.`);
  }
  if (!isMode(command)) {
    throw new Error(
      `Unrecognized command: ${command}. Usage: bun src/index.ts <gas|utilities>`,
    );
  }

  await workflow(command);
};

main();
