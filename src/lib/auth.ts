import type { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./crypto";
import { createOAuthClient, driveClient, fetchAccountEmail } from "./google";
import { AppError, DriveNotConnectedError, GoogleNotConfiguredError } from "./errors";
import { getSettings } from "./settings";

export const OWNER_ID = "owner";

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
  accountEmail?: string | null;
}

export async function getOwnerUser() {
  return prisma.user.upsert({
    where: { id: OWNER_ID },
    update: {},
    create: {
      id: OWNER_ID,
      email: process.env.GOOGLE_ACCOUNT_EMAIL?.trim() || null,
    },
  });
}

export async function getConnection() {
  return prisma.googleDriveConnection.findUnique({ where: { userId: OWNER_ID } });
}

export async function saveTokens(tokens: StoredTokens) {
  const user = await getOwnerUser();
  const encryptedAccess = encryptSecret(tokens.accessToken);
  const encryptedRefresh = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null;
  const expiry = tokens.expiryDate ? new Date(tokens.expiryDate) : null;

  await prisma.user.update({
    where: { id: user.id },
    data: { email: tokens.accountEmail ?? user.email ?? null },
  });

  return prisma.googleDriveConnection.upsert({
    where: { userId: OWNER_ID },
    update: {
      accountEmail: tokens.accountEmail ?? undefined,
      accessToken: encryptedAccess,
      ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
      tokenExpiry: expiry,
      scope: tokens.scope ?? undefined,
      connectionStatus: "connected",
      lastConnectedAt: new Date(),
      lastError: null,
    },
    create: {
      userId: OWNER_ID,
      accountEmail: tokens.accountEmail ?? null,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry: expiry,
      scope: tokens.scope ?? null,
      connectionStatus: "connected",
      lastConnectedAt: new Date(),
    },
  });
}

export async function markConnectionError(message: string) {
  try {
    await prisma.googleDriveConnection.update({
      where: { userId: OWNER_ID },
      data: { connectionStatus: "error", lastError: message.slice(0, 500) },
    });
  } catch {
    // connection may not exist
  }
}

export async function setRootFolder(rootFolderId: string) {
  const connection = await getConnection();
  if (!connection) throw new DriveNotConnectedError();
  await prisma.googleDriveConnection.update({
    where: { userId: OWNER_ID },
    data: { rootFolderId },
  });
}

function decodeTokens(connection: {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}) {
  try {
    return {
      accessToken: decryptSecret(connection.accessToken),
      refreshToken: connection.refreshToken ? decryptSecret(connection.refreshToken) : null,
    };
  } catch (error) {
    console.error("[auth] could not decrypt stored tokens", error);
    throw new AppError("Stored credentials are invalid. Reconnect Google Drive.", {
      status: 401,
      code: "tokenRefresh",
    });
  }
}

export async function getAuthorizedOAuth(): Promise<{
  oauth: OAuth2Client;
  connection: NonNullable<Awaited<ReturnType<typeof getConnection>>>;
}> {
  const connection = await getConnection();
  if (!connection || connection.connectionStatus === "disconnected") {
    throw new DriveNotConnectedError();
  }

  let tokens: { accessToken: string; refreshToken: string | null };
  try {
    tokens = decodeTokens(connection);
  } catch (error) {
    await markConnectionError("Could not decrypt stored tokens");
    throw error;
  }

  const oauth = createOAuthClient();
  oauth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: connection.tokenExpiry?.getTime(),
  });

  const expiresSoon = !connection.tokenExpiry || connection.tokenExpiry.getTime() < Date.now() + 60_000;
  if (expiresSoon) {
    if (!tokens.refreshToken) {
      await markConnectionError("Missing refresh token");
      throw new AppError("Google authorization expired. Reconnect your account.", {
        status: 401,
        code: "tokenRefresh",
      });
    }
    try {
      const { credentials } = await oauth.refreshAccessToken();
      oauth.setCredentials(credentials);
      const updated = await saveTokens({
        accessToken: credentials.access_token ?? tokens.accessToken,
        refreshToken: credentials.refresh_token ?? tokens.refreshToken,
        expiryDate: credentials.expiry_date ?? Date.now() + 3600_000,
        scope: credentials.scope ?? connection.scope ?? undefined,
        accountEmail: connection.accountEmail,
      });
      connection.accessToken = updated.accessToken;
      connection.refreshToken = updated.refreshToken;
      connection.tokenExpiry = updated.tokenExpiry;
    } catch (error) {
      console.error("[auth] token refresh failed", error);
      await markConnectionError("Token refresh failed");
      throw new AppError("Could not refresh Google authorization. Reconnect your account.", {
        status: 401,
        code: "tokenRefresh",
      });
    }
  }

  return { oauth, connection };
}

