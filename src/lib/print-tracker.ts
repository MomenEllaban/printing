import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export interface PrintRecord {
  fileId: string;
  name?: string;
  printedAt: string;
  printCount: number;
}

const SETTING_KEY = "printing.printed_records";
const SETTING_CATEGORY = "printing";

let memoryCache: { map: Map<string, PrintRecord>; timestamp: number } | null = null;
const CACHE_TTL_MS = 3_000;

export async function getPrintedRecordsMap(): Promise<Map<string, PrintRecord>> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return new Map(memoryCache.map);
  }

  const map = new Map<string, PrintRecord>();
  try {
    const row = await prisma.applicationSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
      const records = row.value as Record<string, Partial<PrintRecord>>;
      for (const [id, rec] of Object.entries(records)) {
        if (rec && typeof rec === "object") {
          map.set(id, {
            fileId: id,
            name: rec.name,
            printedAt: rec.printedAt || new Date().toISOString(),
            printCount: typeof rec.printCount === "number" ? rec.printCount : 1,
          });
        }
      }
    }
  } catch (error) {
    console.warn("[print-tracker] could not read printed records from database:", error);
  }

  memoryCache = { map: new Map(map), timestamp: now };
  return map;
}

export async function getPrintedFileIds(): Promise<Set<string>> {
  const map = await getPrintedRecordsMap();
  return new Set(map.keys());
}

export async function markFilesAsPrinted(
  items: { id: string; name?: string }[] | string[]
): Promise<Map<string, PrintRecord>> {
  const map = await getPrintedRecordsMap();
  const nowIso = new Date().toISOString();

  for (const item of items) {
    const fileId = typeof item === "string" ? item : item.id;
    const name = typeof item === "string" ? undefined : item.name;
    if (!fileId) continue;

    const existing = map.get(fileId);
    if (existing) {
      existing.printedAt = nowIso;
      existing.printCount = (existing.printCount || 1) + 1;
      if (name) existing.name = name;
    } else {
      map.set(fileId, {
        fileId,
        name,
        printedAt: nowIso,
        printCount: 1,
      });
    }
  }

  const plain: Record<string, PrintRecord> = {};
  for (const [id, rec] of map.entries()) {
    plain[id] = rec;
  }

  try {
    await prisma.applicationSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        category: SETTING_CATEGORY,
        value: plain as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: plain as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[print-tracker] could not persist printed records:", error);
  }

  memoryCache = { map: new Map(map), timestamp: Date.now() };
  return map;
}

export async function unmarkFilesAsPrinted(fileIds: string[]): Promise<Map<string, PrintRecord>> {
  const map = await getPrintedRecordsMap();
  for (const id of fileIds) {
    map.delete(id);
  }

  const plain: Record<string, PrintRecord> = {};
  for (const [id, rec] of map.entries()) {
    plain[id] = rec;
  }

  try {
    await prisma.applicationSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        category: SETTING_CATEGORY,
        value: plain as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: plain as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[print-tracker] could not persist printed records after unmark:", error);
  }

  memoryCache = { map: new Map(map), timestamp: Date.now() };
  return map;
}

