"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
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
  Printer,
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
import { useActiveProfile } from "./profile-provider";
import { AccountMenu } from "./account-menu";

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
  color: string;
  bgColor: string;
  activeBg: string;
}

const primaryNav: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    exact: true,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10 dark:bg-indigo-500/20",
    activeBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/25",
  },
  {
    href: "/files",
    labelKey: "nav.allFiles",
    icon: Files,
    exact: true,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10 dark:bg-sky-500/20",
    activeBg: "bg-sky-600 text-white shadow-md shadow-sky-500/25",
  },
  {
    href: "/pending-print",
    labelKey: "nav.pendingPrint",
    icon: Printer,
    exact: true,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    activeBg: "bg-amber-600 text-white shadow-md shadow-amber-500/25",
  },
  {
    href: "/logistics",
    labelKey: "nav.logistics",
    icon: Boxes,
    exact: true,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10 dark:bg-indigo-500/20",
    activeBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/25",
  },
  {
    href: "/files/pdf",
    labelKey: "nav.pdfFiles",
    icon: FileText,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10 dark:bg-rose-500/20",
    activeBg: "bg-rose-600 text-white shadow-md shadow-rose-500/25",
  },
  {
    href: "/files/excel",
    labelKey: "nav.excelFiles",
    icon: FileSpreadsheet,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
    activeBg: "bg-emerald-600 text-white shadow-md shadow-emerald-500/25",
  },
  {
    href: "/files/word",
    labelKey: "nav.wordDocs",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    activeBg: "bg-blue-600 text-white shadow-md shadow-blue-500/25",
  },
  {
    href: "/files/images",
    labelKey: "nav.images",
    icon: FileImage,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
    activeBg: "bg-purple-600 text-white shadow-md shadow-purple-500/25",
  },
];

const secondaryNav: NavItem[] = [
  {
    href: "/recent",
    labelKey: "nav.recent",
    icon: Clock,
    exact: true,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    activeBg: "bg-amber-600 text-white shadow-md shadow-amber-500/25",
  },
  {
    href: "/favorites",
    labelKey: "nav.favorites",
    icon: Star,
    exact: true,
    color: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    activeBg: "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25",
  },
];

