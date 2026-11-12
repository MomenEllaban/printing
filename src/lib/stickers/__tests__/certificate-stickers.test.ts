import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  generateCertificateStickersPdf,
  type CertificateStudentData,
} from "../certificate-stickers-pdf";

describe("Certificate Stickers PDF Generator", () => {
  const sampleStudents: CertificateStudentData[] = [
    {
      studentName: "Mohamed Ahmed Ali",
      seatNumber: "10245",
      nationalId: "30501011234567",
      schoolName: "Al Ryada University",
      governorate: "Menofia",
      examName: "EST I",
      sessionName: "December 2026",
      certificateCode: "CERT-2026-0001",
      subjects: "Literacy & Mathematics",
      status: "Passed",
    },
    {
      studentName: "Sarah Mahmoud Hassan",
      seatNumber: "10246",
      nationalId: "30502021234568",
      schoolName: "Cairo International School",
      governorate: "Cairo",
      examName: "EST I",
      sessionName: "December 2026",
      certificateCode: "CERT-2026-0002",
      subjects: "Literacy & Mathematics",
      status: "Passed",
    },
    {
      studentName: "Youssef Ibrahim Taha",
      seatNumber: "10247",
      nationalId: "30503031234569",
      schoolName: "STEM Alexandria",
      governorate: "Alexandria",
      examName: "EST II",
      sessionName: "December 2026",
      certificateCode: "CERT-2026-0003",
      subjects: "Biology & Chemistry",
      status: "Passed",
    },
    {
      studentName: "Nouran Khaled Mostafa",
      seatNumber: "10248",
      nationalId: "30504041234570",
      schoolName: "Giza Model School",
      governorate: "Giza",
      examName: "EST II",
      sessionName: "December 2026",
      certificateCode: "CERT-2026-0004",
      subjects: "Math 1 & Physics",
      status: "Passed",
    },
    {
      studentName: "Omar Abdelrahman Fathy",
      seatNumber: "10249",
      nationalId: "30505051234571",
      schoolName: "Al Ryada University",
      governorate: "Menofia",
      examName: "EST I",
      sessionName: "December 2026",
      certificateCode: "CERT-2026-0005",
      subjects: "Literacy & Mathematics",
      status: "Passed",
    },
  ];

  it("should generate a valid PDF with correct page count for 4 stickers per sheet (quarter A4)", async () => {
    // 5 students -> 2 pages (Page 1 has 4 stickers, Page 2 has 1 sticker)
    const pdfBytes = await generateCertificateStickersPdf({
      students: sampleStudents,
      sessionName: "December 2026",
      examName: "EST",
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

  it("should handle empty or fallback students gracefully", async () => {
    const pdfBytes = await generateCertificateStickersPdf({
      students: [],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
