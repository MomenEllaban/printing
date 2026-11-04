import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, getDriveContextWithRoot } from "@/lib/auth";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { signPendingUpload } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { resolveAvailableName, resolveUploadFolder, uploadSessionRequest, validateUploadInput } from "@/lib/upload";
import { isValidFileName } from "@/lib/file-utils";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().max(200).optional(),
  size: z.number().int().nonnegative(),
  parentId: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "upload:init", 60, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);
    if (!isValidFileName(body.name)) {
      throw new AppError("Invalid file name", { code: "invalidFileName" });
    }
    const mimeType = body.mimeType?.trim() || "application/octet-stream";
    const settings = await getSettings();
    validateUploadInput({ name: body.name, mimeType, size: body.size }, settings);

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const parentId = await resolveUploadFolder(drive, rootFolderId, settings, body.parentId, {
      name: body.name,
      mimeType,
    });
    const name = await resolveAvailableName(drive, parentId, body.name, settings.upload.duplicateBehavior);
    const accessToken = await getAccessToken();

    const uploadUrl = await uploadSessionRequest(accessToken, { name, mimeType, parentId }, body.size);
    const pendingToken = await signPendingUpload({ name, parentFolderId: parentId, mimeType, size: body.size });

    return NextResponse.json({ uploadUrl, pendingToken, name, parentId });
  } catch (error) {
    return jsonError(error);
  }
}
