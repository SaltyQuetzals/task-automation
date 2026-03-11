import { VenmoResponseSchema, type VenmoRequestPayload } from "./types";

/**
 * Client for Venmo API 
 */
export class VenmoClient {
  private accessToken: string;
  private dryRun: boolean;
  private fetchFn: typeof fetch;

  constructor(
    accessToken: string,
    dryRun: boolean = false,
    fetchFn: typeof fetch = globalThis.fetch
  ) {
    this.accessToken = accessToken;
    this.dryRun = dryRun;
    this.fetchFn = fetchFn;
  }

  /**
   * Send a Venmo payment request
   * @param recipientUserId - Venmo user ID of the recipient
   * @param amount - Amount to request (in dollars)
   * @param note - Payment note
   * @returns Transaction ID from Venmo (or mock ID if dry run)
   * @throws Error if request fails
   */
  async sendPaymentRequest(recipientUserId: string, amount: number, note: string): Promise<string> {
    console.info(`Sending Venmo request for $${amount.toFixed(2)}...`);

    if (this.dryRun) {
      const mockTransactionId = `mock_${Date.now()}`;
      console.info(`[DRY RUN] Venmo request would be sent: $${amount.toFixed(2)} (Mock ID: ${mockTransactionId})`);
      return mockTransactionId;
    }

    const payload = this.buildPayload(recipientUserId, amount, note);

    try {
      const response = await this.fetchFn("https://api.venmo.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Venmo API returned ${response.status}: ${errorBody || response.statusText}`);
      }

      const data = await response.json();

      // Validate response structure
      const validated = VenmoResponseSchema.parse(data);

      const transactionId = validated.data?.payment?.id;
      if (!transactionId) {
        throw new Error("No transaction ID returned from Venmo API");
      }

      console.info(`Venmo request sent: $${amount.toFixed(2)} to ${recipientUserId} (Request ID: ${transactionId})`);

      return transactionId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Venmo request: ${message}`);
    }
  }

  /**
   * Build the Venmo API request payload
   * @param recipientUserId - Venmo user ID
   * @param amount - Amount in dollars
   * @param note - Payment note
   * @returns Formatted request payload
   */
  private buildPayload(recipientUserId: string, amount: number, note: string): VenmoRequestPayload {
    return {
      user_id: recipientUserId,
      amount: amount,
      note,
      audience: "private",
      metadata: {
        quasi_cash_disclaimer_viewed: false,
      },
    };
  }
}
