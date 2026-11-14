import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import type { CertificateStudentData } from "./stickers/certificate-stickers-pdf";

export type StudentWithReceipt = CertificateStudentData & {
  received?: boolean;
  receivedAt?: string | null;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-#:()]+/g, "");
}

/**
 * Builds an Arabic name lookup map from all secondary/checklist sheets in the workbook.
 * Matches by:
 * 1. National ID / ID Number
 * 2. Email Address
 * 3. English Name (normalized lowercase)
 */
export function buildCrossSheetArabicMap(workbook: XLSX.WorkBook): {
  byId: Map<string, string>;
  byEmail: Map<string, string>;
  byName: Map<string, string>;
} {
  const byId = new Map<string, string>();
  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rawRows) || rawRows.length < 2) continue;

    // Find header row in first 6 rows
    let headerIdx = -1;
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r] || [];
      const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
      if (
        (joined.includes("name") || joined.includes("student") || joined.includes("اسم")) &&
        (joined.includes("ar") || joined.includes("arabic") || joined.includes("عربي") || joined.includes("report") || joined.includes("id"))
      ) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx < 0) continue;

    const headers = (rawRows[headerIdx] || []).map((h) => normalizeHeader(String(h || "")));
    let arIdx = -1;
    let enIdx = -1;
    let idIdx = -1;
    let emailIdx = -1;

    headers.forEach((h, col) => {
      if (
        h.includes("namear") ||
        h.includes("arabic") ||
        h.includes("عربي") ||
        h.includes("بالعربي") ||
        h.includes("الاسمبالعربي") ||
        h.includes("اسمالطالببالعربي")
      ) {
        arIdx = col;
      } else if (
        h.includes("nameen") ||
        h.includes("english") ||
        h.includes("انجليزي") ||
        h.includes("إنجليزي") ||
        h.includes("بالانجليزي") ||
        h.includes("بالإنجليزي")
      ) {
        enIdx = col;
      } else if (h === "name" || h === "student" || h.includes("studentname") || h === "اسم" || h === "الاسم") {
        if (enIdx < 0) enIdx = col;
      }

      if (h.includes("id") || h.includes("national") || h.includes("nid") || h.includes("رقمقومي") || h.includes("بطاقة")) {
        if (idIdx < 0) idIdx = col;
      }
      if (h.includes("email") || h.includes("mail") || h.includes("ايميل") || h.includes("بريد")) {
        if (emailIdx < 0) emailIdx = col;
      }
    });

    if (arIdx < 0) continue; // No Arabic name column in this sheet

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawAr = row[arIdx];
      if (!rawAr || typeof rawAr !== "string" && typeof rawAr !== "number") continue;
      const arName = String(rawAr).trim();
      if (!arName || !/[\u0600-\u06FF]/.test(arName)) continue; // Must contain Arabic characters

      if (idIdx >= 0 && row[idIdx]) {
        const id = String(row[idIdx]).trim();
        if (id) byId.set(id, arName);
      }
      if (emailIdx >= 0 && row[emailIdx]) {
        const email = String(row[emailIdx]).trim().toLowerCase();
        if (email) byEmail.set(email, arName);
      }
      if (enIdx >= 0 && row[enIdx]) {
        const en = String(row[enIdx]).trim().toLowerCase();
        if (en) byName.set(en, arName);
      }
    }
  }

  return { byId, byEmail, byName };
}

/**
 * Parses an entire Excel workbook into an array of student certificate records.
 * Cross-references all sheets so Arabic names are preserved even if located on separate tabs.
 */
