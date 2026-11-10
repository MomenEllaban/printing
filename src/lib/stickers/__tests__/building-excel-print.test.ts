import { describe, it, expect } from "vitest";
import { generateEstPrintHtml, parseSheetDetails, type SheetData } from "../building-excel";

describe("generateEstPrintHtml pagination and layout", () => {
  it("chunks sheets with more than 15 rows into multiple A4 pages with 15 rows max per page", () => {
    // Construct a sheet with 26 proctor rows (like real EST register)
    const rows: (string | number | null)[][] = [
      ["Center :", "AAST Sheraton Management &Tech. 4th Floor", null, null, null, "Date: 09 - 10 - 2026", null, "EST Type : 1", null, null],
      [],
      ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time", "Departure Signature", "Time"],
    ];

    for (let i = 1; i <= 26; i++) {
      rows.push([
        i,
        `Proctor Name ${i}`,
        i === 1 ? "Senior" : "Proctor",
        `010${String(i).padStart(8, "0")}`,
        "EP",
        i <= 4 ? "4th Floor" : `Room ${Math.floor(i / 3)}`,
        "",
        ":",
        "",
        ":",
      ]);
    }

    rows.push([]);
    rows.push([null, "Head", null, null, null, null, null, null, null, null]);
    rows.push([null, "Mohamed Nabil", null, null, null, null, null, null, null, null]);

    const sheet: SheetData = {
      name: "Management 4th Floor",
      rows,
    };

    const html = generateEstPrintHtml([sheet], {
      buildingName: "Management & Tech.",
      title: "Test Register",
    });

    // Verify 2 pages were generated
    const pageMatches = html.match(/class="sheet-page/g);
    expect(pageMatches).toHaveLength(2);

    // Page 1 should contain Proctor Name 1 to 15
    expect(html).toContain("Proctor Name 1");
    expect(html).toContain("Proctor Name 15");

    // Page 2 should contain Proctor Name 16 to 26
    expect(html).toContain("Proctor Name 16");
    expect(html).toContain("Proctor Name 26");

    // Both pages should contain the official header
    expect(html).toContain("PROCTOR ATTENDANCE & ASSIGNMENT REGISTER");
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Page 2 of 2");

    // Last page should have sheet-page-last class to prevent trailing blank page
    expect(html).toContain("sheet-page-last");

    // Check typography & style rules
    expect(html).toContain("size: A4 landscape");
    expect(html).toContain("margin: 0mm !important");
    expect(html).toContain("padding: 8mm 7mm 8mm 7mm");

    // Check footer contains Head of Building and Page indicators
    expect(html).toContain("Head of Building:");
    expect(html).toContain("Page:</strong> 1 of 2");
  });

  it("handles small sheets with <= 15 rows on a single page", () => {
    const rows: (string | number | null)[][] = [
      ["Center :", "AAST Sheraton Management Ground", null, null, null, "Date: 09 - 10 - 2026", null, "EST Type : 1", null, null],
      [],
      ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time", "Departure Signature", "Time"],
    ];

    for (let i = 1; i <= 8; i++) {
      rows.push([i, `Proctor ${i}`, "Proctor", "01000000000", "EP", "Ground", "", ":", "", ":"]);
    }

    const sheet: SheetData = {
      name: "Management Ground",
      rows,
    };

    const html = generateEstPrintHtml([sheet]);
    const pageMatches = html.match(/class="sheet-page/g);
    expect(pageMatches).toHaveLength(1);
    expect(html).toContain("sheet-page-last");
    expect(html).not.toContain("Page 1 of");
  });
});
