import { NextResponse } from "next/server";
import { z } from "zod";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { createFolder, searchFolders, toDriveItem } from "@/lib/drive";
import { demoItems, isDemoEnabled } from "@/lib/demo";
import { syncDriveItems } from "@/lib/metadata";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { isValidFileName } from "@/lib/file-utils";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:folders", 120, 60_000);
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim() || undefined;
    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      const items = demoItems().filter(
        (item) => item.isFolder && (!search || item.name.toLowerCase().includes(search.toLowerCase())),
      );
      return NextResponse.json({ items });
    }
    const { drive } = await getDriveContextWithRoot();
    const files = await searchFolders(drive, search);
    return NextResponse.json({ items: files.map((file) => toDriveItem(file)) });
  } catch (error) {
    return jsonError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "drive:folders:create", 40, 60_000);
    const body = await parseJson<z.infer<typeof createSchema>>(request, createSchema);
    if (!isValidFileName(body.name)) {
      throw new AppError("Invalid folder name", { code: "invalidFileName" });
    }

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      throw new AppError("Demo data is read-only. Connect Google Drive to create folders.", { code: "invalidRequest" });
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const parentId = body.parentId || rootFolderId;
    const existing = await drive.files.list({
      q: `name = '${body.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and '${parentId.replace(/'/g, "\\'")}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
      supportsAllDrives: true,
    });
    if (existing.data.files?.length) {
      throw new AppError("A folder with this name already exists", { code: "duplicateFile" });
    }

    const created = await createFolder(drive, body.name, parentId);
    const item = toDriveItem(created);
    await syncDriveItems([item]);
    invalidateCache("stats:");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
