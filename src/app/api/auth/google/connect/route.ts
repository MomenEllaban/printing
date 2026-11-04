import { NextResponse } from "next/server";
import { buildConsentUrl } from "@/lib/google";
import { jsonError } from "@/lib/api-utils";
import { hasValidSession } from "@/lib/session-server";
import { UnauthorizedError } from "@/lib/errors";
import { OAUTH_RETURN_COOKIE, OAUTH_STATE_COOKIE, createState } from "@/lib/session";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/settings?tab=drive";
  return value;
}

export async function GET(request: Request) {
  try {
    if (!(await hasValidSession())) throw new UnauthorizedError();
    const url = new URL(request.url);
    const state = await createState();
    const response = NextResponse.redirect(buildConsentUrl(state));
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
    response.cookies.set(OAUTH_RETURN_COOKIE, safeReturnTo(url.searchParams.get("returnTo")), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
