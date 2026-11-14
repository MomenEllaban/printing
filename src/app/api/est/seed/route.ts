import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import {
  OFFICIAL_EST_SCHOOLS,
  OFFICIAL_EST_CENTERS,
  OFFICIAL_GOVERNORATES,
} from "@/lib/stickers/est-reference-data";
import { createFolder } from "@/lib/drive";
import { AppError } from "@/lib/errors";
import type { drive_v3 } from "googleapis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { OFFICIAL_GOVERNORATES };

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
 * Seeding of official schools, floors, and rooms inside a specific Governorate folder
 */
async function seedGovernorateSchoolsAndCenters(
  drive: drive_v3.Drive,
  govFolderId: string,
  govName: string,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  const govChildrenMap = await getExistingChildFoldersMap(drive, govFolderId);
  let schoolsCreated = 0;
  let roomsCreated = 0;

  // 1. Seed official schools in this governorate (school is both center and building)
  const schoolsInGov = OFFICIAL_EST_SCHOOLS.filter(
    (s) => s.governorate.toLowerCase() === govName.toLowerCase(),
  );

  for (const school of schoolsInGov) {
    const cleanKey = school.schoolName.trim().toLowerCase();
    const fullKey = school.fullFolderName.trim().toLowerCase();
    let schoolFolderId = govChildrenMap.get(cleanKey) || govChildrenMap.get(fullKey);

    if (!schoolFolderId) {
      const created = await createFolder(drive, school.schoolName, govFolderId);
      schoolFolderId = created.id!;
      govChildrenMap.set(cleanKey, schoolFolderId);
    }
    schoolsCreated++;

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
  }

  // 2. Seed university campuses / multi-building centers in this governorate
  const centersInGov = OFFICIAL_EST_CENTERS.filter(
    (c) => c.governorate.toLowerCase() === govName.toLowerCase(),
  );

  for (const center of centersInGov) {
    const centerFolderId = await getOrCreateSubFolderFast(
      drive,
      govFolderId,
      center.centerName,
      govChildrenMap,
    );

    const existingBldMap = await getExistingChildFoldersMap(drive, centerFolderId);

    for (const bld of center.buildings) {
      const bldFolderId = await getOrCreateSubFolderFast(
        drive,
        centerFolderId,
        bld.buildingName,
        existingBldMap,
      );

      const existingFloorsMap = await getExistingChildFoldersMap(drive, bldFolderId);

      for (const fl of bld.floors) {
        const floorFolderId = await getOrCreateSubFolderFast(
          drive,
          bldFolderId,
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
    }
  }

  return { schoolsCreated, roomsCreated };
}

/**
 * Highly optimized Seeding of Governorates, Schools, Floors, and Rooms directly under an Exam folder (EST 1 or EST 2)
 * Structure: Exam -> Governorate -> School/Center -> Floor -> Room
 */
async function seedGovernoratesAndSchoolsHierarchyFast(
  drive: drive_v3.Drive,
  examFolderId: string,
): Promise<{ governoratesCount: number; schoolsCreated: number; roomsCreated: number }> {
  const examChildrenMap = await getExistingChildFoldersMap(drive, examFolderId);
  let totalSchools = 0;
  let totalRooms = 0;

  for (const gov of OFFICIAL_GOVERNORATES) {
    const govFolderId = await getOrCreateSubFolderFast(
      drive,
      examFolderId,
      gov,
      examChildrenMap,
    );

    const { schoolsCreated, roomsCreated } = await seedGovernorateSchoolsAndCenters(
      drive,
      govFolderId,
      gov,
    );
    totalSchools += schoolsCreated;
    totalRooms += roomsCreated;
  }

  return {
    governoratesCount: OFFICIAL_GOVERNORATES.length,
    schoolsCreated: totalSchools,
    roomsCreated: totalRooms,
  };
}

/**
 * Backwards compatibility helper for standalone Schools folder
 */
async function seedSchoolsInsideFolder(
  drive: drive_v3.Drive,
  schoolsFolderId: string,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  const existingSchoolsMap = await getExistingChildFoldersMap(drive, schoolsFolderId);
  let roomsCreated = 0;

  const batchSize = 6;
  for (let i = 0; i < OFFICIAL_EST_SCHOOLS.length; i += batchSize) {
    const chunk = OFFICIAL_EST_SCHOOLS.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (school) => {
        const schoolFolderId = await getOrCreateSubFolderFast(
          drive,
          schoolsFolderId,
          school.schoolName,
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

    // Check if targetFolderId points to a Governorate, Exam, or Cycle
    if (targetFolderId) {
      try {
        const meta = await drive.files.get({
          fileId: targetFolderId,
          fields: "id, name, parents",
        });
        const targetName = (meta.data.name || "").trim();

        // CASE 1: User is inside a specific Governorate folder (e.g. Alexandria, Cairo, etc.)
        const matchingGov = OFFICIAL_GOVERNORATES.find(
          (g) => g.toLowerCase() === targetName.toLowerCase(),
        );
        if (matchingGov) {
          const result = await seedGovernorateSchoolsAndCenters(drive, targetFolderId, matchingGov);
          return NextResponse.json({
            success: true,
            message: `Successfully seeded schools and centers inside ${matchingGov}`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // CASE 2: User is inside a legacy "Schools" folder itself
        if (targetName.toLowerCase() === "schools") {
          const result = await seedSchoolsInsideFolder(drive, targetFolderId);
          return NextResponse.json({
            success: true,
            message: `Successfully verified/created 18 schools, floors & rooms inside Schools folder`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // CASE 3: User is directly inside EST 1 or EST 2 (e.g. December 2026 / EST 1)
        if (/^EST\s*[-_]?\s*[12]\b/i.test(targetName)) {
          const result = await seedGovernoratesAndSchoolsHierarchyFast(drive, targetFolderId);
          return NextResponse.json({
            success: true,
            message: `Successfully created Governorates, Schools & Centers hierarchy inside ${targetName}`,
            totalGovernorates: result.governoratesCount,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // CASE 4: User is inside a cycle folder (e.g. December 2026)
        if (/^(december|january|march|cycle|session)\b/i.test(targetName)) {
          const cycleChildrenMap = await getExistingChildFoldersMap(drive, targetFolderId);
          const est1Id = await getOrCreateSubFolderFast(drive, targetFolderId, "EST 1", cycleChildrenMap);
          const est2Id = await getOrCreateSubFolderFast(drive, targetFolderId, "EST 2", cycleChildrenMap);
          const res1 = await seedGovernoratesAndSchoolsHierarchyFast(drive, est1Id);
          const res2 = await seedGovernoratesAndSchoolsHierarchyFast(drive, est2Id);
          return NextResponse.json({
            success: true,
            message: `Successfully seeded Governorates & Schools inside ${targetName} for EST 1 & EST 2`,
            totalSchools: res1.schoolsCreated + res2.schoolsCreated,
            totalRooms: res1.roomsCreated + res2.roomsCreated,
          });
        }
      } catch (err) {
        console.warn("[seed] Could not inspect direct targetFolderId:", err);
      }
    }

    // CASE 5: Seed Cycle folders under Root (default: active cycle "December 2026")
    const rootChildrenMap = await getExistingChildFoldersMap(drive, rootFolderId);

    let cyclesToSeed: string[] = ["December 2026"];
    if (typeof body.cycle === "string" && body.cycle.trim()) {
      cyclesToSeed = [body.cycle.trim()];
    } else if (Array.isArray(body.cycles) && body.cycles.length > 0) {
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
        const { roomsCreated } = await seedGovernoratesAndSchoolsHierarchyFast(drive, exam.id);
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
      message: `Successfully seeded Governorates & Schools for ${cyclesToSeed.join(", ")}`,
      seededCycles,
    });
  } catch (err) {
    return jsonError(err);
  }
}
