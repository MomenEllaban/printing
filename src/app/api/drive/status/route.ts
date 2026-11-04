import { NextResponse } from "next/server";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { isGoogleConfigured } from "@/lib/google";
import { jsonError, requireSession } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    return NextResponse.json({
      connected,
      configured: isGoogleConfigured(),
      demo: isDemoEnabled() && !connected,
      accountEmail: connection?.accountEmail ?? null,
      status: connection?.connectionStatus ?? "disconnected",
      rootFolderId: connection?.rootFolderId ?? null,
      lastConnectedAt: connection?.lastConnectedAt?.toISOString() ?? null,
      lastError: connection?.lastError ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
