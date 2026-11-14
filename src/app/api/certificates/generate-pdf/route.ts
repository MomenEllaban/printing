import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { generateCertificateStickersPdf, type CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "certificate:pdf", 60, 60_000);

    const body = await request.json().catch(() => ({}));
    const students: CertificateStudentData[] = Array.isArray(body.students) ? body.students : [];

    if (students.length === 0) {
      return NextResponse.json({ error: "No students provided" }, { status: 400 });
    }

    const sessionName = typeof body.sessionName === "string" ? body.sessionName : undefined;
    const examName = typeof body.examName === "string" ? body.examName : undefined;
    const batchName = typeof body.batchName === "string" ? body.batchName : undefined;

    const orientation = body.orientation === "landscape" ? "landscape" : "portrait";

    const pdfBytes = await generateCertificateStickersPdf({
      students,
      sessionName,
      examName,
      batchName,
      orientation,
    });

    const bodyBuffer = Buffer.from(pdfBytes);

    return new NextResponse(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="certificate-stickers.pdf"',
        "Content-Length": bodyBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

