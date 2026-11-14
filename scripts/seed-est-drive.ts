import { config } from "dotenv";
config();

import { getDriveContextWithRoot, getConnection } from "../src/lib/auth";
import {
  OFFICIAL_EST_SCHOOLS,
  OFFICIAL_EST_CENTERS,
} from "../src/lib/stickers/est-reference-data";
import { OFFICIAL_GOVERNORATES } from "../src/app/api/est/seed/route";
import { createFolder } from "../src/lib/drive";
import type { drive_v3 } from "googleapis";

async function getOrCreateChildFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cacheKey = `${parentId}:::${name.trim().toLowerCase()}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Check if exists in drive
  const cleanName = name.trim().replace(/'/g, "\\'");
  const listRes = await drive.files.list({
    q: `'${parentId}' in parents and name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let folderId = listRes.data.files?.[0]?.id;
  if (!folderId) {
    console.log(`[+] Creating folder: "${name}" under parent: ${parentId}`);
    const created = await createFolder(drive, name.trim(), parentId);
    folderId = created.id!;
  } else {
    console.log(`[=] Found existing folder: "${name}" (${folderId})`);
  }

  cache.set(cacheKey, folderId);
  return folderId;
}

async function seedExamGovernoratesAndSchools(
  drive: drive_v3.Drive,
  examFolderId: string,
  examName: string,
  cache: Map<string, string>,
) {
  console.log(`\n========================================`);
  console.log(`Seeding Governorates, Schools & Centers for ${examName}...`);
  console.log(`========================================`);

  for (const gov of OFFICIAL_GOVERNORATES) {
    console.log(`\n--- Governorate: ${gov} ---`);
    const govFolderId = await getOrCreateChildFolder(drive, examFolderId, gov, cache);

    // 1. Seed schools in this governorate
    const schoolsInGov = OFFICIAL_EST_SCHOOLS.filter(
      (s) => s.governorate.toLowerCase() === gov.toLowerCase(),
    );

    for (const school of schoolsInGov) {
      console.log(`  [School] ${school.schoolName}`);
      const schoolId = await getOrCreateChildFolder(drive, govFolderId, school.schoolName, cache);

      for (const fl of school.floors) {
        console.log(`    -> Floor: ${fl.floorName} (${fl.rooms.length} rooms)`);
        const floorId = await getOrCreateChildFolder(drive, schoolId, fl.floorName, cache);

        for (const room of fl.rooms) {
          await getOrCreateChildFolder(drive, floorId, room, cache);
        }
      }
    }

    // 2. Seed university campuses / multi-building centers in this governorate
    const centersInGov = OFFICIAL_EST_CENTERS.filter(
      (c) => c.governorate.toLowerCase() === gov.toLowerCase(),
    );

    for (const center of centersInGov) {
      console.log(`  [Center] ${center.centerName}`);
      const centerId = await getOrCreateChildFolder(drive, govFolderId, center.centerName, cache);

      for (const bld of center.buildings) {
        console.log(`    -> Building: ${bld.buildingName}`);
        const bldId = await getOrCreateChildFolder(drive, centerId, bld.buildingName, cache);

        for (const fl of bld.floors) {
          console.log(`      -> Floor: ${fl.floorName} (${fl.rooms.length} rooms)`);
          const floorId = await getOrCreateChildFolder(drive, bldId, fl.floorName, cache);

          for (const room of fl.rooms) {
            await getOrCreateChildFolder(drive, floorId, room, cache);
          }
        }
      }
    }
  }
}

async function main() {
  console.log("Checking Google Drive connection...");
  const conn = await getConnection();
  console.log("Connection status:", conn?.connectionStatus, "email:", conn?.accountEmail);

  if (conn?.connectionStatus !== "connected") {
    console.log("Google Drive is NOT connected in the database.");
    return;
  }

  const { drive, rootFolderId } = await getDriveContextWithRoot();
  console.log("Root folder ID:", rootFolderId);

  const cache = new Map<string, string>();
  const cycles = ["December 2026", "January 2027", "March 2027"];

  for (const cycleName of cycles) {
    console.log(`\n========================================`);
    console.log(`Ensuring Cycle: "${cycleName}" under root...`);
    console.log(`========================================`);
    const cycleFolderId = await getOrCreateChildFolder(drive, rootFolderId, cycleName, cache);

    // EST 1
    console.log(`Ensuring 'EST 1' under '${cycleName}'...`);
    const est1Id = await getOrCreateChildFolder(drive, cycleFolderId, "EST 1", cache);
    await seedExamGovernoratesAndSchools(drive, est1Id, `EST 1 (${cycleName})`, cache);

    // EST 2
    console.log(`Ensuring 'EST 2' under '${cycleName}'...`);
    const est2Id = await getOrCreateChildFolder(drive, cycleFolderId, "EST 2", cache);
    await seedExamGovernoratesAndSchools(drive, est2Id, `EST 2 (${cycleName})`, cache);
  }

  console.log(`\n🎉 Successfully completed! Verified/created official EST schools structure for [${cycles.join(", ")}] across ${cache.size} total folders in Google Drive!`);
}

main().catch((err) => {
  console.error("Error seeding folders:", err);
  process.exit(1);
});
