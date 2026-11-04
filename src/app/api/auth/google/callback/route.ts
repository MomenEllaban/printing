import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { completeOAuth, getConnection } from "@/lib/auth";
import { OAUTH_RETURN_COOKIE, OAUTH_STATE_COOKIE } from "@/lib/session";
import { safeEqual } from "@/lib/crypto";
import { invalidateCache } from "@/lib/ttl-cache";
import { invalidateSettingsCache } from "@/lib/settings";

export const dynamic = "force-dynamic";

function redirectBase(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/settings?tab=drive";
  return value;
}

function withParam(path: string, key: string, value: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

export async function GET(request: NextRequest) {
  const base = redirectBase(request);
  const returnPath = safePath(request.cookies.get(OAUTH_RETURN_COOKIE)?.value);
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, base));
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(OAUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (error) {
    return redirect(withParam(returnPath, "oauth", "error"));
  }
  if (!expectedState || !state || !safeEqual(state, expectedState)) {
    return redirect(withParam(returnPath, "oauth", "state_error"));
  }
  if (!code) {
    return redirect(withParam(returnPath, "oauth", "missing_code"));
  }

  try {
    await completeOAuth(code);
    invalidateCache();
    invalidateSettingsCache();
    const connection = await getConnection();
    return redirect(
      withParam(withParam(returnPath, "oauth", "connected"), "account", connection?.accountEmail ?? ""),
    );
  } catch (failure) {
    console.error("[oauth] callback failed", failure);
    return redirect(withParam(returnPath, "oauth", "error"));
  }
}
