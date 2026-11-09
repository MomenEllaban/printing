import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, getDriveContextWithRoot } from "@/lib/auth";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { signPendingUpload } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { buildExamFileName, resolveAvailableName, resolveUploadFolder, uploadSessionRequest, validateUploadInput } from "@/lib/upload";
import { isValidFileName, mimeForFileName } from "@/lib/file-utils";
import { AppError } from "@/lib/errors";
import { getActiveProfile } from "@/lib/profile-server";

export const dynamic = "force-dynamic";

const examMetadataSchema = z.object({
  enabled: z.boolean().optional(),
  registerType: z.enum(["student", "proctor", "control"]).optional(),
  institution: z.string().max(150).optional(),
  examType: z.enum(["EST 1", "EST 2"]).optional(),
  floor: z.string().max(50).optional(),
  room: z.string().max(50).optional(),
  autoFolder: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().max(200).optional(),
  size: z.number().int().nonnegative(),
  parentId: z.string().max(200).optional(),
  examMetadata: examMetadataSchema.optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "upload:init", 60, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);
    if (!isValidFileName(body.name)) {
      throw new AppError("Invalid file name", { code: "invalidFileName" });
    }
    const rawMime = body.mimeType?.trim();
    const mimeType = (!rawMime || rawMime === "application/octet-stream" || rawMime === "binary/octet-stream")
      ? mimeForFileName(body.name, "application/octet-stream")
      : rawMime;
    const settings = await getSettings();
    validateUploadInput({ name: body.name, mimeType, size: body.size }, settings);

    // Enforce role isolation so Dina and Nabil never mix up
    const activeProfile = await getActiveProfile();
    if (activeProfile.id === "dina") {
      body.examMetadata = {
        ...(body.examMetadata || {}),
        enabled: true,
        registerType: "proctor",
        room: undefined,
      };
    } else if (activeProfile.id === "nabil") {
      body.examMetadata = {
        ...(body.examMetadata || {}),
        enabled: true,
        registerType: "student",
      };
    }

    const isExam = Boolean(body.examMetadata?.enabled);
    const targetName = isExam ? buildExamFileName(body.name, body.examMetadata) : body.name;

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const parentId = await resolveUploadFolder(
      drive,
      rootFolderId,
      settings,
      body.parentId,
      {
        name: targetName,
        mimeType,
      },
      isExam ? body.examMetadata : undefined,
    );
    const name = await resolveAvailableName(drive, parentId, targetName, settings.upload.duplicateBehavior);
    const accessToken = await getAccessToken();
    const origin = request.headers.get("origin") || request.headers.get("referer") || process.env.NEXT_PUBLIC_APP_URL;

    const uploadUrl = await uploadSessionRequest(accessToken, { name, mimeType, parentId }, body.size, origin);
    const pendingToken = await signPendingUpload({ name, parentFolderId: parentId, mimeType, size: body.size });

    return NextResponse.json({ uploadUrl, pendingToken, name, parentId });
  } catch (error) {
    return jsonError(error);
  }
}
