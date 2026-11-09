import { describe, it, expect } from "vitest";
import { buildStickerContent } from "../sticker-content";
import { generateStickerPdf } from "../sticker-pdf";
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
});
