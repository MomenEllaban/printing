import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getDriveContextWithRoot } from "@/lib/auth";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { getSettings } from "@/lib/settings";
import { buildExamFileName, resolveAvailableName, resolveUploadFolder, validateUploadInput, type ExamUploadMeta } from "@/lib/upload";
import { isValidFileName } from "@/lib/file-utils";
import { AppError } from "@/lib/errors";
import { toDriveItem } from "@/lib/drive";
import { syncDriveItems } from "@/lib/metadata";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

const MAX_DIRECT_SERVER_BYTES = 4.2 * 1024 * 1024; // 4.2 MB limit for serverless body

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "upload:direct", 60, 60_000);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new AppError("No file uploaded", { status: 400, code: "invalidRequest" });
    }

    const requestedParentId = (formData.get("parentId") as string | null) || undefined;
    const examMetaRaw = formData.get("examMetadata");
    let examMetadata: ExamUploadMeta | undefined = undefined;
    if (typeof examMetaRaw === "string") {
      try {
        examMetadata = JSON.parse(examMetaRaw);
      } catch {}
    }

    const name = file.name;
    const mimeType = file.type?.trim() || "application/octet-stream";
    const size = file.size;

    if (!isValidFileName(name)) {
      throw new AppError("Invalid file name", { code: "invalidFileName" });
    }

    const settings = await getSettings();
    validateUploadInput({ name, mimeType, size }, settings);

    if (size > MAX_DIRECT_SERVER_BYTES) {
      throw new AppError("File is too large for direct server fallback upload (max 4.2 MB).", {
        status: 413,
        code: "fileTooLarge",
      });
    }

    const targetName = buildExamFileName(name, examMetadata);

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const parentId = await resolveUploadFolder(
      drive,
      rootFolderId,
      settings,
      requestedParentId,
      {
        name: targetName,
        mimeType,
      },
      examMetadata,
    );
    const finalName = await resolveAvailableName(drive, parentId, targetName, settings.upload.duplicateBehavior);

    const arrayBuffer = await file.arrayBuffer();
    const stream = Readable.from(Buffer.from(arrayBuffer));

    const response = await drive.files.create({
      requestBody: {
        name: finalName,
        mimeType,
        parents: [parentId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id,name,mimeType,size,fileExtension,modifiedTime,createdTime,webViewLink,thumbnailLink,iconLink,parents",
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new AppError("Google Drive upload failed", { status: 502, code: "uploadInit" });
    }

    const item = toDriveItem(response.data);
    await syncDriveItems([item]);
    invalidateCache("stats:");

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

