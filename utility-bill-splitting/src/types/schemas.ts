import { z } from "zod";

// Core bill extraction schemas
export const LineItemSchema = z.object({
  description: z.string().describe("The name/description of the line item"),
  amount: z.number().describe("The monetary amount of the line item"),
});

export const ExtractedItemsSchema = z.object({
  Electric: z.number().positive().describe("The charge for electricity consumption"),
  Water: z.number().positive().describe("The charge for water usage"),
  Wastewater: z.number().positive().describe("The treatment and disposal charge for wastewater"),
  "Clean Community Service": z.number().positive().describe("A municipal service fee for community cleanliness/maintenance"),
  "Solid Waste Services": z.number().positive().describe("The charge for trash/garbage collection and disposal"),
  "Drainage Service": z.number().positive().describe("The fee for stormwater/drainage system usage"),
  "Street Service": z.number().positive().describe("The charge for street maintenance and upkeep"),
  dateDue: z.string().optional().describe("The due date from the bill in YYYY-MM-DD format"),
});

// Environment configuration schemas
export const GoogleConfigSchema = z.object({
  apiKey: z.string().min(1, "Google API key is required"),
});

export const YnabConfigSchema = z.object({
  apiKey: z.string().min(1, "YNAB API key is required"),
  budgetId: z.string().uuid("Invalid YNAB budget ID format"),
  accountId: z.string().uuid("Invalid YNAB account ID format"),
  reimbursementCategoryId: z.string().min(1, "YNAB reimbursement category ID is required"),
});

export const VenmoConfigSchema = z.object({
  accessToken: z.string().min(1, "Venmo access token is required"),
  recipientUserId: z.string().min(1, "Venmo recipient user ID is required"),
});

export const CoaUtilitiesConfigSchema = z.object({
  email: z.string().email("Invalid COA utilities email"),
  password: z.string().min(1, "COA utilities password is required"),
});

export const AppConfigSchema = z.object({
  google: GoogleConfigSchema,
  ynab: YnabConfigSchema,
  venmo: VenmoConfigSchema.optional(),
  coaUtilities: CoaUtilitiesConfigSchema,
  pdf: z.object({
    filePath: z.string().min(1, "PDF file path is required"),
  }),
  app: z.object({
    dryRun: z.boolean(),
  }),
});

// Venmo API schemas (re-exported from shared package)
export { VenmoPaymentSchema, VenmoResponseSchema } from "@auto-scripts/venmo";

// YNAB API schemas
export const YnabTransactionResponseSchema = z.object({
  data: z
    .object({
      transactions: z.array(z.object({ id: z.string() })).optional(),
      transaction: z.object({ id: z.string() }).optional(),
    })
    .optional(),
});

// Type inferences
export type LineItem = z.infer<typeof LineItemSchema>;
export type ExtractedItems = z.infer<typeof ExtractedItemsSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type YnabTransactionResponse = z.infer<typeof YnabTransactionResponseSchema>;
