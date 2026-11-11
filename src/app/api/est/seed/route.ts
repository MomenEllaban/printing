import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { OFFICIAL_EST_SCHOOLS } from "@/lib/stickers/est-reference-data";
import { createFolder } from "@/lib/drive";
import { AppError } from "@/lib/errors";
import type { drive_v3 } from "googleapis";

export const dynamic = "force-dynamic";

const OFFICIAL_GOVERNORATES = [
  "Alexandria",
  "Cairo",
  "Giza",
  "Qalyubia",
  "Dakahlia",
  "Menofia",
  "Suez",
  "Minya",
  "Damietta",
];

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
  // 1. Remove any accidentally nested exam folders inside this exam folder (e.g. EST 1 inside EST 1)
  try {
    const nestedRes = await drive.files.list({
      q: `'${examFolderId}' in parents and (name = 'EST 1' or name = 'EST 2') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });
    for (const nested of nestedRes.data.files || []) {
      if (nested.id) {
        await drive.files.update({ fileId: nested.id, requestBody: { trashed: true } });
      }
    }
  } catch (err) {
    console.warn("[seed] Could not clean nested exam folders:", err);
  }

  // 2. Schools Folder directly under exam
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

  // 3. Ensure all governorate folders exist directly under exam folder, and empty their contents
  for (const gov of OFFICIAL_GOVERNORATES) {
    const govId = await getOrCreateSubFolder(drive, examFolderId, gov, cache);

    // Empty previous contents inside governorate folder so it's clean and empty
    try {
      const childrenRes = await drive.files.list({
        q: `'${govId}' in parents and trashed = false`,
        fields: "files(id, name)",
        pageSize: 100,
      });
      for (const child of childrenRes.data.files || []) {
        if (child.id) {
          await drive.files.update({ fileId: child.id, requestBody: { trashed: true } });
        }
      }
    } catch (err) {
      console.warn(`[seed] Failed to empty contents of ${gov}:`, err);
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

    // Target parent folder ID (optional)
    const targetFolderId =
      typeof body.targetFolderId === "string" && body.targetFolderId.trim()
        ? body.targetFolderId.trim()
        : null;

    const cache = new Map<string, string>();

    // 1. Resolve December 2026 folder
    let dec2026Id: string;
    if (targetFolderId) {
      try {
        const meta = await drive.files.get({
          fileId: targetFolderId,
          fields: "id, name, parents",
        });
        const name = (meta.data.name || "").trim();

        if (/^EST\s*[12]$/i.test(name)) {
          // targetFolderId is EST 1 or EST 2 itself! Parent is December 2026
          const parentId = meta.data.parents?.[0];
          dec2026Id = parentId || (await getOrCreateSubFolder(drive, rootFolderId, "December 2026", cache));
        } else if (/december\s*2026/i.test(name)) {
          dec2026Id = targetFolderId;
        } else {
          dec2026Id = await getOrCreateSubFolder(drive, rootFolderId, "December 2026", cache);
        }
      } catch {
        dec2026Id = await getOrCreateSubFolder(drive, rootFolderId, "December 2026", cache);
      }
    } else {
      dec2026Id = await getOrCreateSubFolder(drive, rootFolderId, "December 2026", cache);
    }

    // 2. Resolve both EST 1 and EST 2 directly under December 2026
    const est1Id = await getOrCreateSubFolder(drive, dec2026Id, "EST 1", cache);
    const est2Id = await getOrCreateSubFolder(drive, dec2026Id, "EST 2", cache);

    const examTargets = [
      { name: "EST 1", id: est1Id },
      { name: "EST 2", id: est2Id },
    ];

    const seededExams: Array<{ examName: string; examFolderId: string; roomsCreated: number }> = [];

    // Seed both EST 1 and EST 2
    for (const exam of examTargets) {
      const { roomsCreated } = await seedSchoolsHierarchy(drive, exam.id, cache);
      seededExams.push({ examName: exam.name, examFolderId: exam.id, roomsCreated });
    }

    const totalRooms = seededExams.reduce((acc, e) => acc + e.roomsCreated, 0);

    return NextResponse.json({
      success: true,
      message: `Successfully created Schools folder (18 schools, 202 rooms) and initialized empty governorates under EST 1 & EST 2`,
      totalCreated: cache.size,
      totalRooms,
      totalSchools: OFFICIAL_EST_SCHOOLS.length,
      scheduleFolderId: dec2026Id,
      seededExams,
    });
  } catch (err) {
    return jsonError(err);
  }
}
