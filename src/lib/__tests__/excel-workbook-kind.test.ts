import { describe, expect, it } from "vitest";
import type { SheetData } from "../stickers/building-excel";
import { detectExcelWorkbookKind } from "../excel-workbook-kind";

function sheet(name: string, rows: (string | number | null)[][]): SheetData {
  return { name, rows };
}

const registerRows: (string | number | null)[][] = [
  ["Center :", "AAST Sheraton Management 4th Floor", "", "", "", "Date: 09 - 10 - 2026", "", "EST Type : 1"],
  [],
  ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time", "Departure Signature", "Time"],
  [1, "Senior Name", "Senior", "01000000000", "IP", "4th Floor", "", ":", "", ":"],
];

const registerWithoutDeparture: (string | number | null)[][] = [
  ["Center :", "AAST Sheraton Management Ground", "", "", "", "Date: 09 - 10 - 2026"],
  [],
  ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time"],
  [1, "Proctor 1", "Proctor", "01000000000", "EP", "Room 01", "", ":"],
];

const certificateRows: (string | number | null)[][] = [
  ["SN", "Student Name", "National ID", "School Name", "Total Reports", "Report List"],
  [1, "Abdelaziz Sameh", "29801011234567", "Thebes College", 2, "October 2025 - EST I"],
];

describe("detectExcelWorkbookKind", () => {
  it("keeps Building Register workbooks in register mode even without Departure Signature", () => {
    expect(
      detectExcelWorkbookKind([sheet("Ground", registerWithoutDeparture)]),
    ).toBe("register");
  });

  it("keeps classic 10-column Building Register in register mode", () => {
    expect(detectExcelWorkbookKind([sheet("4th Floor", registerRows)])).toBe("register");
  });

  it("treats filename Building Register as register", () => {
    expect(detectExcelWorkbookKind([sheet("Sheet1", [[]])], "Building Register (Excel).xlsx")).toBe(
      "register",
    );
  });

  it("does not force register columns onto certificate sheets", () => {
    expect(
      detectExcelWorkbookKind([sheet("Batch", certificateRows)], "certificates-october.xlsx"),
    ).toBe("generic");
  });

  it("still uses register UI when one floor tab is blank", () => {
    expect(
      detectExcelWorkbookKind([
        sheet("4th Floor", registerRows),
        sheet("Notes", [[]]),
      ]),
    ).toBe("register");
  });
});
