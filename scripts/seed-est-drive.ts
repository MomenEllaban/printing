import { config } from "dotenv";
config();

import { getDriveContextWithRoot, getConnection } from "../src/lib/auth";
import { OFFICIAL_EST_SCHOOLS } from "../src/lib/stickers/est-reference-data";
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

async function seedExamSchools(
  drive: drive_v3.Drive,
  examFolderId: string,
  examName: string,
  cache: Map<string, string>,
) {
  console.log(`\n========================================`);
  console.log(`Seeding Schools for ${examName}...`);
  console.log(`========================================`);

  const schoolsFolderId = await getOrCreateChildFolder(drive, examFolderId, "Schools", cache);

  for (let s = 0; s < OFFICIAL_EST_SCHOOLS.length; s++) {
    const school = OFFICIAL_EST_SCHOOLS[s];
    console.log(`\n[${s + 1}/${OFFICIAL_EST_SCHOOLS.length}] School: ${school.fullFolderName}`);
    const schoolId = await getOrCreateChildFolder(drive, schoolsFolderId, school.fullFolderName, cache);

    for (const fl of school.floors) {
      console.log(`  -> Floor: ${fl.floorName} (${fl.rooms.length} rooms)`);
      const floorId = await getOrCreateChildFolder(drive, schoolId, fl.floorName, cache);

      for (const room of fl.rooms) {
        await getOrCreateChildFolder(drive, floorId, room, cache);
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

  // Target path: File Manager App (root) -> December 2026 -> EST 1 & EST 2
  console.log("Step 1: Ensuring 'December 2026' under root...");
  const dec2026Id = await getOrCreateChildFolder(drive, rootFolderId, "December 2026", cache);

  // EST 1
  console.log("\nStep 2: Ensuring 'EST 1' under 'December 2026'...");
  const est1Id = await getOrCreateChildFolder(drive, dec2026Id, "EST 1", cache);
  await seedExamSchools(drive, est1Id, "EST 1", cache);

  // EST 2
  console.log("\nStep 3: Ensuring 'EST 2' under 'December 2026'...");
  const est2Id = await getOrCreateChildFolder(drive, dec2026Id, "EST 2", cache);
  await seedExamSchools(drive, est2Id, "EST 2", cache);

  console.log(`\n🎉 Successfully completed! Verified/created official EST schools structure across ${cache.size} total folders in Google Drive!`);
}

main().catch((err) => {
  console.error("Error seeding folders:", err);
  process.exit(1);
});
