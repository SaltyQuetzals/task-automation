import "./env";
import { Temporal } from "temporal-polyfill";
import type { Bill, Cents } from "./types";
import { env } from "./env";
import * as ynab from "ynab";
import { createScheduledYNABTransaction, createSplitYNABTransaction, isScheduledTransaction, retrieveScheduledYNABTransaction, retrieveYNABTransaction } from "./ynab";
import { STRATEGIES, type Strategy } from "./strategies";
import { VenmoClient } from "./lib/venmo";

const MEMO = "Automatically Created";

export const updateYNAB = async (ynabAPI: ynab.API, payee: string, bill: Bill, today: Temporal.PlainDate) => {
  if (Temporal.PlainDate.compare(today, bill.dueDate) < 0) {
    // Bill is not yet due. Get/create YNAB transaction and exit
    let txn = await retrieveScheduledYNABTransaction(ynabAPI, bill, payee, MEMO);
    if (txn === null) {
      console.log('Did not find scheduled YNAB transaction. Creating...');
      txn = await createScheduledYNABTransaction(ynabAPI, bill, payee, MEMO);
    }
    return txn;
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

  return txn;
}

export const createVenmoRequest = async (venmoClient: VenmoClient, reimbursementCents: Cents, note: string) => {
  // Venmo expects dollars, not cents
  const reimbursementDollars = reimbursementCents / 100;

  const existingRequest = await venmoClient.findLatestChargeRequest(env.VENMO_RECIPIENT_USER_ID, reimbursementDollars, note);

  if (existingRequest !== null) {
    console.log('Request has already been made previously. Exiting early to avoid duplicate charge request.');
    return;
  }

  await venmoClient.sendPaymentRequest(env.VENMO_RECIPIENT_USER_ID, reimbursementDollars, note)
}

export const updateExternalSources = async (venmoClient: VenmoClient, ynabAPI: ynab.API, bill: Bill, strategy: Strategy, today: Temporal.PlainDate) => {
  const txn = await updateYNAB(ynabAPI, strategy.ynabPayee, bill, today);

  if (isScheduledTransaction(txn)) {
    console.log('Due date has yet to pass. No Venmo needed. Exiting.')
    return;
  };

  await createVenmoRequest(venmoClient, bill.splitsCents.Reimbursements, strategy.note(bill));
}

const workflow = async (mode: "gas" | "utilities") => {
  const strategy = STRATEGIES[mode];
  const bill = await strategy.computeBill();

  const venmoClient = new VenmoClient(env.VENMO_ACCESS_TOKEN, env.DRY_RUN);
  const ynabAPI = new ynab.API(env.YNAB_API_KEY);
  const today = Temporal.Now.plainDateISO(env.TZ);

  await updateExternalSources(venmoClient, ynabAPI, bill, strategy, today);
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
