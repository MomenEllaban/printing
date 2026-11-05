import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SettingsForm, type SettingsTab } from "@/components/settings-form";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { getGoogleConfig } from "@/lib/google";
import { flattenSettings, getSettings } from "@/lib/settings";
import { getActiveProfile } from "@/lib/profile-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

const TABS: SettingsTab[] = ["general", "drive", "upload", "preview", "printing", "storage", "security"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const activeProfile = await getActiveProfile();
  if (!activeProfile.isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center animate-in fade-in-50">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          قسم الإعدادات مخصص لمدير النظام (البرنتنج)
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          أنت مسجل حالياً بحساب (<strong className="text-foreground">{activeProfile.nameAr}</strong>). إعدادات النظام ومفاتيح الربط وبيانات Google Drive متاحة فقط لحساب البرنتنج.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition-all cursor-pointer"
          >
            التبديل إلى حساب البرنتنج (الإدارة)
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-soft transition-all cursor-pointer"
          >
            العودة للملفات
          </Link>
        </div>
      </div>
    );
  }

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
