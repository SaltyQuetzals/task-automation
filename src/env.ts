import { z } from "zod";

const envSchema = z.object({
  DRY_RUN: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  TZ: z.string().min(1),
  GMAIL_USER: z.email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
  COA_UTILITIES_EMAIL: z.email(),
  COA_UTILITIES_PASSWORD: z.string().min(1),
  GOOGLE_API_KEY: z.string().min(1),
  VENMO_RECIPIENT_USER_ID: z.string().min(1),
  VENMO_ACCESS_TOKEN: z.string().min(1),
  YNAB_CLEAN_COMMUNITY_SERVICE_CATEGORY_ID: z.string().min(1),
  YNAB_STREET_SERVICE_CATEGORY_ID: z.string().min(1),
  YNAB_DRAINAGE_SERVICE_CATEGORY_ID: z.string().min(1),
  YNAB_SOLID_WASTE_SERVICES_CATEGORY_ID: z.string().min(1),
  YNAB_WATER_CATEGORY_ID: z.string().min(1),
  YNAB_ELECTRIC_CATEGORY_ID: z.string().min(1),
  YNAB_WASTEWATER_CATEGORY_ID: z.string().min(1),
  YNAB_GAS_CATEGORY_ID: z.string().min(1),
  YNAB_REIMBURSEMENT_CATEGORY_ID: z.string().min(1),
  YNAB_API_KEY: z.string().min(1),
  YNAB_ACCOUNT_ID: z.string().min(1),
  DISCORD_WEBHOOK_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Missing or invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
