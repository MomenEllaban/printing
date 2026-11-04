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
  HardDrive,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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

const SIDEBAR_COLLAPSED_KEY = "fm_sidebar_collapsed";

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
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const setDesktopCollapsed = (val: boolean) => {
    setCollapsed(val);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(val));
    } catch {
      // ignore
    }
  };

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setOpen((prev) => !prev);
    } else {
      setDesktopCollapsed(!collapsed);
    }
  };

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

  // Full expanded sidebar (for desktop expanded & mobile drawer)
  const fullSidebar = (
    <div className="flex h-full flex-col gap-5 overflow-y-auto scrollbar-thin px-4 py-5">
      <div className="flex items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-3 min-w-0" onClick={() => setOpen(false)}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/20">
            <HardDrive className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight">{appName}</span>
            <span className="block truncate text-[11px] text-muted">{t("app.tagline")}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDesktopCollapsed(true)}
          className="icon-btn size-8 shrink-0 text-muted hover:text-foreground hidden lg:flex"
          title={t("sidebar.collapse")}
          aria-label={t("sidebar.collapse")}
        >
          <PanelLeftClose className="size-4.5" />
        </button>
      </div>

      <nav className="space-y-5">
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
              className={cn(
                "nav-link",
                isActive(pathname, { href: "/settings", labelKey: "nav.settings", icon: Settings }) &&
                  "nav-link-active",
              )}
            >
              <Settings className="size-[18px]" />
              <span className="truncate">{t("nav.settings")}</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-2 pt-3 border-t border-border/40">
        {!connection.connected && !connection.demo && (
          <Link href="/settings?tab=drive" className="btn-primary mb-2 w-full py-2 text-xs">
            {t("common.connectGoogle")}
          </Link>
        )}
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

  // Compact collapsed sidebar (for desktop collapsed icon-rail)
  const collapsedSidebar = (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto scrollbar-thin px-2 py-5">
      <Link href="/" className="flex items-center justify-center" title={appName}>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/20">
          <HardDrive className="size-5" />
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setDesktopCollapsed(false)}
        className="icon-btn size-8 rounded-lg text-muted hover:text-foreground"
        title={t("sidebar.expand")}
        aria-label={t("sidebar.expand")}
      >
        <PanelLeftOpen className="size-4.5" />
      </button>

      <div className="w-full my-1 border-t border-border/60" />

      <nav className="flex w-full flex-col gap-1">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.labelKey)}
              className={cn(
                "nav-link justify-center px-0 py-2.5 rounded-xl",
                isActive(pathname, item) && "nav-link-active",
              )}
            >
              <Icon className="size-[20px]" />
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        <div className="w-full my-2 border-t border-border/60" />

        {secondaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.labelKey)}
              className={cn(
                "nav-link justify-center px-0 py-2.5 rounded-xl",
                isActive(pathname, item) && "nav-link-active",
              )}
            >
              <Icon className="size-[20px]" />
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        <Link
          href="/settings"
          title={t("nav.settings")}
          className={cn(
            "nav-link justify-center px-0 py-2.5 rounded-xl",
            isActive(pathname, { href: "/settings", labelKey: "nav.settings", icon: Settings }) &&
              "nav-link-active",
          )}
        >
          <Settings className="size-[20px]" />
          <span className="sr-only">{t("nav.settings")}</span>
        </Link>
      </nav>

      <div className="mt-auto pt-3">
        <Link
          href="/settings"
          title={t("nav.settings")}
          className="icon-btn size-9 hover:bg-surface-soft"
        >
          <Settings className="size-4 text-muted" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 start-0 z-40 hidden border-e border-border bg-surface lg:block transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[272px]",
        )}
      >
        {collapsed ? collapsedSidebar : fullSidebar}
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <aside
            className={cn(
              "absolute inset-y-0 start-0 w-[288px] max-w-[85vw] border-e border-border bg-surface shadow-2xl transition-transform duration-300",
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
            {fullSidebar}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          collapsed ? "lg:ps-[72px]" : "lg:ps-[272px]",
        )}
      >
        <header className="app-topbar sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleSidebar}
              title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
              aria-label="Toggle sidebar"
            >
              <Menu className="size-5 lg:hidden" />
              {collapsed ? (
                <PanelLeftOpen className="size-5 hidden lg:block text-accent" />
              ) : (
                <PanelLeftClose className="size-5 hidden lg:block" />
              )}
            </button>

            <form onSubmit={submitSearch} className="relative min-w-0 flex-1 max-w-xs sm:max-w-md">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                id="global-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("common.searchPlaceholder")}
                className="input h-10 w-full ps-9 pe-14 text-xs sm:text-sm"
                aria-label={t("common.search")}
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface-soft px-1.5 py-0.5 text-[10px] text-muted sm:block">
                Ctrl K
              </span>
            </form>

            <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                className="icon-btn text-[11px] font-bold"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                title={locale === "ar" ? "English" : "العربية"}
              >
                {locale === "ar" ? "EN" : "ع"}
              </button>
              <ThemeToggle />
              <Link
                href="/settings"
                className="icon-btn size-9 hover:bg-surface-soft"
                title={t("nav.settings")}
                aria-label={t("nav.settings")}
              >
                <Settings className="size-4.5 text-muted hover:text-foreground" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8 pb-20 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
