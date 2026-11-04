import { NextResponse } from "next/server";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { computeStats } from "@/lib/drive";
import { demoStats, isDemoEnabled } from "@/lib/demo";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { cached, invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:stats", 60, 60_000);
    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      return NextResponse.json(demoStats());
    }
    if (!connected) {
      return NextResponse.json({
        totalFiles: 0,
        totalFolders: 0,
        pdfCount: 0,
        excelCount: 0,
        wordCount: 0,
        imageCount: 0,
        otherCount: 0,
        storageUsed: null,
        storageLimit: null,
        rootFolderId: null,
        scope: "app-folder",
      });
    }
    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const stats = await cached(`stats:${rootFolderId}`, 60_000, () => computeStats(drive, rootFolderId));
    if (!stats.storageUsed) invalidateCache(`stats:${rootFolderId}`);
    return NextResponse.json(stats);
  } catch (error) {
    return jsonError(error);
  }
}
