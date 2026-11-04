"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  FileImage,
  FileSpreadsheet,
  FileText,
  Files,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { useI18n } from "./locale-provider";
import { ThemeToggle } from "./theme-toggle";

export interface ShellConnection {
  connected: boolean;
  email: string | null;
  demo: boolean;
}

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  exact?: boolean;
}

const primaryNav: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/files", labelKey: "nav.allFiles", icon: Files, exact: true },
  { href: "/files/pdf", labelKey: "nav.pdfFiles", icon: FileText },
  { href: "/files/excel", labelKey: "nav.excelFiles", icon: FileSpreadsheet },
  { href: "/files/word", labelKey: "nav.wordDocs", icon: FileText },
  { href: "/files/images", labelKey: "nav.images", icon: FileImage },
];

const secondaryNav: NavItem[] = [
  { href: "/recent", labelKey: "nav.recent", icon: Clock, exact: true },
  { href: "/favorites", labelKey: "nav.favorites", icon: Star, exact: true },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({
  children,
  appName,
  locale,
  connection,
}: {
  children: ReactNode;
  appName: string;
  locale: Locale;
  connection: ShellConnection;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/files?search=${encodeURIComponent(value)}` : "/files");
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto scrollbar-thin px-4 py-5">
      <Link href="/" className="flex items-center gap-3 px-2" onClick={() => setOpen(false)}>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/20">
          <HardDrive className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight">{appName}</span>
          <span className="block truncate text-[11px] text-muted">{t("app.tagline")}</span>
        </span>
      </Link>

      <nav className="space-y-6">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70">
            {t("nav.sectionManage")}
          </p>
          <div className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn("nav-link", isActive(pathname, item) && "nav-link-active")}
                >
                  <Icon className="size-[18px]" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70">
            {t("nav.sectionSystem")}
          </p>
          <div className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn("nav-link", isActive(pathname, item) && "nav-link-active")}
                >
                  <Icon className="size-[18px]" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn("nav-link", isActive(pathname, { href: "/settings", labelKey: "nav.settings", icon: Settings }) && "nav-link-active")}
            >
              <Settings className="size-[18px]" />
              <span className="truncate">{t("nav.settings")}</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-xl",
                connection.connected || connection.demo
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
            >
              <FolderOpen className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {connection.demo
                  ? t("common.demo")
                  : connection.connected
                    ? t("status.connected")
                    : t("status.disconnected")}
              </p>
              <p className="truncate text-[11px] text-muted" dir="ltr">
                {connection.email || (connection.demo ? "demo@drive.local" : t("common.notConnected"))}
              </p>
            </div>
          </div>
          {!connection.connected && !connection.demo && (
            <Link href="/settings?tab=drive" className="btn-primary mt-3 w-full py-2 text-xs">
              {t("common.connectGoogle")}
            </Link>
          )}
        </div>
        <p className="px-2 text-center text-[10px] text-muted/70">
          DriveDesk · Next.js + Neon
        </p>
        <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-muted/70">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <aside className="app-sidebar fixed inset-y-0 start-0 z-40 hidden w-[272px] border-e border-border bg-surface lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className={cn(
              "absolute inset-y-0 start-0 w-[288px] border-e border-border bg-surface shadow-2xl",
              locale === "ar" ? "animate-in" : "animate-in",
            )}
          >
            <button
              type="button"
              className="icon-btn absolute end-3 top-4 z-10"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:ps-[272px]">
        <header className="app-topbar sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            <form onSubmit={submitSearch} className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                id="global-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("common.searchPlaceholder")}
                className="input h-10 w-full ps-9 pe-14"
                aria-label={t("common.search")}
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface-soft px-1.5 py-0.5 text-[10px] text-muted sm:block">
                Ctrl K
              </span>
            </form>

            <div className="ms-auto flex items-center gap-1">
              <Link
                href={connection.demo ? "/settings?tab=drive" : connection.connected ? "/settings?tab=drive" : "/settings?tab=drive"}
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex",
                  connection.connected || connection.demo
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {connection.demo
                  ? t("common.demo")
                  : connection.connected
                    ? t("status.connected")
                    : t("status.disconnected")}
              </Link>
              <button
                type="button"
                className="icon-btn text-[11px] font-bold"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                title={locale === "ar" ? "English" : "العربية"}
              >
                {locale === "ar" ? "EN" : "ع"}
              </button>
              <ThemeToggle />
              <Link href="/settings" className="ms-1 flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-xs font-bold text-white" aria-label={t("nav.settings")}>
                {(connection.email?.[0] ?? "D").toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
