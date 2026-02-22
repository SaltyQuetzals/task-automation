import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractedItemsSchema } from "../types/schemas";
import type { ExtractedBill } from "../types/bill";
import { logger } from "../lib/logger";
import type { Dollars } from "../types/domain";

/**
 * Service for Google Gemini AI-powered bill data extraction
 */
export class GeminiService {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Extract bill data (line items and due date) from a PDF using Gemini
   * @param pdfBase64 - Base64-encoded PDF
   * @param categoryHints - Category names to hint to the model
   * @returns Extracted bill data with line items and optional due date
   * @throws Error if API call fails or response is invalid after retries
   */
  async extractBillData(pdfBase64: string, categoryHints: string[]): Promise<ExtractedBill> {
    logger.info("Extracting itemized breakdown using Google Gemini...");

    const prompt = this.buildPrompt(categoryHints);
    logger.info(`Prompt length: ${prompt.length} characters`);
    logger.info(`PDF data size: ${pdfBase64.length} bytes (base64)`);
    logger.info(`Category hints: ${categoryHints.join(", ")}`);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          logger.info(`Retry attempt ${attempt}/${maxRetries}...`);
        } else {
          logger.info("Sending request to Gemini API (gemini-2.5-flash)...");
        }

        const startTime = Date.now();

        const timeoutMs = 120000; // 2 minute timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout after 2 minutes")), timeoutMs)
        );

        const response = (await Promise.race([
          this.client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: pdfBase64,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: z.toJSONSchema(ExtractedItemsSchema),
            },
          } as any),
          timeoutPromise,
        ])) as any;

        const elapsedTime = Date.now() - startTime;
        logger.info(`API response received in ${elapsedTime}ms`);

        if (!response.text) {
          throw new Error("No text in Gemini response");
        }

        logger.info(`Response text length: ${response.text.length} characters`);
        logger.info(`Validating response against schema...`);

        const validated = ExtractedItemsSchema.parse(JSON.parse(response.text));

        if (validated.dateDue) {
          logger.info(`Due date: ${validated.dateDue}`);
        }

        // Calculate total amount
        const totalAmountRaw = validated["Clean Community Service"] + validated["Drainage Service"] + validated["Electric"] + validated["Solid Waste Services"] + validated["Street Service"] + validated["Wastewater"] + validated["Water"];

        const { dateDue, ...categories } = validated;

        return {
          categories,
          dateDue,
          totalAmount: totalAmountRaw as Dollars,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryableError = lastError.message.toLowerCase().includes("timeout") || lastError.message.toLowerCase().includes("abort");

        if (error instanceof Error) {
          logger.error(`Attempt ${attempt} failed: ${error.message}`);
          if (error.message.includes("parse")) {
            logger.error(`Response parsing failed - response may be invalid JSON or not matching schema`);
          }
          if (lastError.message.toLowerCase().includes("timeout")) {
            logger.error(`Request timed out after 2 minutes`);
          }
        }

        // Only retry on timeout/abort errors and if we haven't exhausted retries
        if (!isRetryableError) {
          // Non-retryable error: throw immediately
          throw lastError;
        }

        if (attempt === maxRetries) {
          // Timeout error but we've exhausted retries: throw
          throw lastError;
        }

        // Timeout error and retries remaining: wait and continue loop
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        logger.info(`Waiting ${delayMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError || new Error("Failed to extract bill data");
  }

  /**
   * Build the prompt for Gemini
   * @param categoryHints - Category names to include in prompt
   * @returns Formatted prompt string
   */
  private buildPrompt(categoryHints: string[]): string {
    const categoriesText = categoryHints.join(", ");

    return `You are an expert at parsing utility receipts. Extract the itemized breakdown and due date from the provided PDF.

When naming items, use these exact category names if applicable:
${categoriesText}

Important:
- "amount" should be a number (without dollar signs)
- Include all fees and charges as separate items
- Do NOT include the total or subtotal lines
- Match descriptions to the category names above when possible
- Extract the "Date Due:" field and format it as YYYY-MM-DD (e.g., 2025-12-31)
- If no due date is found, omit the dateDue field

Extract all line items and the due date.`;
  }
}
