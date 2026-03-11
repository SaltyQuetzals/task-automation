import "./env";
import { Temporal } from "temporal-polyfill";
import type { Bill } from "./types";
import { env } from "./env";
import * as ynab from "ynab";
import { createScheduledYNABTransaction, createSplitYNABTransaction, retrieveScheduledYNABTransaction, retrieveYNABTransaction } from "./ynab";
import { STRATEGIES } from "./strategies";

const MEMO = "Automatically Created";

export const updateYNAB = async (ynabAPI: ynab.API, payee: string, bill: Bill, today: Temporal.PlainDate) => {
  if (Temporal.PlainDate.compare(today, bill.dueDate) < 0) {
    // Bill is not yet due. Get/create YNAB transaction and exit
    if (await retrieveScheduledYNABTransaction(ynabAPI, bill, payee, MEMO) === null) {
      console.log('Did not find scheduled YNAB transaction. Creating...');
      await createScheduledYNABTransaction(ynabAPI, bill, payee, MEMO);
    }
    return;
  }

  // Due date has passed. We assume autopay worked, so check YNAB for an existing
  // transaction
  let txn = await retrieveYNABTransaction(ynabAPI, bill, payee, MEMO);

  if (txn === null) {
    console.log('Did not find matching split YNAB transaction. Creating...');
    txn = await createSplitYNABTransaction(ynabAPI, bill, payee, MEMO);
  }

  if (txn.subtransactions.length === 0) {
    console.log('Found matching YNAB transaction, but no splits were attached. Replacing with split transaction...');
    await ynabAPI.transactions.deleteTransaction("last-used", txn.id);
    txn = await createSplitYNABTransaction(ynabAPI, bill, payee, MEMO);
  }
}

const workflow = async (mode: "gas" | "utilities") => {
  const strategy = STRATEGIES[mode];
  const bill = await strategy.computeBill();
  const today = Temporal.Now.plainDateISO(env.TZ);
  const ynabAPI = new ynab.API(env.YNAB_API_TOKEN);

  await updateYNAB(ynabAPI, strategy.ynabPayee, bill, today);
};

const [, , command] = process.argv;

const main = async () => {
  if (!command) {
    throw new Error(`A command must be provided.`);
  }
  if (command !== "gas" && command !== "utilities") {
    throw new Error(
      `Unrecognized command: ${command}. Usage: bun src/index.ts <gas|utilities>`,
    );
  }

  await workflow(command);
};

if (import.meta.main) {
  main();
}
