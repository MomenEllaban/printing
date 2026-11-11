import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { OFFICIAL_EST_SCHOOLS } from "@/lib/stickers/est-reference-data";
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
  const cacheKey = `${parentId}:::${name.trim().toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const escapedName = name.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedParent = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const listRes = await drive.files.list({
    q: `name = '${escapedName}' and '${escapedParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let folderId = listRes.data.files?.[0]?.id;
  if (!folderId) {
    const created = await createFolder(drive, name.trim(), parentId);
    folderId = created.id!;
  }

  cache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Seeds the official Schools / Floors / Rooms hierarchy for an exam folder (EST 1 / EST 2)
 */
async function seedSchoolsHierarchy(
  drive: drive_v3.Drive,
  examFolderId: string,
  cache: Map<string, string>,
  onProgress?: (msg: string) => void,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  // 1. Schools Folder
  const schoolsFolderId = await getOrCreateSubFolder(drive, examFolderId, "Schools", cache);

  let roomsCreated = 0;
  for (let sIdx = 0; sIdx < OFFICIAL_EST_SCHOOLS.length; sIdx++) {
    const school = OFFICIAL_EST_SCHOOLS[sIdx];
    onProgress?.(`Processing school [${sIdx + 1}/${OFFICIAL_EST_SCHOOLS.length}]: ${school.schoolName}...`);

    // School Folder: e.g. "Al Alamiya Modern School - International (Qalyubia)"
    const schoolId = await getOrCreateSubFolder(drive, schoolsFolderId, school.fullFolderName, cache);

    // Floors
    for (const fl of school.floors) {
      const floorId = await getOrCreateSubFolder(drive, schoolId, fl.floorName, cache);

      // Rooms
      for (const room of fl.rooms) {
        await getOrCreateSubFolder(drive, floorId, room, cache);
        roomsCreated++;
      }
    }
  }

  return { schoolsCreated: OFFICIAL_EST_SCHOOLS.length, roomsCreated };
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

    // Target parent folder ID (optional, defaults to root or schedule folder)
    const targetFolderId = typeof body.targetFolderId === "string" && body.targetFolderId.trim()
      ? body.targetFolderId.trim()
      : null;

    const scheduleName = typeof body.scheduleName === "string" ? body.scheduleName.trim() : "December 2026";

    // Support seeding both EST 1 and EST 2 by default
    const examNames: string[] = Array.isArray(body.examNames) && body.examNames.length > 0
      ? body.examNames
      : typeof body.examName === "string" && body.examName.trim()
        ? [body.examName.trim()]
        : ["EST 1", "EST 2"];

    const cache = new Map<string, string>();

    // Determine root parent for exams
    let parentForExams = targetFolderId || rootFolderId;
    let scheduleFolderId: string | undefined;

    if (!targetFolderId && scheduleName) {
      scheduleFolderId = await getOrCreateSubFolder(drive, rootFolderId, scheduleName, cache);
      parentForExams = scheduleFolderId;
    }

    const seededExams: Array<{ examName: string; examFolderId: string; roomsCreated: number }> = [];

    for (const examName of examNames) {
      const examFolderId = await getOrCreateSubFolder(drive, parentForExams, examName, cache);
      const { roomsCreated } = await seedSchoolsHierarchy(drive, examFolderId, cache);
      seededExams.push({ examName, examFolderId, roomsCreated });
    }

    const totalRooms = seededExams.reduce((acc, e) => acc + e.roomsCreated, 0);

    return NextResponse.json({
      success: true,
      message: `Successfully created official EST schools hierarchy (${cache.size} total folders, ${totalRooms} rooms) for ${examNames.join(" & ")}`,
      totalCreated: cache.size,
      totalRooms,
      totalSchools: OFFICIAL_EST_SCHOOLS.length,
      scheduleFolderId,
      seededExams,
    });
  } catch (err) {
    return jsonError(err);
  }
}