const settingsItem: NavItem = {
  href: "/settings",
  labelKey: "nav.settings",
  icon: Settings,
  color: "text-teal-600 dark:text-teal-400",
  bgColor: "bg-teal-500/10 dark:bg-teal-500/20",
  activeBg: "bg-teal-600 text-white shadow-md shadow-teal-500/25",
};

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
  const { activeProfile } = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const brandName = appName && appName !== "مدير الملفات" && appName !== "File Manager" ? appName : t("app.name");

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
    <div className="flex h-full flex-col gap-5 overflow-y-auto scrollbar-thin px-3 py-5">
      <div className="flex items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setOpen(false)}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-md shadow-teal-500/20">
            <HardDrive className="size-5" />
          </span>
          <span className="truncate text-base font-black tracking-tight">{brandName}</span>
        </Link>
        <button
          type="button"
          onClick={() => setDesktopCollapsed(true)}
          className="icon-btn size-8 shrink-0 text-muted hover:text-foreground hidden lg:flex cursor-pointer"
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
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all cursor-pointer",
                    active
                      ? cn(item.activeBg)
                      : "text-muted hover:bg-surface-soft hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform",
                      active
                        ? "bg-white/20 text-white"
                        : cn(item.bgColor, item.color, "group-hover:scale-110"),
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
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
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all cursor-pointer",
                    active
                      ? cn(item.activeBg)
                      : "text-muted hover:bg-surface-soft hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform",
                      active
                        ? "bg-white/20 text-white"
                        : cn(item.bgColor, item.color, "group-hover:scale-110"),
                    )}
                  >
                    <Icon className={cn("size-4", item.href === "/favorites" && "fill-current")} />
                  </span>
                  <span className="truncate">{t(item.labelKey)}</span>
                </Link>
              );
            })}
            {activeProfile.isAdmin && (() => {
              const Icon = settingsItem.icon;
              const active = isActive(pathname, settingsItem);
              return (
                <Link
                  href={settingsItem.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all cursor-pointer",
                    active
                      ? cn(settingsItem.activeBg)
                      : "text-muted hover:bg-surface-soft hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform",
                      active
                        ? "bg-white/20 text-white"
                        : cn(settingsItem.bgColor, settingsItem.color, "group-hover:scale-110"),
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate">{t(settingsItem.labelKey)}</span>
                </Link>
              );
            })()}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-2 pt-3 border-t border-border/40">
        {/* Active Profile Card in Sidebar */}
        <div className="rounded-xl border border-border/60 bg-surface-soft p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm shadow-xs",
                activeProfile.color,
              )}
            >
              {activeProfile.avatar}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {locale === "ar" ? activeProfile.nameAr : activeProfile.nameEn}
              </p>
              <p className="text-[10px] text-muted truncate">
                {locale === "ar" ? activeProfile.badgeAr : activeProfile.badgeEn}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-[10px] font-bold text-accent hover:underline shrink-0 cursor-pointer"
            title={locale === "ar" ? "تبديل الحساب" : "Switch Account"}
          >
            {locale === "ar" ? "تبديل" : "Switch"}
          </Link>
        </div>
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
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto scrollbar-thin px-2 py-4">
      <Link href="/" className="flex items-center justify-center" title={brandName} aria-label={brandName}>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/20 hover:scale-105 transition-transform cursor-pointer">
          <HardDrive className="size-5" />
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setDesktopCollapsed(false)}
        className="icon-btn size-8 rounded-xl text-muted hover:text-foreground hover:bg-surface-soft cursor-pointer"
        title={t("sidebar.expand")}
        aria-label={t("sidebar.expand")}
      >
        <PanelLeftOpen className="size-4.5" />
      </button>

      <div className="w-8 my-0.5 border-t border-border/60" />

      <nav className="flex w-full flex-col items-center gap-2">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
              className={cn(
                "group relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer",
                active
                  ? cn(item.activeBg, "scale-105")
                  : cn(
                      item.bgColor,
                      item.color,
                      "hover:scale-110 hover:shadow-md",
                    ),
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform group-hover:scale-110",
                  active ? "text-white" : item.color,
                )}
              />
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        <div className="w-8 my-1 border-t border-border/60" />

        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
              className={cn(
                "group relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer",
                active
                  ? cn(item.activeBg, "scale-105")
                  : cn(
                      item.bgColor,
                      item.color,
                      "hover:scale-110 hover:shadow-md",
                    ),
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform group-hover:scale-110",
                  active ? "text-white" : item.color,
                  item.href === "/favorites" && "fill-current",
                )}
              />
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-2 flex flex-col items-center gap-2">
        {activeProfile.isAdmin && (() => {
          const Icon = settingsItem.icon;
          const active = isActive(pathname, settingsItem);
          return (
            <Link
              href={settingsItem.href}
              title={t(settingsItem.labelKey)}
              aria-label={t(settingsItem.labelKey)}
              className={cn(
                "group relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer",
                active
                  ? cn(settingsItem.activeBg, "scale-105")
                  : cn(
                      settingsItem.bgColor,
                      settingsItem.color,
                      "hover:scale-110 hover:shadow-md",
                    ),
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform group-hover:rotate-45",
                  active ? "text-white" : settingsItem.color,
                )}
              />
              <span className="sr-only">{t(settingsItem.labelKey)}</span>
            </Link>
          );
        })()}

        {/* Collapsed active profile badge */}
        <Link
          href="/login"
          title={`${locale === "ar" ? activeProfile.nameAr : activeProfile.nameEn} (${locale === "ar" ? activeProfile.badgeAr : activeProfile.badgeEn})`}
          aria-label="Switch Profile"
          className={cn(
            "flex size-9 items-center justify-center rounded-xl text-sm shadow-xs transition-transform hover:scale-110 cursor-pointer",
            activeProfile.color,
          )}
        >
          {activeProfile.avatar}
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
          collapsed ? "w-[72px]" : "w-[256px]",
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
              "absolute inset-y-0 start-0 w-[272px] max-w-[85vw] border-e border-border bg-surface shadow-2xl transition-transform duration-300",
            )}
          >
            <button
              type="button"
              className="icon-btn absolute end-3 top-4 z-10 cursor-pointer"
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
          collapsed ? "lg:ps-[72px]" : "lg:ps-[256px]",
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

            <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
              <AccountMenu />
              <button
                type="button"
                className="icon-btn text-[11px] font-bold cursor-pointer"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                title={locale === "ar" ? "English" : "العربية"}
              >
                {locale === "ar" ? "EN" : "ع"}
              </button>
              <ThemeToggle />
              {activeProfile.isAdmin && (
                <Link
                  href="/settings"
                  className="icon-btn size-9 hover:bg-surface-soft cursor-pointer"
                  title={t("nav.settings")}
                  aria-label={t("nav.settings")}
                >
                  <Settings className="size-4.5 text-muted hover:text-foreground" />
                </Link>
              )}
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
