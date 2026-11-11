import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { OFFICIAL_EST_SCHOOLS } from "@/lib/stickers/est-reference-data";
import { createFolder } from "@/lib/drive";
import { AppError } from "@/lib/errors";
import type { drive_v3 } from "googleapis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

/**
 * Returns a map of (lowercased name -> folder id) for all direct child folders of parentId.
 * Done in ONE single Google Drive API call.
 */
async function getExistingChildFoldersMap(
  drive: drive_v3.Drive,
  parentId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const escapedParent = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    let currPageToken: string | undefined = undefined;
    let hasMore = true;
    while (hasMore) {
      const listRes: { data: drive_v3.Schema$FileList } = await drive.files.list({
        q: `'${escapedParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "nextPageToken, files(id, name)",
        pageSize: 100,
        pageToken: currPageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const f of listRes.data.files || []) {
        if (f.id && f.name) {
          map.set(f.name.trim().toLowerCase(), f.id);
        }
      }
      currPageToken = listRes.data.nextPageToken || undefined;
      hasMore = Boolean(currPageToken);
    }
  } catch (err) {
    console.warn(`[seed] Failed listing children of ${parentId}:`, err);
  }
  return map;
}

async function getOrCreateSubFolderFast(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  existingMap: Map<string, string>,
): Promise<string> {
  const key = name.trim().toLowerCase();
  const existing = existingMap.get(key);
  if (existing) return existing;

  const created = await createFolder(drive, name.trim(), parentId);
  const newId = created.id!;
  existingMap.set(key, newId);
  return newId;
}

/**
 * Highly optimized seeding of the 18 official schools, floors and rooms inside a given Schools folder
 */
async function seedSchoolsInsideFolder(
  drive: drive_v3.Drive,
  schoolsFolderId: string,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  const existingSchoolsMap = await getExistingChildFoldersMap(drive, schoolsFolderId);
  let roomsCreated = 0;

  // Process schools in controlled parallel batches of 6 for speed
  const batchSize = 6;
  for (let i = 0; i < OFFICIAL_EST_SCHOOLS.length; i += batchSize) {
    const chunk = OFFICIAL_EST_SCHOOLS.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (school) => {
        const schoolFolderId = await getOrCreateSubFolderFast(
          drive,
          schoolsFolderId,
          school.fullFolderName,
          existingSchoolsMap,
        );

        const existingFloorsMap = await getExistingChildFoldersMap(drive, schoolFolderId);

        for (const fl of school.floors) {
          const floorFolderId = await getOrCreateSubFolderFast(
            drive,
            schoolFolderId,
            fl.floorName,
            existingFloorsMap,
          );

          const existingRoomsMap = await getExistingChildFoldersMap(drive, floorFolderId);

          for (const rm of fl.rooms) {
            await getOrCreateSubFolderFast(
              drive,
              floorFolderId,
              rm,
              existingRoomsMap,
            );
            roomsCreated++;
          }
        }
      }),
    );
  }
  return { schoolsCreated: OFFICIAL_EST_SCHOOLS.length, roomsCreated };
}

/**
 * Highly optimized Seeding of the official Schools / Floors / Rooms hierarchy
 */
async function seedSchoolsHierarchyFast(
  drive: drive_v3.Drive,
  examFolderId: string,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  // 1. Get existing folders under the exam folder (Schools, Menofia, Minya, etc.)
  const examChildrenMap = await getExistingChildFoldersMap(drive, examFolderId);

  // 2. Ensure "Schools" folder exists
  const schoolsFolderId = await getOrCreateSubFolderFast(
    drive,
    examFolderId,
    "Schools",
    examChildrenMap,
  );

  // 3. Populate schools inside the Schools folder
  const res = await seedSchoolsInsideFolder(drive, schoolsFolderId);

  // 4. Ensure all governorate folders exist directly under exam folder
  for (const gov of OFFICIAL_GOVERNORATES) {
    await getOrCreateSubFolderFast(drive, examFolderId, gov, examChildrenMap);
  }

  return res;
}

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "est:seed", 20, 60_000);

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

    // Check if targetFolderId points to Schools, an Exam, or a Cycle
    if (targetFolderId) {
      try {
        const meta = await drive.files.get({
          fileId: targetFolderId,
          fields: "id, name, parents",
        });
        const targetName = (meta.data.name || "").trim();

        // CASE 1: User is inside the "Schools" folder itself
        if (targetName.toLowerCase() === "schools") {
          const result = await seedSchoolsInsideFolder(drive, targetFolderId);
          return NextResponse.json({
            success: true,
            message: `Successfully verified/created 18 schools, floors & rooms inside Schools folder`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // CASE 2: User is directly inside EST 1 or EST 2 (e.g. December 2026 / EST 1)
        if (/^EST\s*[-_]?\s*[12]\b/i.test(targetName)) {
          const result = await seedSchoolsHierarchyFast(drive, targetFolderId);
          return NextResponse.json({
            success: true,
            message: `Successfully created Schools folder (18 schools, floors & rooms) inside ${targetName}`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // CASE 3: User is inside a cycle folder (e.g. December 2026)
        if (/^(december|january|march|cycle|session)\b/i.test(targetName)) {
          const cycleChildrenMap = await getExistingChildFoldersMap(drive, targetFolderId);
          const est1Id = await getOrCreateSubFolderFast(drive, targetFolderId, "EST 1", cycleChildrenMap);
          const est2Id = await getOrCreateSubFolderFast(drive, targetFolderId, "EST 2", cycleChildrenMap);
          const res1 = await seedSchoolsHierarchyFast(drive, est1Id);
          const res2 = await seedSchoolsHierarchyFast(drive, est2Id);
          return NextResponse.json({
            success: true,
            message: `Successfully seeded Schools & Governorates inside ${targetName} for EST 1 & EST 2`,
            totalSchools: res1.schoolsCreated + res2.schoolsCreated,
            totalRooms: res1.roomsCreated + res2.roomsCreated,
          });
        }
      } catch (err) {
        console.warn("[seed] Could not inspect direct targetFolderId:", err);
      }
    }

    // CASE 4: Seed Cycle folders (default to single active cycle "December 2026" to prevent timeout)
    const rootChildrenMap = await getExistingChildFoldersMap(drive, rootFolderId);

    let cyclesToSeed: string[] = ["December 2026"];
    if (typeof body.cycle === "string" && body.cycle.trim()) {
      cyclesToSeed = [body.cycle.trim()];
    } else if (Array.isArray(body.cycles) && body.cycles.length > 0) {
      // Pick first requested cycle to avoid gateway timeout
      cyclesToSeed = [String(body.cycles[0]).trim()];
    } else if (typeof body.scheduleName === "string" && body.scheduleName.trim()) {
      cyclesToSeed = [body.scheduleName.trim()];
    }

    const seededCycles: Array<{
      cycleName: string;
      cycleId: string;
      exams: Array<{ examName: string; examFolderId: string; roomsCreated: number }>;
    }> = [];

    for (const cycleName of cyclesToSeed) {
      const cycleFolderId = await getOrCreateSubFolderFast(
        drive,
        rootFolderId,
        cycleName,
        rootChildrenMap,
      );

      const cycleChildrenMap = await getExistingChildFoldersMap(drive, cycleFolderId);

      const est1Id = await getOrCreateSubFolderFast(
        drive,
        cycleFolderId,
        "EST 1",
        cycleChildrenMap,
      );
      const est2Id = await getOrCreateSubFolderFast(
        drive,
        cycleFolderId,
        "EST 2",
        cycleChildrenMap,
      );

      const examTargets = [
        { name: "EST 1", id: est1Id },
        { name: "EST 2", id: est2Id },
      ];

      const examResults = [];
      for (const exam of examTargets) {
        const { roomsCreated } = await seedSchoolsHierarchyFast(drive, exam.id);
        examResults.push({ examName: exam.name, examFolderId: exam.id, roomsCreated });
      }

      seededCycles.push({
        cycleName,
        cycleId: cycleFolderId,
        exams: examResults,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded Schools & Governorates for ${cyclesToSeed.join(", ")}`,
      seededCycles,
    });
  } catch (err) {
    return jsonError(err);
  }
}
