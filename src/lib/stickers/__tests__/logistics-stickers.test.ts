import { describe, it, expect } from "vitest";
import {
  generateBuildingCartonStickerPdf,
  generateExamBagChecklistPdf,
  generateCleanSkinMasterPdf,
  generateCleanSkinSubjectStickersPdf,
  generateCompleteLogisticsBundlePdf,
} from "../logistics-stickers-pdf";

describe("Logistics Stickers PDF Generator", () => {
  const baseData = {
    governorate: "Cairo",
    center: "Al-Salam Center",
    building: "Building A",
    examName: "EST I",
    date: "2026-12-15",
    totalRooms: 12,
    totalStudents: 360,
    roomNames: ["Room 101", "Room 102", "Room 103", "Room 104"],
    boxNumber: 1,
    totalBoxes: 3,
    securitySeal: "SEAL-987654",
  };

  it("generates Building Carton Sticker PDF (A4 Landscape)", async () => {
    const pdfBytes = await generateBuildingCartonStickerPdf(baseData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Building Carton Sticker PDF with explicit floors and rooms directory", async () => {
    const pdfBytes = await generateBuildingCartonStickerPdf({
      ...baseData,
      building: "Pharmacy",
      floors: [
        {
          floor: "2nd Floor",
          rooms: [
            { room: "204", studentCount: 30 },
            { room: "205", studentCount: 25 },
            { room: "219", studentCount: 25 },
          ],
          totalStudents: 80,
        },
        {
          floor: "3rd Floor",
          rooms: [
            { room: "304", studentCount: 25 },
            { room: "305", studentCount: 25 },
          ],
          totalStudents: 50,
        },
      ],
    });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Exam Bag Checklist PDF (A4 Portrait)", async () => {
    const pdfBytes = await generateExamBagChecklistPdf(baseData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Clean Skin Master Envelope PDF (A4 Portrait)", async () => {
    const pdfBytes = await generateCleanSkinMasterPdf(baseData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Clean Skin Quarter-A4 Subject Stickers PDF (EST I)", async () => {
    const pdfBytes = await generateCleanSkinSubjectStickersPdf({
      ...baseData,
      examName: "EST I",
    });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Clean Skin Quarter-A4 Subject Stickers PDF (EST II)", async () => {
    const pdfBytes = await generateCleanSkinSubjectStickersPdf({
      ...baseData,
      examName: "EST II",
    });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("generates Complete Logistics Bundle PDF", async () => {
    const pdfBytes = await generateCompleteLogisticsBundlePdf(baseData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(5000);
  });
});

