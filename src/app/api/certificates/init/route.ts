import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getDriveContextWithRoot } from "@/lib/auth";
import { getOrCreateCertificatesFolder, CERTIFICATES_FOLDER_NAME } from "@/lib/certificates-drive";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "certificates:init", 30, 60_000);

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const folderId = await getOrCreateCertificatesFolder(drive, rootFolderId);

    return NextResponse.json({
      success: true,
      folderId,
      folderName: CERTIFICATES_FOLDER_NAME,
      message: "Certificates folder is ready in Google Drive",
    });
  } catch (error) {
    return jsonError(error);
  }
}
