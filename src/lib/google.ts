import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { GoogleNotConfiguredError } from "./errors";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const DRIVE_FILE_FIELDS =
  "id,name,mimeType,size,extension,modifiedTime,createdTime,webViewLink,thumbnailLink,iconLink,parents,trashed,shortcutDetails";

export function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`,
    accountEmail: process.env.GOOGLE_ACCOUNT_EMAIL?.trim() ?? "",
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ?? "",
  };
}

export function isGoogleConfigured(): boolean {
  const config = getGoogleConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function assertGoogleConfigured(): void {
  if (!isGoogleConfigured()) {
    throw new GoogleNotConfiguredError();
  }
}

export function createOAuthClient(): OAuth2Client {
  assertGoogleConfigured();
  const config = getGoogleConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function buildConsentUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: DRIVE_SCOPES,
    state,
  });
}

export function driveClient(oauth: OAuth2Client) {
  return google.drive({ version: "v3", auth: oauth });
}

export async function fetchAccountEmail(oauth: OAuth2Client): Promise<string | null> {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const response = await oauth2.userinfo.get();
    return response.data.email ?? null;
  } catch (error) {
    console.error("[google] could not read account email", error);
    return null;
  }
}
