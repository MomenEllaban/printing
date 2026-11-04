import { NextResponse } from "next/server";
import { disconnectDrive } from "@/lib/auth";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { invalidateCache } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "auth:disconnect", 10, 60_000);
    await disconnectDrive();
    invalidateCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
