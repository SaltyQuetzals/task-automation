/**
 * Format a number as USD currency
 * @param amount - Amount in dollars
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns Today's date as YYYY-MM-DD string
 */
export function getISODate(): string {
  const date = new Date().toISOString().split("T")[0];
  return date || "";
}

/**
 * Format a Venmo request note with date
 * @param date - Optional date string (defaults to today)
 * @returns Formatted note string
 */
export function formatVenmoNote(date?: string): string {
  const dateStr = date || getISODate();
  return `Utilities (${dateStr})`;
}
