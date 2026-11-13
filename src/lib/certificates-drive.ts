import type { drive_v3 } from "googleapis";
import { prisma } from "./prisma";
import { createFolder } from "./drive";

export const CERTIFICATES_FOLDER_NAME = "Certificate Stickers";
export const CERTIFICATES_FOLDER_SETTING_KEY = "certificates.rootFolderId";

async function findFolderByName(drive: drive_v3.Drive, parentId: string, name: string): Promise<string | null> {
  const escapedParent = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${escapedParent}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0]?.id || null;
}

export async function getOrCreateCertificatesFolder(drive: drive_v3.Drive, rootFolderId: string): Promise<string> {
  try {
    const setting = await prisma.applicationSetting.findUnique({ where: { key: CERTIFICATES_FOLDER_SETTING_KEY } });
    const storedId = typeof setting?.value === "string" ? setting.value : null;
    if (storedId) {
      try {
        const meta = await drive.files.get({ fileId: storedId, fields: "id,trashed,mimeType", supportsAllDrives: true });
        if (meta.data.id && !meta.data.trashed && meta.data.mimeType === "application/vnd.google-apps.folder") {
          return meta.data.id;
        }
      } catch {}
    }
  } catch {}

  const existing = await findFolderByName(drive, rootFolderId, CERTIFICATES_FOLDER_NAME);
  const folderId = existing || (await createFolder(drive, CERTIFICATES_FOLDER_NAME, rootFolderId)).id;
  if (!folderId) throw new Error("Could not create certificates folder in Google Drive");

  try {
    await prisma.applicationSetting.upsert({
      where: { key: CERTIFICATES_FOLDER_SETTING_KEY },
      update: { value: folderId, category: "certificates" },
      create: { key: CERTIFICATES_FOLDER_SETTING_KEY, value: folderId, category: "certificates" },
    });
  } catch {}

  return folderId;
}

export async function getCertificatesFolderIdIfExists(): Promise<string | null> {
  try {
    const setting = await prisma.applicationSetting.findUnique({ where: { key: CERTIFICATES_FOLDER_SETTING_KEY } });
    return typeof setting?.value === "string" ? setting.value : null;
  } catch {
    return null;
  }
}
