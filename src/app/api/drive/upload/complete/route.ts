import { NextResponse } from "next/server";
import { z } from "zod";
import { getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta, toDriveItem } from "@/lib/drive";
import { syncDriveItems } from "@/lib/metadata";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { verifyPendingUpload } from "@/lib/session";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  fileId: z.string().min(1).max(200),
  pendingToken: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "upload:complete", 120, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);
    const pending = await verifyPendingUpload(body.pendingToken);
    if (!pending) {
      throw new AppError("Upload session expired. Please retry the upload.", { status: 400, code: "uploadInit" });
    }

    const { drive } = await getDriveContextWithRoot();
    const meta = await getFileMeta(drive, body.fileId);
    if (meta.mimeType === "application/vnd.google-apps.folder") {
      throw new AppError("Uploaded item is a folder", { code: "invalidRequest" });
    }
    if (!meta.parents?.includes(pending.parentFolderId)) {
      throw new AppError("Uploaded file is not in the expected folder", { code: "invalidRequest" });
    }

    const item = toDriveItem(meta);
    await syncDriveItems([item]);
    invalidateCache("stats:");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
