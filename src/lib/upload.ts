import type { drive_v3 } from "googleapis";
import { AppError } from "./errors";
import { categoryFor, escapeDriveQuery, extensionOf, isAllowedUpload } from "./file-utils";
import { createFolder, getFileMeta } from "./drive";
import type { AppSettings, FileCategory } from "./types";
import type { DriveItem } from "./types";

const TYPE_FOLDERS: Record<FileCategory, string> = {
  pdf: "PDF",
  excel: "Excel",
  word: "Documents",
  image: "Images",
  video: "Videos",
  other: "Other Files",
};

export async function validateParentFolder(drive: drive_v3.Drive, folderId: string): Promise<string> {
  const folder = await getFileMeta(drive, folderId);
  const isFolder =
    folder.mimeType === "application/vnd.google-apps.folder" ||
    folder.shortcutDetails?.targetMimeType === "application/vnd.google-apps.folder";
  if (!isFolder) {
    throw new AppError("Destination is not a folder", { code: "invalidRequest" });
  }
  return folder.shortcutDetails?.targetId || folderId;
}

async function findOrCreateTypeFolder(drive: drive_v3.Drive, rootId: string, name: string): Promise<string> {
  const existing = await drive.files.list({
    q: `name = '${escapeDriveQuery(name)}' and '${escapeDriveQuery(rootId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
  });
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id;
  const created = await createFolder(drive, name, rootId);
  if (!created.id) throw new AppError("Could not create the destination folder", { code: "invalidRequest" });
  return created.id;
}

import { buildExamFileName, type ExamUploadMeta } from "./exam-utils";
export { buildExamFileName, type ExamUploadMeta } from "./exam-utils";

export async function findOrCreateNamedFolder(drive: drive_v3.Drive, parentId: string, name: string): Promise<string> {
  const existing = await drive.files.list({
    q: `name = '${escapeDriveQuery(name)}' and '${escapeDriveQuery(parentId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
  });
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id;
  const created = await createFolder(drive, name, parentId);
  if (!created.id) throw new AppError(`Could not create folder ${name}`, { code: "invalidRequest" });
  return created.id;
}

export async function resolveExamFolder(
  drive: drive_v3.Drive,
  baseFolderId: string,
  meta: ExamUploadMeta,
): Promise<string> {
  let currentParentId = baseFolderId;

  // Avoid creating a duplicate subfolder if base folder already has this name
  const parentMeta = await getFileMeta(drive, baseFolderId).catch(() => null);
  const parentName = parentMeta?.name?.trim().toLowerCase();

  const institution = meta.institution?.trim();
  if (institution && (!parentName || parentName !== institution.toLowerCase())) {
    currentParentId = await findOrCreateNamedFolder(drive, currentParentId, institution);
  }

  const examType = meta.examType?.trim();
  if (examType && (!parentName || parentName !== examType.toLowerCase())) {
    currentParentId = await findOrCreateNamedFolder(drive, currentParentId, examType);
  }

  const floor = meta.floor?.trim();
  if (floor) {
    const floorFolder = /^دور|floor/i.test(floor) ? floor : `الدور ${floor}`;
    if (!parentName || parentName !== floorFolder.toLowerCase()) {
      currentParentId = await findOrCreateNamedFolder(drive, currentParentId, floorFolder);
    }
  }

  return currentParentId;
}

export async function resolveUploadFolder(
  drive: drive_v3.Drive,
  rootId: string,
  settings: AppSettings,
  rawParentId: string | undefined,
  item: { name: string; mimeType: string },
  examMeta?: ExamUploadMeta,
): Promise<string> {
  const requestedParentId = rawParentId?.trim() || undefined;
  const baseFolder = requestedParentId ? await validateParentFolder(drive, requestedParentId) : rootId;

  // When exam metadata is not enabled, or uploading directly into a requested parent folder without autoFolder
  if (!examMeta?.enabled || (requestedParentId && !examMeta?.autoFolder)) {
    if (requestedParentId) return baseFolder;
    if (settings.upload.defaultDestinationFolderId) {
      return validateParentFolder(drive, settings.upload.defaultDestinationFolderId);
    }
    if (settings.storage.organizeByType) {
      const category = categoryFor(item.mimeType, item.name);
      const folderName = category === "folder" ? TYPE_FOLDERS.other : TYPE_FOLDERS[category];
      return findOrCreateTypeFolder(drive, rootId, folderName);
    }
    return rootId;
  }

  if (examMeta?.autoFolder && (examMeta.institution?.trim() || examMeta.floor?.trim())) {
    return resolveExamFolder(drive, baseFolder, examMeta);
  }

  if (requestedParentId) return baseFolder;
  if (settings.upload.defaultDestinationFolderId) {
    return validateParentFolder(drive, settings.upload.defaultDestinationFolderId);
  }
  if (settings.storage.organizeByType) {
    const category = categoryFor(item.mimeType, item.name);
    const folderName = category === "folder" ? TYPE_FOLDERS.other : TYPE_FOLDERS[category];
    return findOrCreateTypeFolder(drive, rootId, folderName);
  }
  return rootId;
}

