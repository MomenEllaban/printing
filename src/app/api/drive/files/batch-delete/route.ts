import { NextResponse } from "next/server";
import { z } from "zod";
import { getDriveContextWithRoot, getConnection } from "@/lib/auth";
import { deleteFile } from "@/lib/drive";
import { removeMetadata } from "@/lib/metadata";
import { unmarkFilesAsPrinted } from "@/lib/print-tracker";
import { deleteDemoRecord, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { invalidateCache } from "@/lib/ttl-cache";
import { getActiveProfile } from "@/lib/profile-server";

export const dynamic = "force-dynamic";

const schema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });

    const activeProfile = await getActiveProfile();
    if (!activeProfile.canDelete) {
      throw new AppError("حذف الملفات متاح للحسابات المصرح لها فقط", {
        status: 403,
        code: "forbidden",
      });
    }

    const body = await parseJson<z.infer<typeof schema>>(request, schema);

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      body.fileIds.forEach((id) => deleteDemoRecord(id));
      await Promise.all([
        ...body.fileIds.map((id) => removeMetadata(id)),
        unmarkFilesAsPrinted(body.fileIds),
      ]);
      return NextResponse.json({ ok: true, deleted: body.fileIds.length });
    }

    enforceRateLimit(request, "drive:batch-delete", 30, 60_000);

    const { drive, rootFolderId } = await getDriveContextWithRoot();

    let deletedCount = 0;
    const errors: string[] = [];

    for (const fileId of body.fileIds) {
      if (fileId === rootFolderId) {
        errors.push("The app root folder cannot be deleted");
        continue;
      }
      try {
        await deleteFile(drive, fileId);
        await removeMetadata(fileId);
        deletedCount++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Failed to delete ${fileId}`);
      }
    }

    if (deletedCount > 0) {
      await unmarkFilesAsPrinted(body.fileIds);
    }

    invalidateCache("stats:");
    return NextResponse.json({ ok: true, deletedCount, failedCount: errors.length, errors });
  } catch (error) {
    return jsonError(error);
  }
}

