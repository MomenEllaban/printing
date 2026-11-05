import { cookies } from "next/headers";
import { getProfile, PROFILE_COOKIE, type AppProfile, type ProfileId } from "./profiles";

export async function getActiveProfile(): Promise<AppProfile> {
  const store = await cookies();
  const raw = store.get(PROFILE_COOKIE)?.value;
  return getProfile(raw);
}

export async function getRawProfileCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(PROFILE_COOKIE)?.value || null;
}

