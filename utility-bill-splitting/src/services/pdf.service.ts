import { PDFDocument } from "pdf-lib";
import { logger } from "../lib/logger";

/**
 * Service for PDF content handling and extraction
 */
export class PdfService {
  /**
   * Extract the first page of a PDF and encode as base64
   * @param pdfBuffer - Buffer containing PDF file contents
   * @returns Base64-encoded PDF of the first page
   * @throws Error if PDF is invalid
   */
  async extractFirstPage(pdfBuffer: ArrayBuffer): Promise<string> {
    logger.info("Processing PDF...");

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const pageCount = pdfDoc.getPageCount();
    logger.info(`PDF has ${pageCount} pages, extracting page 1...`);

    // Create new PDF with only first page
    const newPdfDoc = await PDFDocument.create();
    const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
    newPdfDoc.addPage(firstPage);

    // Save and encode to base64
    const pdfBytes = await newPdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return base64;
  }
}
