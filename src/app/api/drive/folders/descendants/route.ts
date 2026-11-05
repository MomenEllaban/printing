import { NextResponse } from "next/server";
import { z } from "zod";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFolderDescendants } from "@/lib/drive";
import { getDemoDescendants, isDemoEnabled } from "@/lib/demo";
import { syncDriveItems } from "@/lib/metadata";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  folderIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:folders:descendants", 120, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";

    if (isDemoEnabled() && !connected) {
      const data = getDemoDescendants(body.folderIds);
      return NextResponse.json(data);
    }

    const { drive } = await getDriveContextWithRoot();
    const data = await getFolderDescendants(drive, body.folderIds);

    // Sync metadata asynchronously
    syncDriveItems([...data.files, ...data.folders]).catch(() => {});

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:folders:descendants", 120, 60_000);
    const params = new URL(request.url).searchParams;
    const rawIds = params.get("folderIds") || params.get("folderId") || "";
    const folderIds = rawIds.split(",").map((s) => s.trim()).filter(Boolean);

    if (folderIds.length === 0) {
      return NextResponse.json({ files: [], folders: [], descendantIds: [], folderTree: {} });
    }

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";

    if (isDemoEnabled() && !connected) {
      const data = getDemoDescendants(folderIds);
      return NextResponse.json(data);
    }

    const { drive } = await getDriveContextWithRoot();
    const data = await getFolderDescendants(drive, folderIds);
    syncDriveItems([...data.files, ...data.folders]).catch(() => {});

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}

