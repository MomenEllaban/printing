import { AppShell, type ShellConnection } from "@/components/app-shell";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, settings] = await Promise.all([getLocale(), getSettings()]);

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
    <AppShell appName={settings.general.appName} locale={locale} connection={shellConnection}>
      {children}
    </AppShell>
  );
}
