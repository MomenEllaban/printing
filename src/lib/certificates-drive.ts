import type { drive_v3 } from "googleapis";
import { prisma } from "./prisma";
import { createFolder } from "./drive";

export const CERTIFICATES_FOLDER_NAME = "Certificate Stickers";
export const CERTIFICATES_FOLDER_SETTING_KEY = "certificates.rootFolderId";

let ensureTablePromise: Promise<void> | null = null;

export async function ensureCertificateBatchTable(): Promise<void> {
  if (ensureTablePromise) return ensureTablePromise;
  ensureTablePromise = (async () => {
    try {
      // Fast path: table exists and Prisma can query it
      await prisma.certificateStickerBatch.findFirst({ select: { id: true } });
      return;
    } catch (error: any) {
      const code = String(error?.code || "");
      const msg = String(error?.message || "").toLowerCase();
      const missing =
        code === "P2021" ||
        (msg.includes("relation") && msg.includes("does not exist")) ||
        msg.includes("certificatestickerbatch");
      if (!missing) {
        throw error;
      }
    }

    // Best-effort runtime bootstrap for environments where migration hasn't been applied yet.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CertificateStickerBatch" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "name" TEXT NOT NULL,
        "shortName" TEXT,
        "fileName" TEXT,
        "driveFileId" TEXT,
        "driveFolderId" TEXT,
        "batchType" TEXT NOT NULL DEFAULT 'uploaded',
        "sourceKey" TEXT,
        "studentsData" JSONB NOT NULL,
        "receiptsData" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CertificateStickerBatch_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CertificateStickerBatch_userId_idx" ON "CertificateStickerBatch"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CertificateStickerBatch_driveFileId_idx" ON "CertificateStickerBatch"("driveFileId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CertificateStickerBatch_sourceKey_idx" ON "CertificateStickerBatch"("sourceKey");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CertificateStickerBatch_batchType_idx" ON "CertificateStickerBatch"("batchType");`);
  })().catch((err) => {
    ensureTablePromise = null;
    throw err;
  });

  return ensureTablePromise;
}

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
