import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parseCertificateWorkbook } from "../certificates-parser";

function parseLocalCertificateFile(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const baseName = path.basename(filePath, path.extname(filePath));
  return parseCertificateWorkbook(wb, baseName);
}

describe("certificates-parser", () => {
  it("extracts Arabic names from MoE multi-sheet Excel file", () => {
    const moePath = path.join(process.cwd(), "Data for MoE - Nov Batch 2 11.11.2026.xlsx");
    const students = parseLocalCertificateFile(moePath);
    expect(students.length).toBeGreaterThan(0);
    const withAr = students.filter((s) => s.studentNameAr && s.studentNameAr.trim().length > 0);
    // 100% of students have Arabic names in Checklist-ESTI / Checklist-ESTII
    expect(withAr.length).toBe(students.length);
  });

  it("extracts students from Aramex Excel file", () => {
    const aramexPath = path.join(process.cwd(), "Aramex-Official_Report-Batch 1 Online - 07.11.2026.xlsx");
    const students = parseLocalCertificateFile(aramexPath);
    expect(students.length).toBeGreaterThan(0);
  });
});
