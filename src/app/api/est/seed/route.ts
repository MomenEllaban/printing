import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { OFFICIAL_EST_SCHOOLS } from "@/lib/stickers/est-reference-data";
import { createFolder } from "@/lib/drive";
import { AppError } from "@/lib/errors";
import type { drive_v3 } from "googleapis";

export const dynamic = "force-dynamic";

export const OFFICIAL_GOVERNORATES = [
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

export const OFFICIAL_CYCLES = [
  "December 2026",
  "January 2027",
  "March 2027",
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

    // Determine which cycles to seed (December 2026, January 2027, March 2027 by default)
    let cyclesToSeed: string[] = OFFICIAL_CYCLES;
    if (Array.isArray(body.cycles) && body.cycles.length > 0) {
      cyclesToSeed = body.cycles.map((c: string) => String(c).trim()).filter(Boolean);
    } else if (typeof body.scheduleName === "string" && body.scheduleName.trim()) {
      const customName = body.scheduleName.trim();
      cyclesToSeed = Array.from(new Set([customName, ...OFFICIAL_CYCLES]));
    }

    // Check if targetFolderId points directly inside a specific cycle or exam
    let currentCycleId: string | null = null;
    if (targetFolderId) {
      try {
        const meta = await drive.files.get({
          fileId: targetFolderId,
          fields: "id, name, parents",
        });
        const name = (meta.data.name || "").trim();

        if (/^EST\s*[12]$/i.test(name)) {
          // Inside EST 1 or EST 2, parent is the cycle folder
          currentCycleId = meta.data.parents?.[0] || null;
        } else if (/^(december|january|march|session|cycle)/i.test(name)) {
          currentCycleId = targetFolderId;
        }
      } catch (err) {
        console.warn("[seed] Could not inspect targetFolderId:", err);
      }
    }

    const seededCycles: Array<{
      cycleName: string;
      cycleId: string;
      exams: Array<{ examName: string; examFolderId: string; roomsCreated: number }>;
    }> = [];

    // Seed each cycle
    for (const cycleName of cyclesToSeed) {
      let cycleFolderId: string;
      if (
        currentCycleId &&
        /december\s*2026/i.test(cycleName) &&
        (await drive.files.get({ fileId: currentCycleId, fields: "name" }).catch(() => ({})))
          // @ts-expect-error type check safe
          ?.data?.name?.includes("December")
      ) {
        cycleFolderId = currentCycleId;
      } else {
        cycleFolderId = await getOrCreateSubFolder(drive, rootFolderId, cycleName, cache);
      }

      const est1Id = await getOrCreateSubFolder(drive, cycleFolderId, "EST 1", cache);
      const est2Id = await getOrCreateSubFolder(drive, cycleFolderId, "EST 2", cache);

      const examTargets = [
        { name: "EST 1", id: est1Id },
        { name: "EST 2", id: est2Id },
      ];

      const examResults = [];
      for (const exam of examTargets) {
        const { roomsCreated } = await seedSchoolsHierarchy(drive, exam.id, cache);
        examResults.push({ examName: exam.name, examFolderId: exam.id, roomsCreated });
      }

      seededCycles.push({
        cycleName,
        cycleId: cycleFolderId,
        exams: examResults,
      });
    }

    const totalRooms = seededCycles.reduce(
      (sum, c) => sum + c.exams.reduce((eSum, e) => eSum + e.roomsCreated, 0),
      0,
    );

    return NextResponse.json({
      success: true,
      message: `Successfully created EST folder structure for ${cyclesToSeed.join(", ")} (Schools + empty Governorates)`,
      totalCreated: cache.size,
      totalRooms,
      totalSchools: OFFICIAL_EST_SCHOOLS.length,
      seededCycles,
    });
  } catch (err) {
    return jsonError(err);
  }
}
