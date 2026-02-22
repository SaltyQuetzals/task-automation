import { test, expect } from "bun:test";
import { formatCurrency, getISODate, formatVenmoNote } from "./formatters";

test("formatCurrency - formats positive amounts", () => {
  expect(formatCurrency(100)).toBe("$100.00");
  expect(formatCurrency(50.5)).toBe("$50.50");
  expect(formatCurrency(0.99)).toBe("$0.99");
});

test("formatCurrency - handles zero", () => {
  expect(formatCurrency(0)).toBe("$0.00");
});

test("formatCurrency - formats large amounts", () => {
  expect(formatCurrency(123456.78)).toBe("$123456.78");
});

test("getISODate - returns date in YYYY-MM-DD format", () => {
  const result = getISODate();
  expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("getISODate - returns today's date", () => {
  const result = getISODate();
  const today = new Date().toISOString().split("T")[0] || "";
  expect(result).toBe(today);
});

test("formatVenmoNote - formats with provided date", () => {
  const note = formatVenmoNote("2025-01-15");
  expect(note).toBe("Utilities (2025-01-15)");
});

test("formatVenmoNote - uses today's date if not provided", () => {
  const note = formatVenmoNote();
  const today = new Date().toISOString().split("T")[0];
  expect(note).toBe(`Utilities (${today})`);
});

test("formatVenmoNote - handles various date formats", () => {
  expect(formatVenmoNote("2024-12-31")).toBe("Utilities (2024-12-31)");
  expect(formatVenmoNote("2025-06-15")).toBe("Utilities (2025-06-15)");
});
