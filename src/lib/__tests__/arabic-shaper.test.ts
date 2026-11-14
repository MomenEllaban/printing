import { describe, it, expect } from "vitest";
import { shapeArabicText, formatArabicForPdf } from "../stickers/arabic-shaper";

describe("arabic-shaper", () => {
  it("shapes simple connected letters", () => {
    // "عماد": ع (initial), م (medial), ا (final), د (isolated)
    const shaped = shapeArabicText("عماد");
    expect(shaped.charCodeAt(0)).toBe(0xfecb); // ع initial
    expect(shaped.charCodeAt(1)).toBe(0xfee4); // م medial
    expect(shaped.charCodeAt(2)).toBe(0xfe8e); // ا final
    expect(shaped.charCodeAt(3)).toBe(0xfea9); // د isolated
  });

  it("handles Lam-Alef ligatures", () => {
    // "لا": ligature isolated
    const shaped = shapeArabicText("لا");
    expect(shaped.charCodeAt(0)).toBe(0xfefb); // لا isolated
  });

  it("formats for PDF with properly shaped connected characters in natural reading order", () => {
    const res = formatArabicForPdf("عماد");
    expect(res.charCodeAt(0)).toBe(0xfecb); // ع initial
    expect(res.charCodeAt(1)).toBe(0xfee4); // م medial
    expect(res.charCodeAt(2)).toBe(0xfe8e); // ا final
    expect(res.charCodeAt(3)).toBe(0xfea9); // د isolated
  });
});

