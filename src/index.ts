import "./env";
import { Temporal } from "temporal-polyfill";
import type { Bill, Cents } from "./types";
import { env } from "./env";
import * as ynab from "ynab";
import { createScheduledYNABTransaction, createSplitYNABTransaction, isScheduledTransaction, retrieveScheduledYNABTransaction, retrieveYNABTransaction } from "./ynab";
import { STRATEGIES, type Strategy } from "./strategies";
import { VenmoClient } from "./lib/venmo";
import { sendDiscordNotification } from "./lib/discord";

const MEMO = "Automatically Created";

export const updateYNAB = async (ynabAPI: ynab.API, payee: string, bill: Bill, today: Temporal.PlainDate) => {
  if (Temporal.PlainDate.compare(today, bill.dueDate) < 0) {
    // Bill is not yet due. Get/create YNAB transaction and exit
    let txn = await retrieveScheduledYNABTransaction(ynabAPI, bill, payee, MEMO);
    if (txn === null) {
      console.log('Did not find scheduled YNAB transaction. Creating...');
      txn = await createScheduledYNABTransaction(ynabAPI, bill, payee, MEMO);
      return { txn, ynabUpdated: true };
    }
    return { txn, ynabUpdated: false };
  }

  // Due date has passed. We assume autopay worked, so check YNAB for an existing
  // transaction
  let txn = await retrieveYNABTransaction(ynabAPI, bill, payee, MEMO);

  if (txn === null) {
    console.log('Did not find matching split YNAB transaction. Creating...');
    txn = await createSplitYNABTransaction(ynabAPI, bill, payee, MEMO);
    return { txn, ynabUpdated: true };
  }

  if (txn.subtransactions.length === 0) {
    console.log('Found matching YNAB transaction, but no splits were attached. Replacing with split transaction...');
    await ynabAPI.transactions.deleteTransaction("last-used", txn.id);
    txn = await createSplitYNABTransaction(ynabAPI, bill, payee, MEMO);
    return { txn, ynabUpdated: true };
  }

  return { txn, ynabUpdated: false };
}

export const createVenmoRequest = async (venmoClient: VenmoClient, reimbursementCents: Cents, note: string): Promise<'venmo-sent' | 'venmo-skipped'> => {
  // Venmo expects dollars, not cents
  const reimbursementDollars = reimbursementCents / 100;

  const existingRequest = await venmoClient.findLatestChargeRequest(env.VENMO_RECIPIENT_USER_ID, reimbursementDollars, note);

  if (existingRequest !== null) {
    console.log('Request has already been made previously. Exiting early to avoid duplicate charge request.');
    return 'venmo-skipped';
  }

  await venmoClient.sendPaymentRequest(env.VENMO_RECIPIENT_USER_ID, reimbursementDollars, note);
  return 'venmo-sent';
}

export const updateExternalSources = async (venmoClient: VenmoClient, ynabAPI: ynab.API, bill: Bill, strategy: Strategy, today: Temporal.PlainDate) => {
  const { txn, ynabUpdated } = await updateYNAB(ynabAPI, strategy.ynabPayee, bill, today);

  if (isScheduledTransaction(txn)) {
    console.log('Due date has yet to pass. No Venmo needed. Exiting.')
    return { status: 'scheduled' as const, ynabUpdated };
  };

  const status = await createVenmoRequest(venmoClient, bill.splitsCents.Reimbursements, strategy.note(bill));
  return { status, ynabUpdated };
}

const workflow = async (mode: "gas" | "utilities") => {
  const strategy = STRATEGIES[mode];
  const bill = await strategy.computeBill();

  const venmoClient = new VenmoClient(env.VENMO_ACCESS_TOKEN, env.DRY_RUN);
  const ynabAPI = new ynab.API(env.YNAB_API_KEY);
  const today = Temporal.Now.plainDateISO(env.TZ);

  const { status, ynabUpdated } = await updateExternalSources(venmoClient, ynabAPI, bill, strategy, today);
  return { bill, status, ynabUpdated };
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

  const label = command === 'gas' ? 'Gas' : 'Utilities';

  try {
    const { bill, status, ynabUpdated } = await workflow(command);

    if (!ynabUpdated && status !== 'venmo-sent') {
      console.log('Nothing to report — no changes made.');
      return;
    }
    const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const statusLabel = {
      'scheduled': 'Scheduled (bill not yet due)',
      'venmo-sent': 'Venmo request sent',
      'venmo-skipped': 'Venmo request already exists — skipped',
    }[status];
    const message = [
      `✅ **${label} bill run succeeded**`,
      `**Due:** ${bill.dueDate} | **Total:** ${fmt(bill.totalCents)} | **Reimbursement:** ${fmt(bill.splitsCents.Reimbursements)}`,
      `**Status:** ${statusLabel}`,
    ].join('\n');
    await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, message, true);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const message = `❌ **${label} bill run failed**\n\`\`\`\n${detail}\n\`\`\``;
    await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, message, false);
    process.exit(1);
  }
};

if (import.meta.main) {
  await main();
  process.exit(0);
}
