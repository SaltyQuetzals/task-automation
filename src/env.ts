import { z } from "zod";

const envSchema = z.object({
  TZ: z.string().min(1),
  GMAIL_USER: z.email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
  COA_UTILITIES_EMAIL: z.email(),
  COA_UTILITIES_PASSWORD: z.string().min(1),
  GOOGLE_GEN_AI_API_KEY: z.string().min(1),
  YNAB_CATEGORY_CLEAN_COMMUNITY_SERVICE: z.string().min(1),
  YNAB_CATEGORY_STREET_SERVICE: z.string().min(1),
  YNAB_CATEGORY_DRAINAGE_SERVICE: z.string().min(1),
  YNAB_CATEGORY_SOLID_WASTE_SERVICES: z.string().min(1),
  YNAB_CATEGORY_WATER: z.string().min(1),
  YNAB_CATEGORY_ELECTRIC: z.string().min(1),
  YNAB_CATEGORY_WASTEWATER: z.string().min(1),
  YNAB_CATEGORY_GAS: z.string().min(1),
  YNAB_CATEGORY_REIMBURSEMENTS: z.string().min(1),
  YNAB_API_TOKEN: z.string().min(1),
  YNAB_ACCOUNT: z.string().min(1),
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