export async function getAccessToken(): Promise<string> {
  const { oauth } = await getAuthorizedOAuth();
  const token = oauth.credentials.access_token;
  if (!token) {
    throw new AppError("Google authorization expired. Reconnect your account.", {
      status: 401,
      code: "tokenRefresh",
    });
  }
  return token;
}

export async function getDriveContext() {
  const { oauth, connection } = await getAuthorizedOAuth();
  const drive = driveClient(oauth);
  const rootFolderId = await resolveRootFolderId(connection.rootFolderId);
  return { oauth, connection, drive, rootFolderId };
}

export async function getDriveContextWithRoot() {
  const context = await getDriveContext();
  if (context.rootFolderId) return { ...context, rootFolderId: context.rootFolderId };
  const { ensureRootFolder } = await import("./drive");
  const rootFolderId = await ensureRootFolder(context.drive, process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || null);
  await setRootFolder(rootFolderId);
  return { ...context, rootFolderId };
}

export async function resolveRootFolderId(connectionRootId?: string | null): Promise<string | null> {
  const settings = await getSettings();
  if (settings.storage.rootFolderId) return settings.storage.rootFolderId;
  const connection = connectionRootId !== undefined ? null : await getConnection();
  const stored = connectionRootId ?? connection?.rootFolderId ?? null;
  if (stored) return stored;
  const envRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  return envRoot || null;
}

export async function completeOAuth(code: string): Promise<{
  accountEmail: string | null;
  rootFolderId: string;
}> {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new GoogleNotConfiguredError();
  }
  const oauth = createOAuthClient();
  let tokens;
  try {
    const response = await oauth.getToken(code);
    tokens = response.tokens;
  } catch (error) {
    console.error("[auth] code exchange failed", error);
    throw new AppError("Google authorization failed", { status: 400, code: "oauthFailed" });
  }
  oauth.setCredentials(tokens);
  const accountEmail = await fetchAccountEmail(oauth);
  await saveTokens({
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
    accountEmail,
  });

  const drive = driveClient(oauth);
  const { ensureRootFolder, ensureDefaultFolders } = await import("./drive");
  const settings = await getSettings(true);
  const configuredRoot =
    settings.storage.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || null;
  const rootFolderId = await ensureRootFolder(drive, configuredRoot);
  if (settings.storage.createDefaultFolders) {
    await ensureDefaultFolders(drive, rootFolderId);
  }
  await setRootFolder(rootFolderId);
  return { accountEmail, rootFolderId };
}

export async function disconnectDrive(): Promise<void> {
  const connection = await getConnection();
  if (connection?.refreshToken) {
    try {
      const tokens = decodeTokens(connection);
      if (tokens.refreshToken) {
        const oauth = createOAuthClient();
        await oauth.revokeToken(tokens.refreshToken);
      }
    } catch (error) {
      console.warn("[auth] token revocation failed, continuing with local disconnect", error);
    }
  }
  await prisma.googleDriveConnection.deleteMany({ where: { userId: OWNER_ID } });
}
