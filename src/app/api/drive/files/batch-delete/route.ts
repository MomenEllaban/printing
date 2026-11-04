import { NextResponse } from "next/server";
import { z } from "zod";
import { getDriveContextWithRoot, getConnection } from "@/lib/auth";
import { deleteFile } from "@/lib/drive";
import { removeMetadata } from "@/lib/metadata";
import { isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      throw new AppError("Demo data is read-only. Connect Google Drive to manage files.", {
        status: 409,
        code: "invalidRequest",
      });
    }

    enforceRateLimit(request, "drive:batch-delete", 30, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);

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

    invalidateCache("stats:");
    return NextResponse.json({ ok: true, deletedCount, failedCount: errors.length, errors });
  } catch (error) {
    return jsonError(error);
  }
}
