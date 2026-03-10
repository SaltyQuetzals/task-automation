import computeGasBill from "./compute-gas-bill";
import type { Bill } from "./types";

const [, , command] = process.argv;

type Mode = "gas" | "utilities";

const isMode = (val: string): val is Mode => {
  return val === "gas" || val === "utilities";
};

const STRATEGIES: Record<Mode, () => Promise<Bill>> = {
  gas: computeGasBill,
  utilities: async () => {
    return {
      dueDate: "",
      total: 0,
    } satisfies Bill;
  },
};

const workflow = async (mode: Mode) => {
  const pdfDownloadStrategy = STRATEGIES[mode];
  await pdfDownloadStrategy();
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
