import * as ynab from "ynab";
import { z } from "zod";
import { VenmoService } from "@auto-scripts/venmo";

// ============================================================================
// Configuration
// ============================================================================

const ConfigSchema = z.object({
  ynab: z.object({
    apiKey: z.string().min(1, "YNAB API key is required"),
    budgetId: z.string().refine((val) => /^[0-9a-f-]{36}$/.test(val), "Invalid YNAB budget ID format"),
    gasCategoryId: z.string().min(1, "YNAB gas category ID is required"),
    reimbursementCategoryId: z.string().min(1, "YNAB reimbursement category ID is required"),
  }),
  venmo: z.object({
    accessToken: z.string().min(1, "Venmo access token is required"),
    recipientUserId: z.string().min(1, "Venmo recipient user ID is required"),
  }),
  dryRun: z.boolean(),
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const dryRun = process.env.DRY_RUN !== "false";

  const configData = {
    ynab: {
      apiKey: process.env.YNAB_API_KEY || "",
      budgetId: process.env.YNAB_BUDGET_ID || "",
      gasCategoryId: process.env.YNAB_GAS_CATEGORY_ID || "",
      reimbursementCategoryId: process.env.YNAB_REIMBURSEMENT_CATEGORY_ID || "",
    },
    venmo: {
      accessToken: process.env.VENMO_ACCESS_TOKEN || "",
      recipientUserId: process.env.VENMO_RECIPIENT_USER_ID || "",
    },
    dryRun,
  };

  const result = ConfigSchema.safeParse(configData);
  if (!result.success) {
    throw new Error(`Configuration validation failed:\n${result.error.message}`);
  }

  return result.data;
}

// ============================================================================
// Workflow
// ============================================================================

interface GasTransaction {
  id: string;
  date: string;
  amount: number;
  memo?: string | null;
  payee_name?: string | null;
}

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(`[GAS BILL] Starting gas bill splitting automation (dry run: ${config.dryRun})`);

  const client = new ynab.API(config.ynab.apiKey);
  const venmoService = new VenmoService(config.venmo.accessToken, config.dryRun);

  try {
    // Step 1: Find the most recent "Texas Gas Service" transaction
    console.log("[GAS BILL] Step 1: Finding most recent Texas Gas Service transaction...");
    const gasTransaction = await findMostRecentGasTransaction(client, config.ynab.budgetId);

    if (!gasTransaction) {
      console.log(
        "[GAS BILL] No Texas Gas Service transaction found. Exiting without action."
      );
      process.exit(0);
    }

    console.log(
      `[GAS BILL] Found transaction: ${gasTransaction.id} on ${gasTransaction.date} for $${(Math.abs(gasTransaction.amount) / 1000).toFixed(2)}`
    );

    // Step 2: Check if already processed
    console.log("[GAS BILL] Step 2: Checking if transaction is already processed...");
    if (gasTransaction.memo === "Automatically split") {
      console.log(
        "[GAS BILL] Transaction already marked as processed. Exiting without action."
      );
      process.exit(0);
    }

    // Step 3: Calculate split amounts
    console.log("[GAS BILL] Step 3: Calculating split amounts...");
    const total = Math.abs(gasTransaction.amount);
    const reimbursement = Math.floor(total / 2);
    const gas = total - reimbursement;

    console.log(
      `[GAS BILL] Total: ${(total / 1000).toFixed(2)}, Gas: ${(gas / 1000).toFixed(2)}, Reimbursement: ${(reimbursement / 1000).toFixed(2)}`
    );

    // Step 4: Update YNAB transaction to split categories
    console.log("[GAS BILL] Step 4: Updating YNAB transaction with splits...");
    if (!config.dryRun) {
      await client.transactions.updateTransaction(config.ynab.budgetId, gasTransaction.id, {
        transaction: {
          category_id: null,
          subtransactions: [
            {
              amount: -gas,
              category_id: config.ynab.gasCategoryId,
              memo: "Gas",
            },
            {
              amount: -reimbursement,
              category_id: config.ynab.reimbursementCategoryId,
              memo: "Reimbursements",
            },
          ],
        },
      });
      console.log("[GAS BILL] Transaction updated with subtransactions.");
    } else {
      console.log(
        `[GAS BILL] [DRY RUN] Would update transaction with subtransactions (Gas: $${(gas / 1000).toFixed(2)}, Reimbursement: $${(reimbursement / 1000).toFixed(2)})`
      );
    }

    // Step 5: Send Venmo request
    console.log("[GAS BILL] Step 5: Sending Venmo payment request...");
    const note = `Gas Bill (${gasTransaction.date})`;
    const amountDollars = reimbursement / 1000;

    await venmoService.sendPaymentRequest(
      config.venmo.recipientUserId,
      amountDollars,
      note
    );
    console.log(`[GAS BILL] Venmo request sent: $${amountDollars.toFixed(2)}`);

    // Step 6: Mark YNAB transaction as processed
    console.log("[GAS BILL] Step 6: Marking transaction as processed...");
    if (!config.dryRun) {
      await client.transactions.updateTransaction(config.ynab.budgetId, gasTransaction.id, {
        transaction: {
          memo: "Automatically split",
        },
      });
      console.log("[GAS BILL] Transaction marked as processed.");
    } else {
      console.log("[GAS BILL] [DRY RUN] Would mark transaction with memo 'Automatically split'");
    }

    console.log("[GAS BILL] ✓ Gas bill splitting completed successfully!");
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GAS BILL] ✗ Error: ${message}`);
    process.exit(1);
  }
}

/**
 * Find the most recent "Texas Gas Service" transaction
 */
async function findMostRecentGasTransaction(
  client: ynab.API,
  budgetId: string
): Promise<GasTransaction | null> {
  try {
    // Get all payees and find the one matching "Texas Gas Service"
    const payeesResponse = await client.payees.getPayees(budgetId);
    const payees = payeesResponse.data?.payees || [];

    const gasPayee = payees.find((p) =>
      p.name.toLowerCase().includes("i3p texas gas service")
    );

    if (!gasPayee) {
      console.log("[GAS BILL] No payee matching 'Texas Gas Service' found.");
      return null;
    }

    console.log(`[GAS BILL] Found payee: ${gasPayee.name} (ID: ${gasPayee.id})`);

    // Get transactions for this payee
    const transactionsResponse = await client.transactions.getTransactionsByPayee(
      budgetId,
      gasPayee.id
    );
    const transactions = transactionsResponse.data?.transactions || [];

    if (transactions.length === 0) {
      console.log("[GAS BILL] No transactions found for this payee.");
      return null;
    }

    // Filter out deleted transactions and sort by date (descending)
    const validTransactions = transactions
      .filter((tx) => !tx.deleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (validTransactions.length === 0) {
      console.log("[GAS BILL] No valid transactions found.");
      return null;
    }

    const mostRecent = validTransactions[0];
    if (!mostRecent) {
      return null;
    }

    return {
      id: mostRecent.id,
      date: mostRecent.date,
      amount: mostRecent.amount,
      memo: mostRecent.memo,
      payee_name: mostRecent.payee_name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to find gas transaction: ${message}`);
  }
}

// ============================================================================
// Run
// ============================================================================

main();
