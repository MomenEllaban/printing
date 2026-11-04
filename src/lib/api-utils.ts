import { NextResponse } from "next/server";
import type { ZodTypeAny } from "zod";
import { AppError, UnauthorizedError, toErrorResponse } from "./errors";
import { hasValidSession } from "./session-server";
import { clientKey, rateLimit } from "./rate-limit";

export { AppError, DriveNotConnectedError, GoogleNotConfiguredError, UnauthorizedError } from "./errors";

export function jsonError(error: unknown): NextResponse {
  const { status, body } = toErrorResponse(error);
  return NextResponse.json(body, { status });
}

export async function requireSession(request: Request, options?: { mutating?: boolean }) {
  const sessionValid = await hasValidSession();
  if (!sessionValid) {
    throw new UnauthorizedError("Invalid or missing session");
  }
  if (options?.mutating) {
    assertSameOrigin(request);
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!origin) {
    throw new AppError("Missing origin header", { status: 403, code: "unauthorized" });
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new AppError("Invalid origin header", { status: 403, code: "unauthorized" });
  }
  const matchesRequest = originUrl.host === requestUrl.host;
  const matchesApp = appUrl ? originUrl.origin === new URL(appUrl).origin : false;
  if (!matchesRequest && !matchesApp) {
    throw new AppError("Cross-origin request rejected", { status: 403, code: "unauthorized" });
  }
}

export function enforceRateLimit(request: Request, scope: string, limit = 60, windowMs = 60_000): void {
  const result = rateLimit(clientKey(request, scope), limit, windowMs);
  if (!result.allowed) {
    throw new AppError("Too many requests", {
      status: 429,
      code: "rateLimited",
      expose: true,
    });
  }
}

export async function parseJson<T>(request: Request, schema: ZodTypeAny): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("Invalid JSON body", { code: "invalidRequest" });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue?.message ?? "Invalid request body", {
      code: "invalidRequest",
      status: 400,
    });
  }
  return parsed.data as T;
}

export function requireParam(value: string | null | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new AppError(`Missing ${name}`, { code: "invalidRequest" });
  }
  return value.trim();
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}
