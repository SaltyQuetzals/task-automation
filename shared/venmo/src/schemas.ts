import { z } from "zod";

// Venmo API schemas
export const VenmoPaymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.number(),
});

export const VenmoResponseSchema = z.object({
  data: z
    .object({
      payment: VenmoPaymentSchema.optional(),
    })
    .optional(),
});
