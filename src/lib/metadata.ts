import { prisma } from "./prisma";
import { getOwnerUser, OWNER_ID } from "./auth";
import type { DriveItem } from "./types";

export async function syncDriveItems(items: DriveItem[]): Promise<void> {
  if (items.length === 0) return;
  await getOwnerUser();
  const operations = items.flatMap((item) => {
    const size = BigInt(Math.max(0, Math.trunc(item.size || 0)));
    const modifiedTime = item.modifiedTime ? new Date(item.modifiedTime) : null;
    const fileOperation = prisma.fileMetadata.upsert({
      where: { googleDriveFileId: item.id },
      update: {
        name: item.name,
        mimeType: item.mimeType,
        extension: item.extension,
        size,
        parentFolderId: null,
        modifiedTime,
        webViewLink: item.webViewLink,
        thumbnailLink: item.thumbnailLink,
        isFolder: item.isFolder,
        lastSyncedAt: new Date(),
      },
      create: {
        userId: OWNER_ID,
        googleDriveFileId: item.id,
        name: item.name,
        mimeType: item.mimeType,
        extension: item.extension,
        size,
        modifiedTime,
        webViewLink: item.webViewLink,
        thumbnailLink: item.thumbnailLink,
        isFolder: item.isFolder,
      },
    });
    if (!item.isFolder) return [fileOperation];
    const folderOperation = prisma.folderMetadata.upsert({
      where: { googleDriveFolderId: item.id },
      update: { name: item.name },
      create: {
        userId: OWNER_ID,
        googleDriveFolderId: item.id,
        name: item.name,
      },
    });
    return [fileOperation, folderOperation];
  });

  try {
    await prisma.$transaction(operations);
  } catch (error) {
    console.error("[metadata] failed to persist Drive metadata", error);
  }
}

export async function removeMetadata(fileId: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.favorite.deleteMany({ where: { googleDriveFileId: fileId } }),
      prisma.fileMetadata.deleteMany({ where: { googleDriveFileId: fileId } }),
      prisma.folderMetadata.deleteMany({ where: { googleDriveFolderId: fileId } }),
    ]);
  } catch (error) {
    console.error("[metadata] failed to remove metadata", error);
  }
}

export async function getFavoriteIds(): Promise<Set<string>> {
  try {
    const rows = await prisma.favorite.findMany({
      where: { userId: OWNER_ID },
      select: { googleDriveFileId: true },
    });
    return new Set(rows.map((row) => row.googleDriveFileId));
  } catch (error) {
    console.error("[metadata] could not load favorites", error);
    return new Set();
  }
}

export async function toggleFavorite(fileId: string): Promise<boolean> {
  await getOwnerUser();
  const existing = await prisma.favorite.findUnique({
    where: { userId_googleDriveFileId: { userId: OWNER_ID, googleDriveFileId: fileId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.favorite.create({ data: { userId: OWNER_ID, googleDriveFileId: fileId } });
  return true;
}
