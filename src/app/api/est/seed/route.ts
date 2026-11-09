import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { seedEstFolderStructure } from "@/lib/stickers/est-reference-data";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "est:seed", 10, 60_000);

    const connection = await getConnection();
    if (connection?.connectionStatus !== "connected") {
      throw new AppError("Google Drive must be connected to create EST folder structure", {
        status: 400,
        code: "invalidRequest",
      });
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const body = await request.json().catch(() => ({}));
    const scheduleName = typeof body.scheduleName === "string" ? body.scheduleName.trim() : "December 2026";
    const examName = typeof body.examName === "string" && body.examName.trim() ? body.examName.trim() : "EST 1";

    const result = await seedEstFolderStructure(drive, rootFolderId, { scheduleName, examName });

    return NextResponse.json({
      success: true,
      message: `Successfully created EST folder structure (${result.totalCreated} folders) under ${scheduleName} / ${examName}`,
      totalCreated: result.totalCreated,
      estRootId: result.estRootId,
      scheduleFolderId: result.scheduleFolderId,
    });
  } catch (err) {
    return jsonError(err);
  }
}

