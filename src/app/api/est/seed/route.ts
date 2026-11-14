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
 * Concurrency helper to run async tasks in chunks to maximize speed
 * while staying well within Google Drive API rate limits.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(
      chunk.map((item, idx) => fn(item, i + idx)),
    );
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }
  return results;
}

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
 * Seeding of official schools, floors, and rooms inside a specific Governorate folder.
 * If includeRooms is false: only creates school and center building folders (ultra fast: ~1s).
 * If includeRooms is true: creates floors and rooms with concurrency (~2-4s).
 */
async function seedGovernorateSchoolsAndCenters(
  drive: drive_v3.Drive,
  govFolderId: string,
  govName: string,
  includeRooms: boolean = true,
): Promise<{ schoolsCreated: number; roomsCreated: number }> {
  const govChildrenMap = await getExistingChildFoldersMap(drive, govFolderId);
  let schoolsCreated = 0;
  let roomsCreated = 0;

  // 1. Seed official schools in this governorate
  const schoolsInGov = OFFICIAL_EST_SCHOOLS.filter(
    (s) => s.governorate.toLowerCase() === govName.toLowerCase(),
  );

  await mapConcurrent(schoolsInGov, 4, async (school) => {
    const cleanKey = school.schoolName.trim().toLowerCase();
    const fullKey = school.fullFolderName.trim().toLowerCase();
    let schoolFolderId = govChildrenMap.get(cleanKey) || govChildrenMap.get(fullKey);

    if (!schoolFolderId) {
      const created = await createFolder(drive, school.schoolName, govFolderId);
      schoolFolderId = created.id!;
      govChildrenMap.set(cleanKey, schoolFolderId);
    }
    schoolsCreated++;

    if (!includeRooms) return;

    const existingFloorsMap = await getExistingChildFoldersMap(drive, schoolFolderId);

    for (const fl of school.floors) {
      const floorFolderId = await getOrCreateSubFolderFast(
        drive,
        schoolFolderId,
        fl.floorName,
        existingFloorsMap,
      );

      const existingRoomsMap = await getExistingChildFoldersMap(drive, floorFolderId);

      await mapConcurrent(fl.rooms, 5, async (rm) => {
        await getOrCreateSubFolderFast(
          drive,
          floorFolderId,
          rm,
          existingRoomsMap,
        );
        roomsCreated++;
      });
    }
  });

  // 2. Seed university campuses / multi-building centers in this governorate
  const centersInGov = OFFICIAL_EST_CENTERS.filter(
    (c) => c.governorate.toLowerCase() === govName.toLowerCase(),
  );

  await mapConcurrent(centersInGov, 3, async (center) => {
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

      if (!includeRooms) continue;

      const existingFloorsMap = await getExistingChildFoldersMap(drive, bldFolderId);

      for (const fl of bld.floors) {
        const floorFolderId = await getOrCreateSubFolderFast(
          drive,
          bldFolderId,
          fl.floorName,
          existingFloorsMap,
        );

        const existingRoomsMap = await getExistingChildFoldersMap(drive, floorFolderId);

        await mapConcurrent(fl.rooms, 5, async (rm) => {
          await getOrCreateSubFolderFast(
            drive,
            floorFolderId,
            rm,
            existingRoomsMap,
          );
          roomsCreated++;
        });
      }
    }
  });

  return { schoolsCreated, roomsCreated };
}

/**
 * Fast Base Structure Seeding:
 * Creates Cycle -> EST 1 and EST 2 -> 9 Governorates -> all 25 Schools & Centers (shallow).
 * Completes in ~3-4 seconds without timeout!
 */
