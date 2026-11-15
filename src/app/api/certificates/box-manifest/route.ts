import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { generateBoxManifestPdf } from "@/lib/stickers/box-manifest-pdf";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "certificate:box-manifest", 60, 60_000);

    const body = await request.json().catch(() => ({}));
    const students: CertificateStudentData[] = Array.isArray(body.students) ? body.students : [];

    if (students.length === 0) {
      return NextResponse.json({ error: "No students provided for box manifest" }, { status: 400 });
    }

    const batchName = typeof body.batchName === "string" ? body.batchName : "Certificate Batch";
    const boxNumber = typeof body.boxNumber === "number" ? body.boxNumber : undefined;
    const boxLabel = typeof body.boxLabel === "string" ? body.boxLabel : undefined;
    const fromRow = typeof body.fromRow === "number" ? body.fromRow : 1;
    const toRow = typeof body.toRow === "number" ? body.toRow : students.length;
    const totalStudentsInBatch = typeof body.totalStudentsInBatch === "number" ? body.totalStudentsInBatch : students.length;
    const orientation = body.orientation === "portrait" ? "portrait" : "landscape";
    const isAramex = Boolean(body.isAramex);

    const pdfBytes = await generateBoxManifestPdf({
      students,
      batchName,
      boxNumber,
      boxLabel,
      fromRow,
      toRow,
      totalStudentsInBatch,
      orientation,
      isAramex,
    });

    const bodyBuffer = Buffer.from(pdfBytes);
    const safeBoxTag = boxNumber ? `Box_${boxNumber}` : `Rows_${fromRow}-${toRow}`;

    return new NextResponse(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="EST_Box_Manifest_${safeBoxTag}.pdf"`,
        "Content-Length": bodyBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

