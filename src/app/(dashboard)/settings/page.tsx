import type { Metadata } from "next";
import { SettingsForm, type SettingsTab } from "@/components/settings-form";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { getGoogleConfig } from "@/lib/google";
import { flattenSettings, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

const TABS: SettingsTab[] = ["general", "drive", "upload", "preview", "printing", "storage", "security"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as SettingsTab) ? (params.tab as SettingsTab) : "general";
  const [settings, connection] = await Promise.all([getSettings(), getConnection()]);
  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;
  const google = getGoogleConfig();

  return (
    <SettingsForm
      initialValues={flattenSettings(settings)}
      initialTab={tab}
      connection={
        connection
          ? {
              connected,
              accountEmail: connection.accountEmail,
              status: connection.connectionStatus,
              rootFolderId: connection.rootFolderId,
              lastConnectedAt: connection.lastConnectedAt?.toISOString() ?? null,
              lastError: connection.lastError,
            }
          : null
      }
      environment={{
        database: Boolean(process.env.DATABASE_URL),
        googleConfigured: Boolean(google.clientId && google.clientSecret),
        sessionSecret: Boolean(process.env.SESSION_SECRET),
        encryptionKey: Boolean(process.env.ENCRYPTION_KEY),
        demoMode: isDemoEnabled(),
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      }}
      demo={demo}
    />
  );
}
