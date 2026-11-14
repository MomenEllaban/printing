import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { requireSession, enforceRateLimit, jsonError, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { ensureCertificateBatchTable } from "@/lib/certificates-drive";
import { buildCrossSheetArabicMap } from "@/lib/certificates-parser";
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

    // Auto-enrich Arabic student names if missing from earlier uploads
    const students = Array.isArray(batch.studentsData) ? (batch.studentsData as any[]) : [];
    const missingArabic = students.some((s) => !s.studentNameAr);

    if (missingArabic && students.length > 0) {
      try {
        let arabicMap: { byId: Map<string, string>; byEmail: Map<string, string>; byName: Map<string, string> } | null = null;

        // 1. Try local files in process.cwd()
        const candidateFiles = [
          batch.fileName ? path.join(process.cwd(), batch.fileName) : null,
          path.join(process.cwd(), `${batch.name}.xlsx`),
          path.join(process.cwd(), "Data for MoE - Nov Batch 2 11.11.2026.xlsx"),
          path.join(process.cwd(), "Aramex-Official_Report-Batch 1 Online - 07.11.2026.xlsx"),
        ].filter(Boolean) as string[];

        for (const fp of candidateFiles) {
          if (fs.existsSync(fp)) {
            try {
              const buf = fs.readFileSync(fp);
              const wb = XLSX.read(buf, { type: "buffer" });
              const m = buildCrossSheetArabicMap(wb);
              if (m.byId.size > 0 || m.byEmail.size > 0 || m.byName.size > 0) {
                arabicMap = m;
                break;
              }
            } catch {}
          }
        }

        // 2. If not found locally, try Google Drive if driveFileId exists
        if (!arabicMap && batch.driveFileId) {
          try {
            const { drive } = await getDriveContextWithRoot();
            const driveRes = await drive.files.get(
              { fileId: batch.driveFileId, alt: "media", supportsAllDrives: true },
              { responseType: "arraybuffer" },
            );
            if (driveRes.data) {
              const wb = XLSX.read(Buffer.from(driveRes.data as ArrayBuffer), { type: "buffer" });
              arabicMap = buildCrossSheetArabicMap(wb);
            }
          } catch {}
        }

        if (arabicMap && (arabicMap.byId.size > 0 || arabicMap.byEmail.size > 0 || arabicMap.byName.size > 0)) {
          let updated = false;
          for (const s of students) {
            if (!s.studentNameAr) {
              const cleanId = s.nationalId ? String(s.nationalId).trim() : "";
              const cleanEmail = s.email ? String(s.email).trim().toLowerCase() : "";
              const cleanEn = s.studentName ? String(s.studentName).trim().toLowerCase() : "";

              const ar =
                (cleanId && arabicMap.byId.get(cleanId)) ||
                (cleanEmail && arabicMap.byEmail.get(cleanEmail)) ||
                (cleanEn && arabicMap.byName.get(cleanEn)) ||
                "";

              if (ar) {
                s.studentNameAr = ar;
                updated = true;
              }
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
              console.warn("[certificates:batches:get] failed to persist enriched arabic names", saveErr);
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
