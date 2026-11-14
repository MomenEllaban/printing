import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  generateCertificateStickersPdf,
  type CertificateStudentData,
} from "../certificate-stickers-pdf";

describe("Certificate & Score Report Stickers PDF Generator", () => {
  const sampleBatch1: CertificateStudentData[] = [
    {
      serialNumber: "128",
      studentName: "يارا رمضان يوسف ابو الخير",
      totalReports: 2,
      reportsList: "يناير 2026 - EST I، ومارس 2026 - EST II",
      certificateCode: "EST-REP-0128",
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    },
    {
      serialNumber: "129",
      studentName: "مريم أحمد محمد عبد الفتاح",
      totalReports: 1,
      reportsList: "أكتوبر 2026 - EST I",
      certificateCode: "EST-REP-0129",
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    },
    {
      serialNumber: "130",
      studentName: "أحمد خالد مصطفى الشناوي",
      totalReports: 3,
      reportsList: "مايو 2025 - EST I، يناير 2026 - EST II، مارس 2026 - EST II",
      certificateCode: "EST-REP-0130",
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    },
    {
      serialNumber: "131",
      studentName: "نور الدين إبراهيم حسن السعدني",
      totalReports: 2,
      reportsList: "أكتوبر 2025 - EST I، ديسمبر 2026 - EST I",
      certificateCode: "EST-REP-0131",
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    },
    {
      serialNumber: "132",
      studentName: "سلمى حازم محمود الديب",
      totalReports: 1,
      reportsList: "مارس 2026 - EST II",
      certificateCode: "EST-REP-0132",
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    },
  ];

  it("should generate a valid PDF with correct quarter-A4 page count (4 stickers per sheet)", async () => {
    // 5 students -> 2 pages (Page 1 has 4 stickers, Page 2 has 1 sticker)
    const pdfBytes = await generateCertificateStickersPdf({
      students: sampleBatch1,
      batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2);

    const page1 = doc.getPage(0);
    // A4 Landscape: 841.89 x 595.28 pt
    expect(Math.round(page1.getWidth())).toBe(842);
    expect(Math.round(page1.getHeight())).toBe(595);
  });

  it("should handle empty fallback and render default sample sticker", async () => {
    const pdfBytes = await generateCertificateStickersPdf({
      students: [],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("should cleanly format stickers with 4 enclosed score reports without overflow", async () => {
    const fourReportsStudent: CertificateStudentData = {
      serialNumber: "1",
      studentName: "Abdelaziz Sameh Mahmoud Aly Aboueyana",
      totalReports: 4,
      reportsList: "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II",
    };

    const pdfBytes = await generateCertificateStickersPdf({
      students: [fourReportsStudent],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("should render both English and Arabic student names when present", async () => {
    const dualNameStudent: CertificateStudentData = {
      serialNumber: "128",
      studentName: "Abanoub Emad Adly Abdou",
      studentNameAr: "ابانوب عماد عدلى عبده",
      totalReports: 2,
      reportsList: "March 2026 - EST I; July 2026 - EST II",
    };

    const pdfBytes = await generateCertificateStickersPdf({
      students: [dualNameStudent],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
