import { config } from "dotenv";
config();

import { getDriveContextWithRoot, getConnection } from "../src/lib/auth";
import { EST_REFERENCE_DATA } from "../src/lib/stickers/est-reference-data";
import { createFolder, searchFolders } from "../src/lib/drive";
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

  // Target path: File Manager App (root) -> December 2026 -> EST 1
  console.log("Step 1: Ensuring 'December 2026' under root...");
  const dec2026Id = await getOrCreateChildFolder(drive, rootFolderId, "December 2026", cache);

  console.log("Step 2: Ensuring 'EST 1' under 'December 2026'...");
  const est1Id = await getOrCreateChildFolder(drive, dec2026Id, "EST 1", cache);

  console.log("Step 3: Creating EST hierarchy under 'EST 1'...");
  const processedRooms = new Set<string>();
  let count = 0;

  for (const row of EST_REFERENCE_DATA) {
    const govId = await getOrCreateChildFolder(drive, est1Id, row.governorate, cache);
    const centerId = await getOrCreateChildFolder(drive, govId, row.testCenter, cache);
    const buildingId = await getOrCreateChildFolder(drive, centerId, row.building, cache);
    const floorId = await getOrCreateChildFolder(drive, buildingId, row.floor, cache);

    const roomKey = `${floorId}:::${row.room.trim().toLowerCase()}`;
    if (!processedRooms.has(roomKey)) {
      await getOrCreateChildFolder(drive, floorId, row.room, cache);
      processedRooms.add(roomKey);
      count++;
    }
  }

  console.log(`\n🎉 Successfully completed! Created / verified ${count} rooms across ${cache.size} folders!`);
}

main().catch((err) => {
  console.error("Error seeding folders:", err);
  process.exit(1);
});

