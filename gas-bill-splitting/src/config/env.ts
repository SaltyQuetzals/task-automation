import { z } from "zod";
import {
  asBudgetId,
  asCategoryId,
  asVenmoUserId,
} from "../types/domain";

/**
 * Configuration schema for validation
 */
const ConfigSchema = z.object({
  ynab: z.object({
    apiKey: z.string().min(1, "YNAB API key is required"),
    budgetId: z.string(),
    gasCategoryId: z.string(),
    reimbursementCategoryId: z.string(),
  }),
  venmo: z.object({
    accessToken: z.string().min(1, "Venmo access token is required"),
    recipientUserId: z.string(),
  }),
  dryRun: z.boolean(),
});

export type RawConfig = z.infer<typeof ConfigSchema>;

/**
 * Application configuration with typed IDs
 */
export interface AppConfig {
  ynab: {
    apiKey: string;
    budgetId: ReturnType<typeof asBudgetId>;
    gasCategoryId: ReturnType<typeof asCategoryId>;
    reimbursementCategoryId: ReturnType<typeof asCategoryId>;
  };
  venmo: {
    accessToken: string;
    recipientUserId: ReturnType<typeof asVenmoUserId>;
  };
  dryRun: boolean;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const dryRun = process.env.DRY_RUN !== "false";

  const rawConfig: RawConfig = {
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

  // Validate raw config
  const validation = ConfigSchema.safeParse(rawConfig);
  if (!validation.success) {
    throw new Error(`Configuration validation failed:\n${validation.error.message}`);
  }

  const config = validation.data;

  // Convert and validate typed IDs
  try {
    return {
      ynab: {
        apiKey: config.ynab.apiKey,
        budgetId: asBudgetId(config.ynab.budgetId),
        gasCategoryId: asCategoryId(config.ynab.gasCategoryId),
        reimbursementCategoryId: asCategoryId(config.ynab.reimbursementCategoryId),
      },
      venmo: {
        accessToken: config.venmo.accessToken,
        recipientUserId: asVenmoUserId(config.venmo.recipientUserId),
      },
      dryRun,
    };
  } catch (error) {
    throw new Error(
      `Configuration ID validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