export async function resolveAvailableName(
  drive: drive_v3.Drive,
  parentId: string,
  requestedName: string,
  behavior: "rename" | "skip",
): Promise<string> {
  const response = await drive.files.list({
    q: `name = '${escapeDriveQuery(requestedName)}' and '${escapeDriveQuery(parentId)}' in parents and trashed = false`,
    fields: "files(id,name)",
    pageSize: 5,
    supportsAllDrives: true,
  });
  if (!response.data.files?.length) return requestedName;
  if (behavior === "skip") {
    throw new AppError("A file with this name already exists in the destination folder", {
      status: 409,
      code: "duplicateFile",
    });
  }
  const dot = requestedName.lastIndexOf(".");
  const base = dot > 0 ? requestedName.slice(0, dot) : requestedName;
  const extension = dot > 0 ? requestedName.slice(dot) : "";
  for (let index = 1; index <= 50; index += 1) {
    const candidate = `${base} (${index})${extension}`;
    const check = await drive.files.list({
      q: `name = '${escapeDriveQuery(candidate)}' and '${escapeDriveQuery(parentId)}' in parents and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
      supportsAllDrives: true,
    });
    if (!check.data.files?.length) return candidate;
  }
  throw new AppError("Could not find an available file name", { code: "invalidRequest" });
}

export function validateUploadInput(
  input: { name: string; mimeType: string; size: number },
  settings: AppSettings,
): void {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new AppError("Empty files cannot be uploaded", { code: "invalidRequest" });
  }
  const maxBytes = settings.upload.maxUploadSizeMb * 1024 * 1024;
  if (input.size > maxBytes) {
    throw new AppError(`File exceeds the ${settings.upload.maxUploadSizeMb} MB limit`, {
      status: 413,
      code: "fileTooLarge",
    });
  }
  const allowed = isAllowedUpload(input.name, input.mimeType, settings.upload.allowedExtensions);
  if (!allowed.allowed) {
    throw new AppError(
      allowed.reason === "name" ? "Invalid file name" : "File extension is not allowed",
      { status: 415, code: allowed.reason === "name" ? "invalidFileName" : "unsupportedType" },
    );
  }
}

export async function uploadSessionRequest(
  accessToken: string,
  metadata: { name: string; mimeType: string; parentId: string },
  size: number,
  origin?: string | null,
): Promise<string> {
  const params = new URLSearchParams({
    uploadType: "resumable",
    supportsAllDrives: "true",
    fields:
      "id,name,mimeType,size,fileExtension,modifiedTime,createdTime,webViewLink,thumbnailLink,iconLink,parents",
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": metadata.mimeType,
    "X-Upload-Content-Length": String(size),
  };
  if (origin) {
    try {
      headers["Origin"] = new URL(origin).origin;
    } catch {
      headers["Origin"] = origin.trim();
    }
  }
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: metadata.name,
      mimeType: metadata.mimeType,
      parents: [metadata.parentId],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[upload] resumable session failed", response.status, text.slice(0, 300));
    throw new AppError("Could not start the upload with Google Drive", { status: 502, code: "uploadInit" });
  }
  const location = response.headers.get("location");
  if (!location) {
    throw new AppError("Google Drive did not return an upload URL", { status: 502, code: "uploadInit" });
  }
  return location;
}

export function itemFromDriveFile(file: drive_v3.Schema$File): DriveItem {
  const mimeType = file.mimeType ?? "application/octet-stream";
  const name = file.name ?? "untitled";
  const extension = file.fileExtension ?? extensionOf(name, mimeType);
  const isFolder = mimeType === "application/vnd.google-apps.folder" && !file.fileExtension && !extension;
  return {
    id: file.id ?? "",
    name,
    mimeType,
    size: file.size ? Number(file.size) : 0,
    extension,
    modifiedTime: file.modifiedTime ?? null,
    createdTime: file.createdTime ?? null,
    webViewLink: file.webViewLink ?? null,
    thumbnailLink: file.thumbnailLink ?? null,
    iconLink: file.iconLink ?? null,
    isFolder,
    category: isFolder ? "folder" : categoryFor(mimeType, name),
  };
}
