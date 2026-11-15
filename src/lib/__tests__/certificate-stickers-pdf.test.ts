import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateCertificateStickersPdf } from "../stickers/certificate-stickers-pdf";
import { generateBoxManifestPdf } from "../stickers/box-manifest-pdf";

describe("generateCertificateStickersPdf", () => {
  it("generates stickers PDF with English and Arabic names", async () => {
    const pdfBytes = await generateCertificateStickersPdf({
      batchName: "Data for MoE - Nov Batch 2 11.11.2026",
      students: [
        {
          serialNumber: "1",
          studentName: "Abdelaziz Sameh Mahmoud Aly Aboueyana",
          studentNameAr: "عبد العزيز سامح محمود علي ابو عيانة",
          totalReports: 2,
          reportsList: "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II",
        },
        {
          serialNumber: "2",
          studentName: "Abdelrahman Alaa Ahmed Ragheb Ibrahim",
          studentNameAr: "عبد الرحمن علاء احمد راغب ابراهيم",
          totalReports: 1,
          reportsList: "January 2026 - EST I",
        },
      ],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});

describe("generateBoxManifestPdf (Batch Splitting & Box Packing Report)", () => {
  it("generates Box Manifest PDF for a 100-student box in landscape mode with pagination", async () => {
    const mockStudents = Array.from({ length: 100 }, (_, i) => ({
      serialNumber: String(i + 1),
      studentName: `Candidate Name English ${i + 1}`,
      studentNameAr: `اسم الطالب العربي ${i + 1}`,
      totalReports: (i % 3) + 1,
      reportsList: "October 2025 - EST I; January 2026 - EST II",
    }));

    const pdfBytes = await generateBoxManifestPdf({
      batchName: "Batch 1 Online 07.11.2026",
      boxNumber: 1,
      fromRow: 1,
      toRow: 100,
      totalStudentsInBatch: 250,
      students: mockStudents,
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    // 100 rows divided by ~20 rows per page = 5 pages
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(4);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // Landscape A4: 841.89 x 595.28
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("generates Box Manifest PDF in portrait mode for custom range 101 to 200", async () => {
    const mockStudents = Array.from({ length: 50 }, (_, i) => ({
      serialNumber: String(100 + i + 1),
      studentName: `Candidate Name English ${100 + i + 1}`,
      studentNameAr: `اسم الطالب العربي ${100 + i + 1}`,
      totalReports: 2,
      reportsList: "January 2026 - EST II",
    }));

    const pdfBytes = await generateBoxManifestPdf({
      batchName: "Batch 2 Online",
      boxNumber: 2,
      fromRow: 101,
      toRow: 150,
      totalStudentsInBatch: 200,
      students: mockStudents,
      orientation: "portrait",
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // Portrait A4: 595.28 x 841.89
    expect(size.width).toBeCloseTo(595.28, 0);
    expect(size.height).toBeCloseTo(841.89, 0);
  });
});

