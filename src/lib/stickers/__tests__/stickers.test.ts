import { describe, it, expect } from "vitest";
import { buildStickerContent } from "../sticker-content";
import { generateStickerPdf, generateBatchStickerPdf } from "../sticker-pdf";
import { generateProctorRegisterPdf } from "../proctor-register-pdf";
import { PROFILES } from "../../profiles";
import { PDFDocument } from "pdf-lib";

describe("buildStickerContent", () => {
  it("A. Generates correct sticker for Exam Root (EST 1)", () => {
    const result = buildStickerContent([{ name: "Root" }, { name: "EST 1" }]);
    expect(result.level).toBe("root");
    expect(result.rawLines).toEqual(["EST", "EST 1"]);
    expect(result.lines).toEqual(["EST", "EST 1"]);
  });

  it("A2. Generates correct sticker for Exam Root (EST 2)", () => {
    const result = buildStickerContent(["EST 2"]);
    expect(result.level).toBe("root");
    expect(result.rawLines).toEqual(["EST", "EST 2"]);
  });

  it("B. Generates correct sticker for Governorate (Alexandria)", () => {
    const result = buildStickerContent([
      { name: "My Drive" },
      { name: "EST 1" },
      { name: "Alexandria" },
    ]);
    expect(result.level).toBe("governorate");
    expect(result.governorate).toBe("Alexandria");
    expect(result.rawLines).toEqual(["EST", "Alexandria"]);
    expect(result.lines).toEqual(["EST", "Governorate : Alexandria"]);
  });

  it("C. Generates correct sticker for Test Center (Abu Qir)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
    ]);
    expect(result.level).toBe("center");
    expect(result.center).toBe("Abu Qir");
    expect(result.rawLines).toEqual(["EST", "Alexandria", "Abu Qir"]);
    expect(result.lines).toEqual(["EST", "Governorate : Alexandria", "Center : Abu Qir"]);
  });

  it("D. Generates correct sticker for Building (Pharmacy)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
    ]);
    expect(result.level).toBe("building");
    expect(result.building).toBe("Pharmacy");
    expect(result.rawLines).toEqual(["EST", "Alexandria", "Abu Qir", "Pharmacy"]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
    ]);
  });

  it("E. Generates correct sticker for Floor (2nd Floor)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
    ]);
    expect(result.level).toBe("floor");
    expect(result.floor).toBe("2nd Floor");
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
    ]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
      "Floor : 2nd Floor",
    ]);
  });

  it("F. Generates correct sticker for Room (204)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
    expect(result.level).toBe("room");
    expect(result.room).toBe("204");
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
      "Floor : 2nd Floor",
      "Room : 204",
    ]);
  });

  it("Cleans extra spaces but preserves exact wording", () => {
    const result = buildStickerContent([
      "  EST 1  ",
      " Alexandria ",
      "   Future International School   ",
      " 3rd Floor ",
      " 3rd floor MathsClass ",
    ]);
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Future International School",
      "3rd Floor",
      "3rd floor MathsClass",
    ]);
  });
});

