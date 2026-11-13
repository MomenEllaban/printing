import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSession, jsonError } from "@/lib/api-utils";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

export const dynamic = "force-dynamic";

function parseWorkbook(filePath: string, batchName: string): CertificateStudentData[] {
  if (!fs.existsSync(filePath)) return [];

  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames.includes("Reports per Student")
    ? "Reports per Student"
    : wb.SheetNames.includes("06-Reports per Student-Aramex")
    ? "06-Reports per Student-Aramex"
    : wb.SheetNames[0];

  const sheet = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  let headerIdx = 0;
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const joined = row.map((c) => String(c).toLowerCase()).join(" ");
    if (joined.includes("name") || joined.includes("student") || joined.includes("report")) {
      headerIdx = r;
      break;
    }
  }

  const headers = (rawRows[headerIdx] || []).map((h) => String(h || "").trim());
  const normHeaders = headers.map((h) => h.toLowerCase().replace(/[\s_\-#:()]+/g, ""));

  const students: CertificateStudentData[] = [];

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    let serial = "";
    let nameAr = "";
    let nameEn = "";
    let nationalId = "";
    let totalReports: number | string = 1;
    let reportList = "";
    let school = "";
    let gov = "";
    let reqId = "";

    row.forEach((val, colIdx) => {
      if (val === undefined || val === null || String(val).trim() === "") return;
      const v = String(val).trim();
      const h = normHeaders[colIdx] || "";

      if (h === "sn" || h === "serial" || h === "no" || (colIdx === 0 && !isNaN(Number(v)))) {
        if (!serial) serial = v;
      }
      if (h.includes("namear") || h.includes("اسم")) {
        nameAr = v;
      } else if (h.includes("nameen") || h.includes("name") || h.includes("student")) {
        if (!nameEn) nameEn = v;
      }
      if (h.includes("national") || h.includes("قومي")) nationalId = v;
      if (h.includes("totalreport") || h.includes("nbofreport") || h.includes("اجمالي")) totalReports = v;
      if (h.includes("reportlist") || h.includes("قائمة") || h.includes("reports")) reportList = v;
      if (h.includes("school") || h.includes("مدرسة")) school = v;
      if (h.includes("governorate") || h.includes("محافظة") || h.includes("city")) gov = v;
      if (h.includes("requestid") || h.includes("كود")) reqId = v;
    });

    const studentName = nameEn || nameAr;
    if (studentName) {
      students.push({
        id: `batch-${r}`,
        serialNumber: serial || String(students.length + 1),
        studentName,
        totalReports,
        reportsList: reportList || "Official EST Score Report",
        nationalId,
        schoolName: school,
        governorate: gov,
        certificateCode: reqId || (serial ? `EST-REP-${String(serial).padStart(4, "0")}` : `EST-CERT-${r}`),
        batchName,
      });
    }
  }

  return students;
}

export async function GET(request: Request) {
  try {
    await requireSession(request);

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    const batch1Path = path.join(process.cwd(), "Aramex-Official_Report-Batch 1 Online - 07.11.2026.xlsx");
    const batch2Path = path.join(process.cwd(), "Data for MoE - Nov Batch 2 11.11.2026.xlsx");

    if (batchId === "batch-1") {
      const students = parseWorkbook(batch1Path, "Aramex-Official_Report-Batch 1 Online - 07.11.2026");
      return NextResponse.json({
        batchId: "batch-1",
        batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
        count: students.length,
        students,
      });
    }

    if (batchId === "batch-2") {
      const students = parseWorkbook(batch2Path, "Data for MoE - Nov Batch 2 11.11.2026");
      return NextResponse.json({
        batchId: "batch-2",
        batchName: "Data for MoE - Nov Batch 2 11.11.2026",
        count: students.length,
        students,
      });
    }

    // Default metadata
    return NextResponse.json({
      batches: [
        {
          id: "batch-1",
          name: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
          shortName: "Batch 1: Aramex Online (07.11.2026)",
          available: fs.existsSync(batch1Path),
          courier: "Aramex Courier Dispatch",
        },
        {
          id: "batch-2",
          name: "Data for MoE - Nov Batch 2 11.11.2026",
          shortName: "Batch 2: MoE Delivery (11.11.2026)",
          available: fs.existsSync(batch2Path),
          courier: "Ministry of Education (MoE) Handover",
        },
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}

