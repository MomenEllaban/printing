import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || "root";
    const key = `folder_order:${folderId}`;

    const [folderSetting, pinnedSetting] = await Promise.all([
      prisma.applicationSetting.findUnique({ where: { key } }),
      prisma.applicationSetting.findUnique({ where: { key: "global_pinned_items" } }),
    ]);

    let customOrder: string[] = [];
    let pinnedIds: string[] = [];

    if (folderSetting?.value && typeof folderSetting.value === "object") {
      const val = folderSetting.value as { customOrder?: string[]; pinnedIds?: string[] };
      if (Array.isArray(val.customOrder)) customOrder = val.customOrder;
      if (Array.isArray(val.pinnedIds)) pinnedIds = val.pinnedIds;
    }

    if (pinnedSetting?.value && typeof pinnedSetting.value === "object") {
      const val = pinnedSetting.value as { pinnedIds?: string[] };
      if (Array.isArray(val.pinnedIds)) {
        pinnedIds = Array.from(new Set([...pinnedIds, ...val.pinnedIds]));
      }
    }

    return NextResponse.json({
      folderId,
      customOrder,
      pinnedIds,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const customOrderSchema = z.object({
  folderId: z.string().nullable().optional(),
  customOrder: z.array(z.string()).optional(),
  pinnedIds: z.array(z.string()).optional(),
  action: z.enum(["set_order", "pin", "unpin", "toggle_pin"]).optional(),
  itemId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "custom-order:update", 120, 60_000);
    const body = await parseJson<z.infer<typeof customOrderSchema>>(request, customOrderSchema);

    const folderId = body.folderId || "root";
    const key = `folder_order:${folderId}`;

    const existing = await prisma.applicationSetting.findUnique({ where: { key } });
    let currentOrder: string[] = [];
    let currentPins: string[] = [];

    if (existing?.value && typeof existing.value === "object") {
      const val = existing.value as { customOrder?: string[]; pinnedIds?: string[] };
      if (Array.isArray(val.customOrder)) currentOrder = val.customOrder;
      if (Array.isArray(val.pinnedIds)) currentPins = val.pinnedIds;
    }

    if (body.customOrder) {
      currentOrder = body.customOrder;
    }

    if (body.pinnedIds) {
      currentPins = body.pinnedIds;
    }

    if (body.action === "pin" && body.itemId) {
      if (!currentPins.includes(body.itemId)) {
        currentPins = [body.itemId, ...currentPins];
      }
    } else if (body.action === "unpin" && body.itemId) {
      currentPins = currentPins.filter((id) => id !== body.itemId);
    } else if (body.action === "toggle_pin" && body.itemId) {
      if (currentPins.includes(body.itemId)) {
        currentPins = currentPins.filter((id) => id !== body.itemId);
      } else {
        currentPins = [body.itemId, ...currentPins];
      }
    }

    await prisma.applicationSetting.upsert({
      where: { key },
      update: {
        value: { customOrder: currentOrder, pinnedIds: currentPins },
        category: "drive_order",
      },
      create: {
        key,
        value: { customOrder: currentOrder, pinnedIds: currentPins },
        category: "drive_order",
      },
    });

    return NextResponse.json({
      success: true,
      folderId,
      customOrder: currentOrder,
      pinnedIds: currentPins,
    });
  } catch (error) {
    return jsonError(error);
  }
}

