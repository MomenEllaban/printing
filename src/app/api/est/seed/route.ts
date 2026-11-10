import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { EST_REFERENCE_DATA } from "@/lib/stickers/est-reference-data";
import { createFolder } from "@/lib/drive";
import { AppError } from "@/lib/errors";
import type { drive_v3 } from "googleapis";

export const dynamic = "force-dynamic";

async function getOrCreateSubFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cacheKey = `${parentId}:::${name.trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedParent = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const listRes = await drive.files.list({
    q: `name = '${escapedName}' and '${escapedParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 1,
    supportsAllDrives: true,
  });

  let folderId = listRes.data.files?.[0]?.id;
  if (!folderId) {
    const created = await createFolder(drive, name.trim(), parentId);
    folderId = created.id!;
  }

  cache.set(cacheKey, folderId);
  return folderId;
}

async function seedEstFolderStructure(
  drive: drive_v3.Drive,
  rootParentId: string,
  options?: { scheduleName?: string; examName?: string } | string,
  onProgress?: (msg: string) => void,
): Promise<{ totalCreated: number; estRootId: string; scheduleFolderId?: string }> {
  const cache = new Map<string, string>();
  const scheduleName =
    (typeof options === "object" ? options?.scheduleName : undefined) ?? "December 2026";
  const examName = (typeof options === "string" ? options : options?.examName) ?? "EST 1";

  let parentForExam = rootParentId;
  let scheduleFolderId: string | undefined;
  if (scheduleName) {
    onProgress?.(`Creating or finding schedule folder "${scheduleName}"...`);
    scheduleFolderId = await getOrCreateSubFolder(drive, rootParentId, scheduleName, cache);
    parentForExam = scheduleFolderId;
  }

  onProgress?.(`Creating or finding root folder "${examName}"...`);
  const estRootId = await getOrCreateSubFolder(drive, parentForExam, examName, cache);

  let count = 1;
  const processed = new Set<string>();

  for (const row of EST_REFERENCE_DATA) {
    const govId = await getOrCreateSubFolder(drive, estRootId, row.governorate, cache);
    const centerId = await getOrCreateSubFolder(drive, govId, row.testCenter, cache);
    const buildingId = await getOrCreateSubFolder(drive, centerId, row.building, cache);
    const floorId = await getOrCreateSubFolder(drive, buildingId, row.floor, cache);

    const roomKey = `${floorId}:::${row.room}`;
    if (!processed.has(roomKey)) {
      await getOrCreateSubFolder(drive, floorId, row.room, cache);
      processed.add(roomKey);
      count++;
      if (count % 10 === 0) {
        onProgress?.(`Created ${count} folders...`);
      }
    }
  }

  return { totalCreated: cache.size, estRootId, scheduleFolderId };
}

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "est:seed", 10, 60_000);

    const connection = await getConnection();
    if (connection?.connectionStatus !== "connected") {
      throw new AppError("Google Drive must be connected to create EST folder structure", {
        status: 400,
        code: "invalidRequest",
      });
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const body = await request.json().catch(() => ({}));
    const scheduleName = typeof body.scheduleName === "string" ? body.scheduleName.trim() : "December 2026";
    const examName = typeof body.examName === "string" && body.examName.trim() ? body.examName.trim() : "EST 1";

    const result = await seedEstFolderStructure(drive, rootFolderId, { scheduleName, examName });

    return NextResponse.json({
      success: true,
      message: `Successfully created EST folder structure (${result.totalCreated} folders) under ${scheduleName} / ${examName}`,
      totalCreated: result.totalCreated,
      estRootId: result.estRootId,
      scheduleFolderId: result.scheduleFolderId,
    });
  } catch (err) {
    return jsonError(err);
  }
}
