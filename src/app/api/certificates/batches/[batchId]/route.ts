import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { requireSession, enforceRateLimit, jsonError, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { ensureCertificateBatchTable } from "@/lib/certificates-drive";
import { buildCrossSheetArabicMap, parseCertificateWorkbook } from "@/lib/certificates-parser";
import { getDriveContextWithRoot } from "@/lib/auth";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  shortName: z.string().trim().min(1).max(120).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "certificates:batches:get", 120, 60_000);
    try { await ensureCertificateBatchTable(); } catch {}
    const { batchId } = await params;

    const batch = await prisma.certificateStickerBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError("Batch not found", { status: 404, code: "invalidRequest" });

    // Auto-enrich Arabic student names and Shipping address fields if missing from earlier uploads
    const students = Array.isArray(batch.studentsData) ? (batch.studentsData as any[]) : [];
    const missingArabic = students.some((s) => !s.studentNameAr);
    const missingAddress = students.length > 0 && !students.some((s) => Boolean(s.street || s.floor || s.governorate || s.apartment));

    if ((missingArabic || missingAddress) && students.length > 0) {
      try {
        let wb: XLSX.WorkBook | null = null;

        // 1. Try Google Drive first
        if (batch.driveFileId) {
          try {
            const { drive } = await getDriveContextWithRoot();
            const driveRes = await drive.files.get(
              { fileId: batch.driveFileId, alt: "media", supportsAllDrives: true },
              { responseType: "arraybuffer" },
            );
            if (driveRes.data) {
              wb = XLSX.read(Buffer.from(driveRes.data as ArrayBuffer), { type: "buffer" });
            }
          } catch {}
        }

        // 2. Fallback to local files in development
        if (!wb && process.env.NODE_ENV !== "production") {
          const candidateNames = [
            batch.fileName,
            `${batch.name}.xlsx`,
            "Aramex-Official_Report-Batch 1 Online - 07.11.2026.xlsx",
            "Data for MoE - Nov Batch 2 11.11.2026.xlsx",
          ].filter(Boolean) as string[];

          for (const name of candidateNames) {
            try {
              const fp = path.join(/*turbopackIgnore: true*/ process.cwd(), name);
              if (fs.existsSync(/*turbopackIgnore: true*/ fp)) {
                const buf = fs.readFileSync(/*turbopackIgnore: true*/ fp);
                wb = XLSX.read(buf, { type: "buffer" });
                break;
              }
            } catch {}
          }
        }

        if (wb) {
          const freshParsed = parseCertificateWorkbook(wb, batch.name);
          if (freshParsed && freshParsed.length > 0) {
            // Build lookup maps by nationalId, email, name from the fresh parse
            const freshById = new Map<string, any>();
            const freshByEmail = new Map<string, any>();
            const freshByName = new Map<string, any>();

            for (const fp of freshParsed) {
              if (fp.nationalId) freshById.set(String(fp.nationalId).trim(), fp);
              if (fp.studentName) freshByName.set(String(fp.studentName).trim().toLowerCase(), fp);
            }

            let updated = false;
            for (let i = 0; i < students.length; i++) {
              const s = students[i];
              const cleanId = s.nationalId ? String(s.nationalId).trim() : "";
              const cleanEmail = s.email ? String(s.email).trim().toLowerCase() : "";
              const cleanEn = s.studentName ? String(s.studentName).trim().toLowerCase() : "";

              const match =
                (cleanId && freshById.get(cleanId)) ||
                (cleanEmail && freshByEmail.get(cleanEmail)) ||
                (cleanEn && freshByName.get(cleanEn)) ||
                freshParsed[i];

              if (match) {
                if (!s.studentNameAr && match.studentNameAr) {
                  s.studentNameAr = match.studentNameAr;
                  updated = true;
                }
                if (!s.governorate && match.governorate) { s.governorate = match.governorate; updated = true; }
                if (!s.city && match.city) { s.city = match.city; updated = true; }
                if (!s.area && match.area) { s.area = match.area; updated = true; }
                if (!s.street && match.street) { s.street = match.street; updated = true; }
                if (!s.apartment && match.apartment) { s.apartment = match.apartment; updated = true; }
                if (!s.floor && match.floor) { s.floor = match.floor; updated = true; }
                if (!s.landmark && match.landmark) { s.landmark = match.landmark; updated = true; }
                if (!s.recipient && match.recipient) { s.recipient = match.recipient; updated = true; }
                if (!s.phone && match.phone) { s.phone = match.phone; updated = true; }
                if (!s.phone2 && match.phone2) { s.phone2 = match.phone2; updated = true; }
                if (!s.totalReports && match.totalReports) { s.totalReports = match.totalReports; updated = true; }
              }
            }

            if (updated) {
              batch.studentsData = students;
              try {
                await prisma.certificateStickerBatch.update({
                  where: { id: batch.id },
                  data: { studentsData: students as any },
                });
              } catch (saveErr) {
                console.warn("[certificates:batches:get] failed to persist enriched data", saveErr);
              }
            }
          }
        }
      } catch (enrichErr) {
        console.warn("[certificates:batches:get] auto-enrichment failed", enrichErr);
      }
    }

    return NextResponse.json({ batch });
  } catch (error: any) {
    const msg = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "");
    const dbUnavailable =
      error?.name?.startsWith?.("PrismaClient") ||
      /^P\d{4}$/.test(code) ||
      msg.includes("does not exist") ||
      msg.includes("certificatestickerbatch");
    if (dbUnavailable) {
      return jsonError(new AppError("Certificate batches database is unavailable. Apply the latest database migration.", { status: 503, code: "databaseError", expose: true }));
    }
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "certificates:batches:update", 60, 60_000);
    try { await ensureCertificateBatchTable(); } catch {}
    const { batchId } = await params;
    const body = await parseJson<z.infer<typeof patchSchema>>(request, patchSchema);

    const batch = await prisma.certificateStickerBatch.update({
      where: { id: batchId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.shortName ? { shortName: body.shortName } : {}),
      },
    });

    return NextResponse.json({ batch });
  } catch (error: any) {
    const msg = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "");
    const dbUnavailable =
      error?.name?.startsWith?.("PrismaClient") ||
      /^P\d{4}$/.test(code) ||
      msg.includes("does not exist") ||
      msg.includes("certificatestickerbatch");
    if (dbUnavailable) {
      return jsonError(new AppError("Certificate batches database is unavailable. Apply the latest database migration.", { status: 503, code: "databaseError", expose: true }));
    }
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "certificates:batches:delete", 60, 60_000);
    try { await ensureCertificateBatchTable(); } catch {}
    const { batchId } = await params;

    await prisma.certificateStickerBatch.delete({ where: { id: batchId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const msg = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "");
    const dbUnavailable =
      error?.name?.startsWith?.("PrismaClient") ||
      /^P\d{4}$/.test(code) ||
      msg.includes("does not exist") ||
      msg.includes("certificatestickerbatch");
    if (dbUnavailable) {
      return jsonError(new AppError("Certificate batches database is unavailable. Apply the latest database migration.", { status: 503, code: "databaseError", expose: true }));
    }
    return jsonError(error);
  }
}
