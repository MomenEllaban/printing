import type { drive_v3 } from "googleapis";
import type { Breadcrumb, DriveItem, DriveStats, FileCategory } from "./types";
import {
  CATEGORY_MIME_FILTERS,
  EXCEL_MIMES,
  IMAGE_MIMES,
  MIME,
  WORD_MIMES,
  categoryFor,
  escapeDriveQuery,
  extensionOf,
  isGoogleWorkspaceFile,
  EXPORT_FORMATS,
} from "./file-utils";
import { AppError } from "./errors";
import { DRIVE_FILE_FIELDS } from "./google";

const FOLDER_MIME = MIME.folder;

export function toDriveItem(file: drive_v3.Schema$File, favoriteIds?: Set<string>): DriveItem {
  const mimeType = file.mimeType ?? "application/octet-stream";
  const isFolder = mimeType === FOLDER_MIME;
  const name = file.name ?? "(untitled)";
  return {
    id: file.id ?? "",
    name,
    mimeType,
    size: file.size ? Number(file.size) : 0,
    extension: extensionOf(name, mimeType),
    modifiedTime: file.modifiedTime ?? null,
    createdTime: file.createdTime ?? null,
    webViewLink: file.webViewLink ?? null,
    thumbnailLink: file.thumbnailLink ?? null,
    iconLink: file.iconLink ?? null,
    isFolder,
    category: isFolder ? "folder" : categoryFor(mimeType, name),
    isFavorite: file.id ? favoriteIds?.has(file.id) : false,
  };
}

function mimeCondition(category: FileCategory): string {
  if (category === "other") {
    const known = [MIME.pdf, ...EXCEL_MIMES, ...WORD_MIMES, ...IMAGE_MIMES];
    return `mimeType != '${FOLDER_MIME}' and ${known.map((mime) => `mimeType != '${mime}'`).join(" and ")}`;
  }
  const mimes = CATEGORY_MIME_FILTERS[category].split(",");
  return `(${mimes.map((mime) => `mimeType = '${mime}'`).join(" or ")})`;
}

export interface ListOptions {
  pageSize?: number;
  pageToken?: string | null;
  sort?: string;
  category?: FileCategory | null;
  search?: string | null;
  foldersOnly?: boolean;
  includeFolders?: boolean;
}

function buildOrderBy(sort?: string): string | undefined {
  switch (sort) {
    case "name_asc":
      return "folder,name";
    case "name_desc":
      return "folder,name desc";
    case "size_asc":
      return "size";
    case "size_desc":
      return "size desc";
    case "modified_asc":
      return "modifiedTime";
    case "modified_desc":
      return "modifiedTime desc";
    default:
      return "folder,modifiedTime desc";
  }
}

