import { NextResponse } from "next/server";
import { getDriveContextWithRoot, markConnectionError, OWNER_ID } from "@/lib/auth";
import { verifyDriveConnection } from "@/lib/drive";
import { enforceRateLimit, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

const SKIP_CONNECTION_ERROR = new Set(["unauthorized", "rateLimited", "invalidRequest"]);

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "drive:test", 20, 60_000);
    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const result = await verifyDriveConnection(drive, rootFolderId);
    await prisma.googleDriveConnection.update({
      where: { userId: OWNER_ID },
      data: { connectionStatus: "connected", lastConnectedAt: new Date(), lastError: null },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    if (!SKIP_CONNECTION_ERROR.has(body.error)) {
      await markConnectionError(body.message);
    }
    return NextResponse.json(body, { status });
  }
}