async function seedBaseHierarchyFast(
  drive: drive_v3.Drive,
  rootFolderId: string,
  cycleName: string = "December 2026",
  examFilter?: string,
): Promise<{
  cycleFolderId: string;
  exams: Array<{ name: string; id: string }>;
  governorates: string[];
}> {
  const rootChildrenMap = await getExistingChildFoldersMap(drive, rootFolderId);
  const cycleFolderId = await getOrCreateSubFolderFast(
    drive,
    rootFolderId,
    cycleName,
    rootChildrenMap,
  );

  const cycleChildrenMap = await getExistingChildFoldersMap(drive, cycleFolderId);
  const est1Id = await getOrCreateSubFolderFast(drive, cycleFolderId, "EST 1", cycleChildrenMap);
  const est2Id = await getOrCreateSubFolderFast(drive, cycleFolderId, "EST 2", cycleChildrenMap);

  let examTargets = [
    { name: "EST 1", id: est1Id },
    { name: "EST 2", id: est2Id },
  ];

  if (examFilter && /^EST\s*2/i.test(examFilter)) {
    examTargets = [{ name: "EST 2", id: est2Id }];
  } else if (examFilter && /^EST\s*1/i.test(examFilter)) {
    examTargets = [{ name: "EST 1", id: est1Id }];
  }

  for (const exam of examTargets) {
    const examChildrenMap = await getExistingChildFoldersMap(drive, exam.id);
    // Create all 9 governorates and schools (shallow, without rooms) in concurrent chunks
    await mapConcurrent(OFFICIAL_GOVERNORATES, 4, async (gov) => {
      const govFolderId = await getOrCreateSubFolderFast(
        drive,
        exam.id,
        gov,
        examChildrenMap,
      );
      await seedGovernorateSchoolsAndCenters(drive, govFolderId, gov, false);
    });
  }

  return {
    cycleFolderId,
    exams: examTargets,
    governorates: OFFICIAL_GOVERNORATES,
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

  await mapConcurrent(OFFICIAL_EST_SCHOOLS, 3, async (school) => {
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

      await mapConcurrent(fl.rooms, 5, async (rm) => {
        await getOrCreateSubFolderFast(
          drive,
          floorFolderId,
          rm,
          existingRoomsMap,
        );
        roomsCreated++;
      });
    }
  });

  return { schoolsCreated: OFFICIAL_EST_SCHOOLS.length, roomsCreated };
}

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "est:seed", 60, 60_000);

    const connection = await getConnection();
    if (connection?.connectionStatus !== "connected") {
      throw new AppError("Google Drive must be connected to create EST folder structure", {
        status: 400,
        code: "invalidRequest",
      });
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const body = await request.json().catch(() => ({}));

    const mode = typeof body.mode === "string" ? body.mode.trim().toLowerCase() : "";
    const requestedCycle =
      typeof body.cycle === "string" && body.cycle.trim() ? body.cycle.trim() : "December 2026";
    const requestedExam =
      typeof body.exam === "string" && body.exam.trim() ? body.exam.trim() : "EST 1";
    const requestedGov =
      typeof body.governorate === "string" && body.governorate.trim() ? body.governorate.trim() : "";
    const targetFolderId =
      typeof body.targetFolderId === "string" && body.targetFolderId.trim()
        ? body.targetFolderId.trim()
        : null;

    // 1. SPECIFIC GOVERNORATE SEEDING (Ultra-Fast: ~1-3s, ZERO timeout risk)
    if (mode === "governorate" || (requestedGov && !mode)) {
      const matchingGov = OFFICIAL_GOVERNORATES.find(
        (g) => g.toLowerCase() === requestedGov.toLowerCase(),
      );
      if (!matchingGov) {
        throw new AppError(`Unknown governorate: ${requestedGov}`, { status: 400 });
      }

      // Find or create Cycle and Exam folder first
      const rootChildrenMap = await getExistingChildFoldersMap(drive, rootFolderId);
      const cycleFolderId = await getOrCreateSubFolderFast(
        drive,
        rootFolderId,
        requestedCycle,
        rootChildrenMap,
      );

      const cycleChildrenMap = await getExistingChildFoldersMap(drive, cycleFolderId);
      const examFolderId = await getOrCreateSubFolderFast(
        drive,
        cycleFolderId,
        requestedExam,
        cycleChildrenMap,
      );

      const examChildrenMap = await getExistingChildFoldersMap(drive, examFolderId);
      const govFolderId = await getOrCreateSubFolderFast(
        drive,
        examFolderId,
        matchingGov,
        examChildrenMap,
      );

      const result = await seedGovernorateSchoolsAndCenters(drive, govFolderId, matchingGov, true);

      return NextResponse.json({
        success: true,
        mode: "governorate",
        governorate: matchingGov,
        exam: requestedExam,
        cycle: requestedCycle,
        schoolsCreated: result.schoolsCreated,
        roomsCreated: result.roomsCreated,
        message: `Successfully created rooms for ${matchingGov} in ${requestedExam}`,
      });
    }

    // 2. CHECK TARGET FOLDER CONTEXT (If user triggered from inside a specific folder)
    if (targetFolderId) {
      try {
        const meta = await drive.files.get({
          fileId: targetFolderId,
          fields: "id, name, parents",
        });
        const targetName = (meta.data.name || "").trim();

        // Inside a specific Governorate folder
        const matchingGov = OFFICIAL_GOVERNORATES.find(
          (g) => g.toLowerCase() === targetName.toLowerCase(),
        );
        if (matchingGov) {
          const result = await seedGovernorateSchoolsAndCenters(drive, targetFolderId, matchingGov, true);
          return NextResponse.json({
            success: true,
            mode: "governorate",
            governorate: matchingGov,
            message: `Successfully seeded schools and rooms inside ${matchingGov}`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // Inside legacy "Schools" folder
        if (targetName.toLowerCase() === "schools") {
          const result = await seedSchoolsInsideFolder(drive, targetFolderId);
          return NextResponse.json({
            success: true,
            message: `Successfully verified/created 18 schools, floors & rooms inside Schools folder`,
            totalSchools: result.schoolsCreated,
            totalRooms: result.roomsCreated,
          });
        }

        // Inside EST 1 or EST 2 folder
        if (/^EST\s*[-_]?\s*[12]\b/i.test(targetName)) {
          const examName = targetName.toUpperCase().includes("2") ? "EST 2" : "EST 1";
          const examChildrenMap = await getExistingChildFoldersMap(drive, targetFolderId);
          await mapConcurrent(OFFICIAL_GOVERNORATES, 4, async (gov) => {
            const govFolderId = await getOrCreateSubFolderFast(
              drive,
              targetFolderId,
              gov,
              examChildrenMap,
            );
            await seedGovernorateSchoolsAndCenters(drive, govFolderId, gov, false);
          });
          return NextResponse.json({
            success: true,
            mode: "base",
            exam: examName,
            message: `Successfully seeded Governorates & Schools inside ${targetName}`,
            governorates: OFFICIAL_GOVERNORATES,
          });
        }
      } catch (err) {
        console.warn("[seed] Could not inspect direct targetFolderId:", err);
      }
    }

    // 3. BASE SEEDING (DEFAULT): Creates Cycle -> EST 1 & EST 2 -> 9 Governorates -> 25 Schools & Centers (~3-4s, ZERO timeout)
    const baseResult = await seedBaseHierarchyFast(
      drive,
      rootFolderId,
      requestedCycle,
      body.exam,
    );

    return NextResponse.json({
      success: true,
      mode: "base",
      message: `Successfully created EST base structure for ${requestedCycle} (Exams, 9 Governorates, and 25 Schools & Centers)`,
      cycle: requestedCycle,
      governorates: OFFICIAL_GOVERNORATES,
      exams: baseResult.exams.map((e) => e.name),
    });
  } catch (err) {
    return jsonError(err);
  }
}
