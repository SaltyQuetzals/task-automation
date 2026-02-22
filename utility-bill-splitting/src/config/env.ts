import { AppConfigSchema } from "../types/schemas";
import { CATEGORY_MAPPING } from "./categories";

/**
 * Load and validate all environment variables
 * Throws early if required variables are missing or invalid
 */
export function loadConfig() {
  const dryRun = process.env.DRY_RUN !== "false";

  const configData = {
    google: {
      apiKey: process.env.GOOGLE_API_KEY || "",
    },
    ynab: {
      apiKey: process.env.YNAB_API_KEY || "",
      budgetId: process.env.YNAB_BUDGET_ID || "",
      accountId: process.env.YNAB_ACCOUNT_ID || "",
      reimbursementCategoryId: process.env.YNAB_CATEGORY_REIMBURSEMENT || "",
    },
    venmo: dryRun
      ? undefined
      : {
          accessToken: process.env.VENMO_ACCESS_TOKEN || "",
          recipientUserId: process.env.VENMO_RECIPIENT_USER_ID || "",
        },
    coaUtilities: {
      email: process.env.COA_UTILITIES_EMAIL || "",
      password: process.env.COA_UTILITIES_PASSWORD || "",
    },
    pdf: {
      filePath: process.env.PDF_FILE_PATH || "example.pdf",
    },
    app: {
      dryRun,
    },
  };

  // Validate configuration
  const result = AppConfigSchema.safeParse(configData);

  if (!result.success) {
    throw new Error(`Configuration validation failed:\n${result.error.message}`);
  }

  return result.data;
}

export const config = loadConfig();

/**
 * Get category mapping for use in services
 */
export function getCategoryMapping(): Record<string, string> {
  return CATEGORY_MAPPING;
}
