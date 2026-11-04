import { NextResponse } from "next/server";
import { z } from "zod";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta } from "@/lib/drive";
import { isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { getSettings, updateSettings } from "@/lib/settings";
import { isGoogleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const settings = await getSettings();
    const connection = await getConnection();
    return NextResponse.json({
      settings,
      configured: isGoogleConfigured(),
      demo: isDemoEnabled() && connection?.connectionStatus !== "connected",
      connection: connection
        ? {
            connected: connection.connectionStatus === "connected",
            accountEmail: connection.accountEmail,
            rootFolderId: connection.rootFolderId,
            lastConnectedAt: connection.lastConnectedAt,
          }
        : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "settings:update", 40, 60_000);
    const body = await parseJson<Record<string, unknown>>(request, z.record(z.string(), z.unknown()));

    const rootValue = body["storage.rootFolderId"];
    if (typeof rootValue === "string" && rootValue.trim()) {
      const connection = await getConnection();
      if (connection?.connectionStatus === "connected") {
        const { drive } = await getDriveContextWithRoot();
        try {
          const folder = await getFileMeta(drive, rootValue.trim());
          if (folder.mimeType !== "application/vnd.google-apps.folder") {
            throw new AppError("The selected root item is not a folder", {
              status: 422,
              code: "invalidRequest",
            });
          }
        } catch (error) {
          if (error instanceof AppError && error.code === "invalidRequest") throw error;
          throw new AppError("The selected root folder is not accessible", {
            status: 422,
            code: "fileNotFound",
          });
        }
      }
    }

    const result = await updateSettings(body);
    if (Object.keys(result.errors).length > 0) {
      return NextResponse.json(
        { errors: result.errors, message: "Some settings are invalid" },
        { status: 422 },
      );
    }
    return NextResponse.json({ settings: result.settings, errors: {} });
  } catch (error) {
    return jsonError(error);
  }
}
