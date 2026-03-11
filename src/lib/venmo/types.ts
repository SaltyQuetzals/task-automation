import { z } from "zod";

export interface VenmoRequestPayload {
    user_id: string;
    amount: number;
    note: string;
    audience: "private" | "friends" | "public";
    metadata: {
        quasi_cash_disclaimer_viewed: boolean;
    };
}

const VenmoUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    display_name: z.string(),
});

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

export const VenmoChargeRecordSchema = z.object({
    id: z.string(),
    status: z.string(),
    action: z.literal("charge"),
    amount: z.number(),
    note: z.string(),
    date_created: z.string(),
    date_completed: z.string().nullable(),
    target: z.object({
        type: z.string(),
        user: VenmoUserSchema.optional(),
    }),
});

export type VenmoChargeRecord = z.infer<typeof VenmoChargeRecordSchema>;
export type VenmoResponse = z.infer<typeof VenmoResponseSchema>;