export async function listFolder(drive: drive_v3.Drive, folderId: string, options: ListOptions = {}) {
  const conditions = [`'${escapeDriveQuery(folderId)}' in parents`, "trashed = false"];
  if (options.category) {
    conditions.push(mimeCondition(options.category));
  }
  if (options.foldersOnly) {
    conditions.push(`mimeType = '${FOLDER_MIME}'`);
  } else if (options.includeFolders === false) {
    conditions.push(`mimeType != '${FOLDER_MIME}'`);
  }
  const q = conditions.join(" and ");
  const response = await drive.files.list({
    q,
    pageSize: Math.min(options.pageSize ?? 24, 100),
    pageToken: options.pageToken ?? undefined,
    orderBy: buildOrderBy(options.sort),
    fields: `nextPageToken, files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return {
    files: response.data.files ?? [],
    nextPageToken: response.data.nextPageToken ?? null,
  };
}

export async function searchFiles(drive: drive_v3.Drive, options: ListOptions = {}) {
  const conditions = ["trashed = false"];
  if (options.category) conditions.push(mimeCondition(options.category));
  if (options.search) conditions.push(`name contains '${escapeDriveQuery(options.search)}'`);
  if (options.foldersOnly) conditions.push(`mimeType = '${FOLDER_MIME}'`);
  else if (options.includeFolders === false) conditions.push(`mimeType != '${FOLDER_MIME}'`);
  const response = await drive.files.list({
    q: conditions.join(" and "),
    pageSize: Math.min(options.pageSize ?? 24, 100),
    pageToken: options.pageToken ?? undefined,
    orderBy: buildOrderBy(options.sort),
    fields: `nextPageToken, files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return {
    files: response.data.files ?? [],
    nextPageToken: response.data.nextPageToken ?? null,
  };
}

export async function listRecentFiles(drive: drive_v3.Drive, days = 30, options: ListOptions = {}) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const conditions = [`trashed = false`, `mimeType != '${FOLDER_MIME}'`, `modifiedTime > '${threshold}'`];
  if (options.category) conditions.push(mimeCondition(options.category));
  if (options.search) conditions.push(`name contains '${escapeDriveQuery(options.search)}'`);
  const response = await drive.files.list({
    q: conditions.join(" and "),
    pageSize: Math.min(options.pageSize ?? 24, 100),
    pageToken: options.pageToken ?? undefined,
    orderBy: "modifiedTime desc",
    fields: `nextPageToken, files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return {
    files: response.data.files ?? [],
    nextPageToken: response.data.nextPageToken ?? null,
  };
}

export async function getFileMeta(drive: drive_v3.Drive, fileId: string): Promise<drive_v3.Schema$File> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: DRIVE_FILE_FIELDS,
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new AppError("File not found", { status: 404, code: "fileNotFound" });
    return response.data;
  } catch (error) {
    const candidate = error as { code?: number };
    if (candidate.code === 404) {
      throw new AppError("File not found", { status: 404, code: "fileNotFound" });
    }
    throw error;
  }
}

export async function getFilesByIds(drive: drive_v3.Drive, ids: string[]): Promise<drive_v3.Schema$File[]> {
  const results: drive_v3.Schema$File[] = [];
  const concurrency = 6;
  for (let index = 0; index < ids.length; index += concurrency) {
    const chunk = ids.slice(index, index + concurrency);
    const settled = await Promise.all(
      chunk.map(async (id) => {
        try {
          return await getFileMeta(drive, id);
        } catch {
          return null;
        }
      }),
    );
    for (const file of settled) if (file) results.push(file);
  }
  return results;
}

export async function buildBreadcrumbs(
  drive: drive_v3.Drive,
  rootId: string | null,
  folderId: string | null,
): Promise<{ currentFolder: Breadcrumb | null; breadcrumbs: Breadcrumb[] }> {
  if (!folderId) return { currentFolder: null, breadcrumbs: [] };
  const chain: Breadcrumb[] = [];
  let cursor: string | null = folderId;
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor) && chain.length < 12) {
    seen.add(cursor);
    let file: drive_v3.Schema$File;
    try {
      file = await getFileMeta(drive, cursor);
    } catch {
      break;
    }
    chain.unshift({ id: cursor, name: file.name ?? "…" });
    if (cursor === rootId) break;
    cursor = file.parents?.[0] ?? null;
  }

  const currentFolder = chain.length ? chain[chain.length - 1] : null;
  return { currentFolder, breadcrumbs: chain };
}

export async function createFolder(drive: drive_v3.Drive, name: string, parentId: string) {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: DRIVE_FILE_FIELDS,
    supportsAllDrives: true,
  });
  return response.data;
}

export async function updateFile(
  drive: drive_v3.Drive,
  fileId: string,
  changes: { name?: string; parentId?: string; currentParentId?: string | null },
) {
  const response = await drive.files.update({
    fileId,
    requestBody: changes.name ? { name: changes.name } : {},
    addParents: changes.parentId,
    removeParents: changes.parentId ? changes.currentParentId ?? undefined : undefined,
    fields: DRIVE_FILE_FIELDS,
    supportsAllDrives: true,
  });
  return response.data;
}

export async function deleteFile(drive: drive_v3.Drive, fileId: string) {
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function ensureRootFolder(
  drive: drive_v3.Drive,
  preferredRootId?: string | null,
): Promise<string> {
  if (preferredRootId) {
    try {
      const file = await getFileMeta(drive, preferredRootId);
      if (file.mimeType !== FOLDER_MIME) {
        throw new AppError("Configured root folder is not a folder", { code: "invalidRequest" });
      }
      return preferredRootId;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Configured root folder is not accessible", {
        code: "fileNotFound",
        status: 404,
      });
    }
  }

  const existing = await drive.files.list({
    q: `name = 'File Manager App' and mimeType = '${FOLDER_MIME}' and 'root' in parents and trashed = false`,
    fields: `files(${DRIVE_FILE_FIELDS})`,
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (existing.data.files?.length) {
    return existing.data.files[0].id!;
  }

  const created = await createFolder(drive, "File Manager App", "root");
  if (!created.id) throw new AppError("Could not create the app folder", { code: "invalidRequest" });
  return created.id;
}

const DEFAULT_FOLDERS = ["PDF", "Excel", "Documents", "Images", "Other Files"];

export async function ensureDefaultFolders(drive: drive_v3.Drive, rootId: string): Promise<void> {
  const existing = await drive.files.list({
    q: `'${escapeDriveQuery(rootId)}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 100,
    supportsAllDrives: true,
  });
  const existingNames = new Set((existing.data.files ?? []).map((file) => file.name));
  for (const name of DEFAULT_FOLDERS) {
    if (!existingNames.has(name)) {
      await createFolder(drive, name, rootId);
    }
  }
}

export async function computeStats(drive: drive_v3.Drive, rootId: string): Promise<DriveStats> {
  const stats: DriveStats = {
    totalFiles: 0,
    totalFolders: 0,
    pdfCount: 0,
    excelCount: 0,
    wordCount: 0,
    imageCount: 0,
    otherCount: 0,
    storageUsed: null,
    storageLimit: null,
    rootFolderId: rootId,
    scope: "app-folder",
  };

  const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
  const visited = new Set<string>();
  let pages = 0;

  while (queue.length > 0 && pages < 40 && visited.size < 500) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    let pageToken: string | undefined;
    let folderPages = 0;
    do {
      const response = await drive.files.list({
        q: `'${escapeDriveQuery(current.id)}' in parents and trashed = false`,
        fields: `nextPageToken, files(id,name,mimeType,size)`,
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      pages += 1;
      folderPages += 1;
      for (const file of response.data.files ?? []) {
        if (file.mimeType === FOLDER_MIME) {
          stats.totalFolders += 1;
          if (current.depth < 6) queue.push({ id: file.id!, depth: current.depth + 1 });
        } else {
          stats.totalFiles += 1;
          const category = categoryFor(file.mimeType ?? "", file.name ?? "");
          if (category === "pdf") stats.pdfCount += 1;
          else if (category === "excel") stats.excelCount += 1;
          else if (category === "word") stats.wordCount += 1;
          else if (category === "image") stats.imageCount += 1;
          else stats.otherCount += 1;
        }
      }
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken && folderPages < 5);
  }

  try {
    const about = await drive.about.get({ fields: "storageQuota" });
    const quota = about.data.storageQuota;
    stats.storageUsed = quota?.usage ? Number(quota.usage) : null;
    stats.storageLimit = quota?.limit ? Number(quota.limit) : null;
  } catch (error) {
    console.warn("[drive] could not read storage quota", error);
  }

  return stats;
}

export async function verifyDriveConnection(drive: drive_v3.Drive, rootId: string | null) {
  const about = await drive.about.get({ fields: "user(displayName,emailAddress),storageQuota(usage,limit)" });
  if (rootId) {
    await getFileMeta(drive, rootId);
  }
  return {
    email: about.data.user?.emailAddress ?? null,
    displayName: about.data.user?.displayName ?? null,
    storageUsed: about.data.storageQuota?.usage ? Number(about.data.storageQuota.usage) : null,
    storageLimit: about.data.storageQuota?.limit ? Number(about.data.storageQuota.limit) : null,
  };
}

export async function searchFolders(drive: drive_v3.Drive, search?: string) {
  const conditions = [`mimeType = '${FOLDER_MIME}'`, "trashed = false"];
  if (search) conditions.push(`name contains '${escapeDriveQuery(search)}'`);
  const response = await drive.files.list({
    q: conditions.join(" and "),
    pageSize: 50,
    orderBy: "name",
    fields: `files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files ?? [];
}

export interface ResolvedExport {
  mimeType: string;
  extension: string;
}

export function resolveExportFormat(mimeType: string, requested?: string | null): ResolvedExport | null {
  const formats = EXPORT_FORMATS[mimeType];
  if (!formats) return null;
  if (requested) {
    const found = formats.find(
      (format) => format.extension === requested.toLowerCase() || format.mime === requested,
    );
    if (found) return { mimeType: found.mime, extension: found.extension };
  }
  const first = formats[0];
  return { mimeType: first.mime, extension: first.extension };
}

export function needsExport(mimeType: string): boolean {
  return isGoogleWorkspaceFile(mimeType);
}

export function exportDownloadUrl(fileId: string, mimeType: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(mimeType)}&supportsAllDrives=true`;
}

export function mediaDownloadUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
}