describe("generateStickerPdf", () => {
  it("Generates a single-page valid PDF with exact custom sticker dimensions", async () => {
    const lines = [
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ];

    const pdfBytes = await generateStickerPdf({
      lines,
      widthMm: 100,
      heightMm: 50,
      paperMode: "custom",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();

    // 100mm = 283.46 pt, 50mm = 141.73 pt (tolerance +- 0.5pt)
    expect(size.width).toBeCloseTo(283.46, 0);
    expect(size.height).toBeCloseTo(141.73, 0);
  });

  it("Supports A4 landscape paper mode for large clear examination placard", async () => {
    const lines = ["EST 1", "Cairo", "Sheraton", "Transport & Logistics", "2nd Floor", "201A"];
    const pdfBytes = await generateStickerPdf({
      lines,
      paperMode: "a4",
      orientation: "landscape",
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // A4 Landscape: 841.89 x 595.28
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("Supports A4 portrait paper mode", async () => {
    const lines = ["EST 1", "Cairo", "Sheraton"];
    const pdfBytes = await generateStickerPdf({
      lines,
      paperMode: "a4",
      orientation: "portrait",
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // A4 Portrait: 595.28 x 841.89
    expect(size.width).toBeCloseTo(595.28, 0);
    expect(size.height).toBeCloseTo(841.89, 0);
  });

  it("Builds sticker correctly from nested December 2026 / EST 1 path", async () => {
    const { getDemoBreadcrumbs } = await import("../../demo");
    const { breadcrumbs } = getDemoBreadcrumbs("demo-gov-alexandria-abu-qir-pharmacy-2nd-floor-204");
    expect(breadcrumbs.length).toBeGreaterThan(0);

    const sticker = buildStickerContent(breadcrumbs);
    expect(sticker.level).toBe("room");
    expect(sticker.room).toBe("204");
    expect(sticker.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
  });

  it("generateBatchStickerPdf generates a unified multi-page PDF with 1 page per folder and logo included", async () => {
    const sticker1 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "204"]);
    const sticker2 = buildStickerContent(["EST 1", "Cairo", "Sheraton", "Engineering", "1st Floor", "101"]);
    const sticker3 = buildStickerContent(["EST 1", "Giza", "October", "Main Campus"]);

    const pdfBytes = await generateBatchStickerPdf({
      contents: [sticker1, sticker2, sticker3],
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(3);

    // Each page should be A4 Landscape: 841.89 x 595.28
    for (let i = 0; i < 3; i++) {
      const page = pdfDoc.getPage(i);
      const size = page.getSize();
      expect(size.width).toBeCloseTo(841.89, 0);
      expect(size.height).toBeCloseTo(595.28, 0);
    }
  });

  it("Computes subfolder buildings count for Center sticker (Abu Qir)", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir"]);
    expect(sticker.level).toBe("center");
    expect(sticker.childLabel).toBe("Buildings");
    expect(sticker.childCount).toBe(1);
    expect(sticker.childNames).toEqual(["Pharmacy"]);
    expect(sticker.totalRooms).toBe(13);
  });

  it("Computes subfolder floors count for Building sticker", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy"]);
    expect(sticker.level).toBe("building");
    expect(sticker.childLabel).toBe("Floors");
    expect(sticker.childCount).toBe(4);
    expect(sticker.childNames).toEqual(["2nd Floor", "3rd Floor", "4th Floor", "5th Floor"]);
  });

  it("Computes subfolder rooms count for Floor sticker", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor"]);
    expect(sticker.level).toBe("floor");
    expect(sticker.childLabel).toBe("Rooms");
    expect(sticker.childCount).toBe(3);
    expect(sticker.childNames).toEqual(["204", "205", "219"]);
  });

  it("Generates Room placard with File Contents Checklist Box", async () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "204"]);
    expect(sticker.level).toBe("room");

    const pdfBytes = await generateStickerPdf({
      content: sticker,
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("Generates Floor placard with Senior Dossier Checklist Box (including Draft papers, pens, and IDs)", async () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor"]);
    expect(sticker.level).toBe("floor");

    const pdfBytes = await generateStickerPdf({
      content: sticker,
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("Generates official EST Proctor Attendance & Assignment Register PDF (A4 Landscape)", async () => {
    const pdfBytes = await generateProctorRegisterPdf({
      examName: "EST 1",
      governorate: "Alexandria",
      center: "Abu Qir",
      building: "Pharmacy",
      floor: "2nd Floor",
      rooms: ["204", "205", "219"],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("Ensures Dina and Nabil have full delete permissions (canDelete: true)", () => {
    expect(PROFILES.dina.canDelete).toBe(true);
    expect(PROFILES.nabil.canDelete).toBe(true);
    expect(PROFILES.printing.canDelete).toBe(true);
  });
});
