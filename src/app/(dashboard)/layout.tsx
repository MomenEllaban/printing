import { redirect } from "next/navigation";
import { AppShell, type ShellConnection } from "@/components/app-shell";
import { ProfileProvider } from "@/components/profile-provider";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";
import { getActiveProfile, getRawProfileCookie } from "@/lib/profile-server";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const rawProfile = await getRawProfileCookie();
  if (!rawProfile) {
    redirect("/login");
  }

  const [locale, settings, profile] = await Promise.all([
    getLocale(),
    getSettings(),
    getActiveProfile(),
  ]);

  let connection = null;
  try {
    connection = await getConnection();
  } catch (error) {
    console.error("[layout] could not read connection", error);
  }

  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;

  const shellConnection: ShellConnection = {
    connected,
    email: connection?.accountEmail ?? null,
    demo,
  };

  return (
    <ProfileProvider initialProfile={profile}>
      <AppShell appName={settings.general.appName} locale={locale} connection={shellConnection}>
        {children}
      </AppShell>
    </ProfileProvider>
  );
}
