import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fm_session";
export const OAUTH_STATE_COOKIE = "fm_oauth_state";
export const OAUTH_RETURN_COOKIE = "fm_oauth_return";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 24) {
    throw new Error("SESSION_SECRET is missing or too short (min 24 characters).");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sid: crypto.randomUUID(), kind: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "session";
  } catch {
    return false;
  }
}

export interface PendingUpload {
  name: string;
  parentFolderId: string;
  mimeType: string;
  size: number;
}

export async function signPendingUpload(payload: PendingUpload): Promise<string> {
  return new SignJWT({ ...payload, kind: "upload" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret());
}

export async function verifyPendingUpload(token: string): Promise<PendingUpload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "upload") return null;
    return {
      name: String(payload.name),
      parentFolderId: String(payload.parentFolderId),
      mimeType: String(payload.mimeType),
      size: Number(payload.size),
    };
  } catch {
    return null;
  }
}

export async function createState(): Promise<string> {
  return crypto.randomUUID();
}
