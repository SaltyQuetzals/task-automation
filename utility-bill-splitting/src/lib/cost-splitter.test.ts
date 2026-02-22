import { test, expect } from "bun:test";
import { splitCosts } from "./cost-splitter";

test("splitCosts - splits evenly between two parties", () => {
  const categories = {
    Water: 100,
    Electric: 200,
  };

  const result = splitCosts(categories);

  expect(result.totalBill).toBe(300);
  expect(result.yourShare).toBe(150);
  expect(result.roommateShare).toBe(150);
  // Reimbursement is total - yourShare = what roommate owes
  expect(result.reimbursementAmount).toBe(150);
});

test("splitCosts - handles rounding correctly", () => {
  const categories = {
    Water: 100.01,
  };

  const result = splitCosts(categories);

  expect(result.totalBill).toBe(100.01);
  expect(result.yourShare).toBe(50.01);
  expect(result.roommateShare).toBe(50.005); // 100.01 / 2
  // Reimbursement is total - yourShare
  expect(result.reimbursementAmount).toBeCloseTo(50, 2);
});

test("splitCosts - maps categories correctly", () => {
  const categories = {
    Water: 100,
    Electric: 50,
    Wastewater: 25,
  };

  const result = splitCosts(categories);

  expect(result.items).toHaveLength(3);
  // Water should be matched
  const waterItem = result.items.find((item) => item.description === "Water");
  expect(waterItem?.categoryId).toBeDefined();
  // Wastewater will be matched (defined in CATEGORY_MAPPING)
  const wastewaterItem = result.items.find((item) => item.description === "Wastewater");
  expect(wastewaterItem?.categoryId).toBeDefined();
});

test("splitCosts - handles multiple items with various amounts", () => {
  const categories = {
    Water: 50.25,
    Electric: 120.75,
    "Drainage Service": 30,
    "Solid Waste Services": 45.50,
  };

  const result = splitCosts(categories);

  expect(result.totalBill).toBe(246.5);
  expect(result.yourShare).toBeCloseTo(123.25, 1);
  expect(result.roommateShare).toBe(123.25);
  // Reimbursement should equal roommate's share (with potential minor rounding)
  expect(result.reimbursementAmount).toBeCloseTo(123.25, 1);
});

test("splitCosts - handles single item", () => {
  const categories = {
    Water: 100,
  };

  const result = splitCosts(categories);

  expect(result.items).toHaveLength(1);
  expect(result.totalBill).toBe(100);
  expect(result.yourShare).toBe(50);
  expect(result.roommateShare).toBe(50);
});

test("splitCosts - handles zero amount items", () => {
  const categories = {
    Water: 100,
    "Clean Community Service": 0,
  };

  const result = splitCosts(categories);

  expect(result.totalBill).toBe(100);
  expect(result.yourShare).toBe(50);
});

test("splitCosts - maps defined category names to category IDs", () => {
  const categories = {
    Water: 100,
    Electric: 200,
    "Solid Waste Services": 50,
  };

  const result = splitCosts(categories);

  // All items should have matching category IDs
  const waterItem = result.items.find((item) => item.description === "Water");
  expect(waterItem?.categoryId).toBeDefined();

  const electricItem = result.items.find((item) => item.description === "Electric");
  expect(electricItem?.categoryId).toBeDefined();

  const wasteItem = result.items.find((item) => item.description === "Solid Waste Services");
  expect(wasteItem?.categoryId).toBeDefined();
});
