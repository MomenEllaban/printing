import { NextResponse } from "next/server";
import { z } from "zod";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta } from "@/lib/drive";
import { getDemoItem, isDemoEnabled } from "@/lib/demo";
import { getFavoriteIds, toggleFavorite } from "@/lib/metadata";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { OWNER_ID } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const rows = await prisma.favorite.findMany({
      where: { userId: OWNER_ID },
      orderBy: { createdAt: "desc" },
      select: { googleDriveFileId: true },
    });
    return NextResponse.json({ ids: rows.map((row) => row.googleDriveFileId) });
  } catch (error) {
    return jsonError(error);
  }
}

const toggleSchema = z.object({ fileId: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "favorites:toggle", 120, 60_000);
    const body = await parseJson<z.infer<typeof toggleSchema>>(request, toggleSchema);

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      if (!getDemoItem(body.fileId)) {
        throw new AppError("File not found", { status: 404, code: "fileNotFound" });
      }
    } else {
      const { drive } = await getDriveContextWithRoot();
      await getFileMeta(drive, body.fileId);
    }

    const favorite = await toggleFavorite(body.fileId);
    const ids = await getFavoriteIds();
    return NextResponse.json({ favorite, count: ids.size });
  } catch (error) {
    return jsonError(error);
  }
}
