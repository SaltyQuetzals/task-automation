import "./env";
import { Temporal } from "temporal-polyfill";
import type { Strategy } from "./types";
import { env } from "./env";
import GasStrategy from "./gas";
import UtilitiesStrategy from "./utilities";
import * as ynab from "ynab";
import { createScheduledYNABTransaction, createSplitYNABTransaction, retrieveScheduledYNABTransaction, retrieveYNABTransaction } from "./ynab";

const [, , command] = process.argv;

type Mode = "gas" | "utilities";

const isMode = (val: string): val is Mode => {
  return val === "gas" || val === "utilities";
};

const STRATEGIES: Record<Mode, Strategy> = {
  gas: GasStrategy,
  utilities: UtilitiesStrategy,
};

const MEMO = "Automatically Created";

const workflow = async (mode: Mode) => {
  const strategy = STRATEGIES[mode];
  const bill = await strategy.computeBill();
  const today = Temporal.Now.plainDateISO(env.TZ);
  const ynabAPI = new ynab.API(env.YNAB_API_TOKEN);

  if (Temporal.PlainDate.compare(today, bill.dueDate) < 0) {
    // Bill is not yet due. Get/create YNAB transaction and exit
    if (await retrieveScheduledYNABTransaction(ynabAPI, bill, strategy.ynabPayee, MEMO) === null) {
      console.log('Did not find scheduled YNAB transaction. Creating...');
      await createScheduledYNABTransaction(ynabAPI, bill, strategy.ynabPayee, MEMO);
    }
    return;
  }

  // Due date has passed. We assume autopay worked, so check YNAB for an existing
  // transaction
  let txn = await retrieveYNABTransaction(ynabAPI, bill, strategy.ynabPayee, MEMO);

  if (txn === null) {
    console.log('Did not find matching split YNAB transaction. Creating...');
    txn = await createSplitYNABTransaction(ynabAPI, bill, strategy.ynabPayee, MEMO);
  }

  if (txn.subtransactions.length === 0) {
    console.log('Found matching YNAB transaction, but no splits were attached. Replacing with split transaction...');
    await ynabAPI.transactions.deleteTransaction("last-used", txn.id);
    txn = await createSplitYNABTransaction(ynabAPI, bill, strategy.ynabPayee, MEMO);
  }
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
