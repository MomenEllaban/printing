import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  generateFloorExamStickersPdf,
  type FloorSubjectPlacardData,
} from "../floor-exam-stickers-pdf";

describe("generateFloorExamStickersPdf", () => {
  it("generates an official A4 Landscape floor subject bag placard with 1 page per subject", async () => {
    const subjects: FloorSubjectPlacardData[] = [
      {
        subjectCode: "LIT",
        subjectName: "Literacy 1",
        examType: "EST 1",
        totalRooms: 3,
        totalCandidates: 75,
        rooms: [
          { roomName: "Room 101", candidateCount: 25 },
          { roomName: "Room 102", candidateCount: 25 },
          { roomName: "Room 103", candidateCount: 25 },
        ],
      },
      {
        subjectCode: "MATH",
        subjectName: "Mathematics 1",
        examType: "EST 1",
        totalRooms: 3,
        totalCandidates: 75,
        rooms: [
          { roomName: "Room 101", candidateCount: 25 },
          { roomName: "Room 102", candidateCount: 25 },
          { roomName: "Room 103", candidateCount: 25 },
        ],
      },
    ];

    const pdfBytes = await generateFloorExamStickersPdf({
      floorName: "3rd Floor",
      examName: "EST 1",
      governorate: "Qalyubia",
      center: "Al Alamiya Modern School",
      building: "Main Building",
      date: "December 2026",
      subjects,
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2); // 1 page for Literacy, 1 page for Math

    const page1 = doc.getPage(0);
    const { width, height } = page1.getSize();
    // A4 Landscape: 841.89 x 595.28 pt
    expect(width).toBeCloseTo(841.89, 1);
    expect(height).toBeCloseTo(595.28, 1);
  });

  it("handles single subject with many rooms gracefully", async () => {
    const rooms = Array.from({ length: 12 }, (_, i) => ({
      roomName: `AD${i + 1}A`,
      candidateCount: 25,
    }));

    const subjects: FloorSubjectPlacardData[] = [
      {
        subjectCode: "MATH1",
        subjectName: "Math 1",
        examType: "EST 2",
        totalRooms: rooms.length,
        totalCandidates: 300,
        rooms,
      },
    ];

    const pdfBytes = await generateFloorExamStickersPdf({
      floorName: "4th Floor",
      examName: "EST 2",
      governorate: "Cairo",
      center: "Integrated Thebes",
      building: "Main Campus",
      date: "December 2026",
      subjects,
    });

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
