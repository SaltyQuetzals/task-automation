export interface VenmoRequestPayload {
    user_id: string;
    amount: number;
    note: string;
    audience: "private" | "friends" | "public";
    metadata: {
        quasi_cash_disclaimer_viewed: boolean;
    };
}

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

export interface VenmoResponse extends z.infer<typeof VenmoResponseSchema> { }


import { z } from "zod";

