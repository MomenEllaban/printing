import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "./session";

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  const { createSessionToken } = await import("./session");
  store.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