export function parseCertificateWorkbook(
  workbook: XLSX.WorkBook,
  defaultBatchName: string,
): StudentWithReceipt[] {
  if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
    return [];
  }

  // 1. Build cross-sheet Arabic name lookup maps from all checklist/details sheets
  const { byId: arabicById, byEmail: arabicByEmail, byName: arabicByName } = buildCrossSheetArabicMap(workbook);

  // 2. Determine primary student sheet
  const sheetNames = workbook.SheetNames;
  let primarySheetName = sheetNames[0];

  if (sheetNames.includes("Reports per Student")) {
    primarySheetName = "Reports per Student";
  } else if (sheetNames.includes("06-Reports per Student-Aramex")) {
    primarySheetName = "06-Reports per Student-Aramex";
  } else {
    // Pick the sheet that contains student/report/name with the most rows
    let maxRows = 0;
    for (const name of sheetNames) {
      if (name.toLowerCase().includes("summary")) continue;
      const s = workbook.Sheets[name];
      if (!s) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(s, { header: 1 });
      if (rows.length > maxRows) {
        maxRows = rows.length;
        primarySheetName = name;
      }
    }
  }

  const mainSheet = workbook.Sheets[primarySheetName];
  if (!mainSheet) return [];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  // Find header row in first 6 rows
  let headerIdx = 0;
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
    if (joined.includes("name") || joined.includes("student") || joined.includes("report") || joined.includes("طالب")) {
      headerIdx = r;
      break;
    }
  }

  const headers = (rawRows[headerIdx] || []).map((h) => normalizeHeader(String(h || "")));
  const results: StudentWithReceipt[] = [];

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    let serial = "";
    let nameAr = "";
    let nameEn = "";
    let nationalId = "";
    let email = "";
    let totalReports: number | string = 1;
    let reportList = "";
    let school = "";
    let gov = "";
    let reqId = "";
    let batchName = defaultBatchName;

    row.forEach((val: any, colIdx: number) => {
      if (val === undefined || val === null || String(val).trim() === "") return;
      const v = String(val).trim();
      const h = headers[colIdx] || "";

      if (h === "sn" || h === "serial" || h === "no" || (colIdx === 0 && !isNaN(Number(v)))) {
        if (!serial) serial = v;
      }

      if (
        h.includes("namear") ||
        h.includes("arabic") ||
        h.includes("عربي") ||
        h.includes("بالعربي") ||
        h.includes("الاسمبالعربي") ||
        h.includes("اسمالطالببالعربي")
      ) {
        nameAr = v;
      } else if (
        h.includes("nameen") ||
        h.includes("english") ||
        h.includes("انجليزي") ||
        h.includes("إنجليزي") ||
        h.includes("بالانجليزي") ||
        h.includes("بالإنجليزي")
      ) {
        nameEn = v;
      } else if (h.includes("name") || h.includes("student") || h.includes("طالب") || h.includes("اسم")) {
        if (/[\u0600-\u06FF]/.test(v)) {
          if (!nameAr) nameAr = v;
        } else {
          if (!nameEn) nameEn = v;
        }
      }

      if (h.includes("national") || h.includes("nid") || h.includes("idnumber") || (h === "id" && !reqId)) {
        nationalId = v;
      }
      if (h.includes("email") || h.includes("mail")) {
        email = v;
      }
      if (h.includes("totalreport") || h.includes("nbofreport")) {
        totalReports = v;
      }
      if (h.includes("reportlist") || h.includes("reports") || h.includes("report")) {
        if (!h.includes("total") && !h.includes("nb")) {
          reportList = v;
        }
      }
      if (h.includes("school") || h.includes("مدرسة") || h.includes("مدرسه")) {
        school = v;
      }
      if (h.includes("governorate") || h.includes("city") || h.includes("محافظة") || h.includes("مدينة")) {
        gov = v;
      }
      if (h.includes("requestid") || h.includes("newrequestid")) {
        reqId = v;
      }
      if (h.includes("batch")) {
        batchName = v;
      }
    });

    // Cross-sheet fallback for Arabic name if not on the main sheet
    if (!nameAr) {
      const cleanId = nationalId.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanEn = nameEn.trim().toLowerCase();

      nameAr =
        (cleanId && arabicById.get(cleanId)) ||
        (cleanEmail && arabicByEmail.get(cleanEmail)) ||
        (cleanEn && arabicByName.get(cleanEn)) ||
        "";
    }

    const studentName = nameEn || nameAr;
    if (!studentName) continue;

    const finalSerial = serial || String(results.length + 1);
    results.push({
      id: `row-${r}`,
      serialNumber: finalSerial,
      studentName,
      studentNameAr: nameAr || undefined,
      seatNumber: "",
      nationalId,
      schoolName: school,
      governorate: gov,
      totalReports: totalReports || 1,
      reportsList: reportList || "Official EST Score Report",
      certificateCode: reqId || `EST-REP-${String(finalSerial).padStart(4, "0")}`,
      batchName,
      received: false,
      receivedAt: null,
    });
  }

  return results;
}

/**
 * Attempts to parse an Excel file on disk if available.
 */
export function parseLocalCertificateFile(filePath: string): StudentWithReceipt[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const buffer = fs.readFileSync(filePath);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const baseName = path.basename(filePath, path.extname(filePath));
    return parseCertificateWorkbook(wb, baseName);
  } catch (err) {
    console.warn("[certificates-parser] Error reading local file", filePath, err);
    return [];
  }
}

