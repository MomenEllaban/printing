import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { getPrintedRecordsMap, markFilesAsPrinted, unmarkFilesAsPrinted } from "@/lib/print-tracker";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const map = await getPrintedRecordsMap();
    const printedIds = Array.from(map.keys());
    return NextResponse.json({
      printedIds,
      count: printedIds.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const printStatusSchema = z.object({
  fileId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
  items: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
  action: z.enum(["mark", "unmark"]).default("mark").optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "print-status:update", 120, 60_000);
    const body = await parseJson<z.infer<typeof printStatusSchema>>(request, printStatusSchema);

    const itemsToProcess: { id: string; name?: string }[] = [];
    if (body.items && body.items.length > 0) {
      itemsToProcess.push(...body.items);
    }
    if (body.fileIds && body.fileIds.length > 0) {
      for (const id of body.fileIds) {
        if (!itemsToProcess.some((i) => i.id === id)) {
          itemsToProcess.push({ id });
        }
      }
    }
    if (body.fileId) {
      if (!itemsToProcess.some((i) => i.id === body.fileId)) {
        itemsToProcess.push({ id: body.fileId });
      }
    }

    if (itemsToProcess.length === 0) {
      const map = await getPrintedRecordsMap();
      return NextResponse.json({
        success: true,
        count: map.size,
        printedIds: Array.from(map.keys()),
      });
    }

    let map;
    if (body.action === "unmark") {
      map = await unmarkFilesAsPrinted(itemsToProcess.map((i) => i.id));
    } else {
      map = await markFilesAsPrinted(itemsToProcess);
    }

    return NextResponse.json({
      success: true,
      count: map.size,
      printedIds: Array.from(map.keys()),
    });
  } catch (error) {
    return jsonError(error);
  }
}

