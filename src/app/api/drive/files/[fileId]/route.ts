import { NextResponse } from "next/server";
import { z } from "zod";
import { getDriveContextWithRoot } from "@/lib/auth";
import { deleteFile, getFileMeta, toDriveItem, updateFile } from "@/lib/drive";
import { getDemoItem, isDemoEnabled } from "@/lib/demo";
import { getConnection } from "@/lib/auth";
import { getFavoriteIds, removeMetadata, syncDriveItems } from "@/lib/metadata";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { isValidFileName } from "@/lib/file-utils";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileId: string }> };

async function demoGuard() {
  const connection = await getConnection();
  const connected = connection?.connectionStatus === "connected";
  if (isDemoEnabled() && !connected) {
    throw new AppError("Demo data is read-only. Connect Google Drive to manage files.", {
      status: 409,
      code: "invalidRequest",
    });
  }
}

async function assertFolder(drive: Awaited<ReturnType<typeof getDriveContextWithRoot>>["drive"], folderId: string) {
  const folder = await getFileMeta(drive, folderId);
  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new AppError("Destination is not a folder", { code: "invalidRequest" });
  }
  return folder;
}

export async function GET(request: Request, context: Context) {
  try {
    await requireSession(request);
    const { fileId } = await context.params;
    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      const item = getDemoItem(fileId);
      if (!item) throw new AppError("File not found", { status: 404, code: "fileNotFound" });
      const favorites = await getFavoriteIds();
      return NextResponse.json({ ...item, isFavorite: favorites.has(item.id) });
    }
    const { drive } = await getDriveContextWithRoot();
    const file = await getFileMeta(drive, fileId);
    const favorites = await getFavoriteIds();
    return NextResponse.json(toDriveItem(file, favorites));
  } catch (error) {
    return jsonError(error);
  }
}

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    parentId: z.string().min(1).max(200).optional(),
  })
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: Request, context: Context) {
  try {
    await requireSession(request, { mutating: true });
    await demoGuard();
    enforceRateLimit(request, "drive:update", 60, 60_000);
    const { fileId } = await context.params;
    const body = await parseJson<z.infer<typeof updateSchema>>(request, updateSchema);
    if (body.name !== undefined && !isValidFileName(body.name)) {
      throw new AppError("Invalid file name", { code: "invalidFileName" });
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    if (fileId === rootFolderId && body.parentId) {
      throw new AppError("The app root folder cannot be moved", { code: "invalidRequest" });
    }
    const current = await getFileMeta(drive, fileId);

    let targetParentId: string | undefined;
    if (body.parentId) {
      if (body.parentId === fileId) {
        throw new AppError("A folder cannot be moved into itself", { code: "invalidRequest" });
      }
      await assertFolder(drive, body.parentId);
      let cursor: string | null = body.parentId;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor) && seen.size < 30) {
        if (cursor === fileId) {
          throw new AppError("A folder cannot be moved into its own subfolder", { code: "invalidRequest" });
        }
        seen.add(cursor);
        const parent = await getFileMeta(drive, cursor);
        cursor = parent.parents?.[0] ?? null;
        if (cursor === "root") break;
      }
      targetParentId = body.parentId;
    }

    const updated = await updateFile(drive, fileId, {
      name: body.name,
      parentId: targetParentId,
      currentParentId: current.parents?.[0] ?? null,
    });
    const item = toDriveItem(updated);
    await syncDriveItems([item]);
    invalidateCache("stats:");
    return NextResponse.json(item);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireSession(request, { mutating: true });
    await demoGuard();
    enforceRateLimit(request, "drive:delete", 30, 60_000);
    const { fileId } = await context.params;
    const { drive, rootFolderId } = await getDriveContextWithRoot();
    if (fileId === rootFolderId) {
      throw new AppError("The app root folder cannot be deleted", { code: "invalidRequest" });
    }
    await deleteFile(drive, fileId);
    await removeMetadata(fileId);
    invalidateCache("stats:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
