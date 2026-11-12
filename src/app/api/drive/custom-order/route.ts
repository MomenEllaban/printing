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
  orderedIds: z.array(z.string()).optional(),
  pinnedIds: z.array(z.string()).optional(),
  action: z.enum(["set_order", "pin", "unpin", "toggle_pin"]).optional(),
  itemId: z.string().optional(),
  fileId: z.string().optional(),
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

    const orderToSave = body.customOrder || body.orderedIds;
    if (orderToSave) {
      currentOrder = orderToSave;
    }

    if (body.pinnedIds) {
      currentPins = body.pinnedIds;
    }

    const targetId = body.itemId || body.fileId;
    if (body.action === "pin" && targetId) {
      if (!currentPins.includes(targetId)) {
        currentPins = [targetId, ...currentPins];
      }
    } else if (body.action === "unpin" && targetId) {
      currentPins = currentPins.filter((id) => id !== targetId);
    } else if (body.action === "toggle_pin" && targetId) {
      if (currentPins.includes(targetId)) {
        currentPins = currentPins.filter((id) => id !== targetId);
      } else {
        currentPins = [targetId, ...currentPins];
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

    if (targetId && (body.action === "pin" || body.action === "unpin" || body.action === "toggle_pin")) {
      const globalKey = "global_pinned_items";
      const globalSetting = await prisma.applicationSetting.findUnique({ where: { key: globalKey } });
      let globalPins: string[] = [];
      if (globalSetting?.value && typeof globalSetting.value === "object") {
        const val = globalSetting.value as { pinnedIds?: string[] };
        if (Array.isArray(val.pinnedIds)) globalPins = val.pinnedIds;
      }
      if (body.action === "pin" || (body.action === "toggle_pin" && currentPins.includes(targetId))) {
        if (!globalPins.includes(targetId)) globalPins = [targetId, ...globalPins];
      } else {
        globalPins = globalPins.filter((id) => id !== targetId);
      }
      await prisma.applicationSetting.upsert({
        where: { key: globalKey },
        update: { value: { pinnedIds: globalPins }, category: "drive_order" },
        create: { key: globalKey, value: { pinnedIds: globalPins }, category: "drive_order" },
      });
    }

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

