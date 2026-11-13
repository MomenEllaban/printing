import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
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
    const { batchId } = await params;

    const batch = await prisma.certificateStickerBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError("Batch not found", { status: 404, code: "invalidRequest" });

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
