import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai"
import { Temporal } from "temporal-polyfill";
import { env } from "../../env";
import { YNABCategory } from "../../categories";
import type { Cents, Bill } from "../../types";

// As neither reimbursement amounts nor gas are contained within a
// City of Austin utilities bill, we should exclude those as options
// for the LLM to provide by mistake.
const allowedUtilityCategories = [
    YNABCategory.CleanCommunityService,
    YNABCategory.StreetService,
    YNABCategory.DrainageService,
    YNABCategory.SolidWasteServices,
    YNABCategory.Water,
    YNABCategory.Electric,
    YNABCategory.Wastewater,
] as const;

export const ExtractedItemsSchema = z.object({
    dateDue: z.iso.date(),
    splits: z.object(
        Object.fromEntries(
            allowedUtilityCategories.map(cat => [cat, z.number().nonnegative()])
        )
    ).transform(splits =>
        Object.fromEntries(
            Object.entries(splits).map(([key, val]) => [key, (val * 100) as Cents])
        ) as Record<string, Cents>
    )
})

const downloadBill = async (email: string, password: string) => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto("https://coautilities.com/wps/wcm/connect/occ/coa/home");
        await page.getByRole("textbox", { name: "Username" }).click();
        await page.getByRole("textbox", { name: "Username" }).fill(email);
        await page.getByText("Username Password Log in").click();
        await page.getByRole("textbox", { name: "Password" }).click();
        await page.getByRole("textbox", { name: "Password" }).fill(password);
        await page.getByRole("button", { name: "Log in" }).click();
        await page.goto("https://dss-coa.opower.com/dss/overview");
        await page.getByRole("link", { name: "View bill" }).click();
        const downloadPromise = page.waitForEvent("download");
        await page
            .getByRole("button", { name: "View bill (pdf)", exact: true })
            .click();
        const download = await downloadPromise;

        // Save download to example.pdf
        const path = await download.path();
        const buffer = await Bun.file(path).bytes();
        return buffer;
    } finally {
        await browser.close();
    }
};

/**
 * Extract the first page of a PDF and encode as base64
 * @param pdfBuffer - Buffer containing PDF file contents
 * @returns Base64-encoded PDF of the first page
 * @throws Error if PDF is invalid
 */
const extractFirstPage = async (pdfBuffer: ArrayBuffer): Promise<string> => {
    console.info("Processing PDF...");

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const pageCount = pdfDoc.getPageCount();
    console.info(`PDF has ${pageCount} pages, extracting page 1...`);

    // Create new PDF with only first page
    const newPdfDoc = await PDFDocument.create();
    const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
    newPdfDoc.addPage(firstPage);

    // Save and encode to base64
    const pdfBytes = await newPdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return base64;
};

const extractBillData = async (googleGenAIAPIKey: string, firstPage: string, allowedUtilityCategories: readonly YNABCategory[]): Promise<z.infer<typeof ExtractedItemsSchema>> => {
    const client = new GoogleGenAI({ apiKey: googleGenAIAPIKey });

    const prompt = buildPrompt(allowedUtilityCategories);

    const timeoutMs = 120_000; // 2 minute timeout
    const timeoutPromise: Promise<never> = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout after 2 minutes")), timeoutMs));

    const response = await Promise.race([
        client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "application/pdf",
                                data: firstPage,
                            },
                        },
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    properties: {
                        dateDue: { type: "string", format: "date" },
                        splits: {
                            type: "object",
                            properties: Object.fromEntries(
                                allowedUtilityCategories.map(cat => [cat, { type: "number" }])
                            ),
                            required: allowedUtilityCategories,
                            additionalProperties: false,
                        },
                    },
                    required: ["dateDue", "splits"],
                },
            },
        }
        ),
        timeoutPromise
    ])

    if (!response.text) {
        throw new Error("No text in LLM response");
    }

    const validated = ExtractedItemsSchema.parse(JSON.parse(response.text));

    return validated;
}

const buildPrompt = (allowedUtilityCategories: readonly YNABCategory[]): string => {
    const categoriesText = allowedUtilityCategories.join(", ");

    return `You are an expert at parsing utility receipts. Extract the itemized breakdown and due date from the provided PDF.

When naming items, use these exact category names if applicable:
${categoriesText}

Important:
- "amount" should be a number (without dollar signs)
- Include all fees and charges as separate items
- Do NOT include the total or subtotal lines
- Match descriptions to the category names above when possible
- Extract the "Date Due:" field and format it as YYYY-MM-DD (e.g., 2025-12-31)

Extract all line items and the due date.`;
}

export default async (): Promise<Bill> => {
    const uint8buf = await downloadBill(
        env.COA_UTILITIES_EMAIL,
        env.COA_UTILITIES_PASSWORD,
    );
    const firstPage = await extractFirstPage(uint8buf.buffer);
    const extracted = await extractBillData(env.GOOGLE_GEN_AI_API_KEY, firstPage, allowedUtilityCategories);

    const totalCents = Object.values(extracted.splits).reduce((acc, val) => acc + val, 0) as Cents;
    return {
        dueDate: Temporal.PlainDate.from(extracted.dateDue),
        totalCents,
        splitsCents: { ...extracted.splits, "Reimbursements": totalCents / 2 as Cents }
    }
};
