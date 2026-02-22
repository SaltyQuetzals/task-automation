import { test, expect } from "bun:test";
import { PdfService } from "./pdf.service";
import { PDFDocument } from "pdf-lib";

// Helper to create a test PDF buffer
async function createTestPdfBuffer(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([200, 200]);
  const pdfBytes = await pdfDoc.save();
  const buffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(buffer).set(pdfBytes);
  return buffer;
}

test("PdfService.extractFirstPage - successfully extracts first page as base64", async () => {
  const service = new PdfService();
  const pdfBuffer = await createTestPdfBuffer();

  const base64 = await service.extractFirstPage(pdfBuffer);

  expect(base64).toBeDefined();
  expect(typeof base64).toBe("string");
  expect(base64.length).toBeGreaterThan(0);
  // Base64 should only contain valid characters
  expect(/^[A-Za-z0-9+/=]+$/.test(base64)).toBe(true);
});

test("PdfService.extractFirstPage - throws error for invalid PDF", async () => {
  const service = new PdfService();
  const invalidBuffer = new ArrayBuffer(10); // Too small to be a valid PDF

  try {
    await service.extractFirstPage(invalidBuffer);
    expect.unreachable("Should have thrown an error");
  } catch (error) {
    expect(error instanceof Error).toBe(true);
  }
});

test("PdfService.extractFirstPage - handles multi-page PDF", async () => {
  const service = new PdfService();

  // Create a 3-page PDF
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([200, 200]);
  pdfDoc.addPage([200, 200]);
  pdfDoc.addPage([200, 200]);
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);

  const base64 = await service.extractFirstPage(pdfBuffer);

  expect(base64).toBeDefined();
  expect(typeof base64).toBe("string");
  expect(base64.length).toBeGreaterThan(0);
});
