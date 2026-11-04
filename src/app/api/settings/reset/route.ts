import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, jsonError, parseJson, requireSession } from "@/lib/api-utils";
import { resetSettings, SETTINGS_KEYS } from "@/lib/settings";

export const dynamic = "force-dynamic";

const schema = z.object({ keys: z.array(z.string()).max(SETTINGS_KEYS.length).optional() });

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "settings:reset", 10, 60_000);
    const body = await parseJson<z.infer<typeof schema>>(request, schema);
    const settings = await resetSettings(body.keys);
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
