import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const schema = z.object({
  studentKey: z.string().min(1).max(500),
  received: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "certificates:batches:receipts", 240, 60_000);
    const { batchId } = await params;
    const body = await parseJson<z.infer<typeof schema>>(request, schema);

    const batch = await prisma.certificateStickerBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError("Batch not found", { status: 404, code: "invalidRequest" });

    const receipts = batch.receiptsData && typeof batch.receiptsData === "object" && !Array.isArray(batch.receiptsData)
      ? { ...(batch.receiptsData as Record<string, any>) }
      : {};

    receipts[body.studentKey] = {
      received: body.received,
      receivedAt: body.received ? new Date().toISOString() : null,
    };

    const updated = await prisma.certificateStickerBatch.update({
      where: { id: batchId },
      data: { receiptsData: receipts as any },
      select: { id: true, receiptsData: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (error) {
    return jsonError(error);
  }
}
