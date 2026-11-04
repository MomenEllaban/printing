import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Files,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Printer,
  Settings,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getConnection } from "@/lib/auth";
import { getDriveContext } from "@/lib/auth";
import { computeStats, listRecentFiles, toDriveItem } from "@/lib/drive";
import { demoList, demoStats, isDemoEnabled } from "@/lib/demo";
import { isGoogleConfigured } from "@/lib/google";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { formatDate, formatNumber, percent } from "@/lib/format";
import { formatBytes } from "@/lib/file-utils";
import { cached } from "@/lib/ttl-cache";
import { toErrorResponse } from "@/lib/errors";
import { getPrintedRecordsMap } from "@/lib/print-tracker";
import { FileIcon } from "@/components/file-icon";
import type { DriveItem, DriveStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  let connection = null;
  try {
    connection = await getConnection();
  } catch {
    connection = null;
  }

  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;
  const googleConfigured = isGoogleConfigured();

  let stats: DriveStats | null = null;
  let recent: DriveItem[] = [];
  let loadError: string | null = null;

  if (demo) {
    stats = demoStats();
    recent = demoList({ recent: true, pageSize: 6 }).items;
  } else if (connected) {
    try {
      const { drive, rootFolderId } = await getDriveContext();
      if (rootFolderId) {
        stats = await cached(`stats:${rootFolderId}`, 60_000, () => computeStats(drive, rootFolderId));
      }
      const list = await listRecentFiles(drive, 30, { pageSize: 6 });
      recent = list.files.map((file) => toDriveItem(file));
    } catch (error) {
      const response = toErrorResponse(error);
      loadError = response.body.error;
    }
  }

  const storagePercent = stats ? percent(stats.storageUsed, stats.storageLimit) : null;
  const dirArrow = locale === "ar" ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />;

  const printedMap = await getPrintedRecordsMap();
  const printedCount = printedMap.size;
  const totalFiles = stats?.totalFiles ?? 0;
  const remainingPrints = Math.max(0, totalFiles - printedCount);
  const printProgress = totalFiles > 0 ? Math.min(100, Math.round((printedCount / totalFiles) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("nav.dashboard")}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{t("dashboard.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("dashboard.welcome")}</p>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="badge border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-current" />
              {connection?.accountEmail ?? t("status.connected")}
            </span>
          )}
          <Link href="/files" className="btn-secondary">
            <Files className="size-4" />
            {t("dashboard.manageFiles")}
          </Link>
          <Link href="/files?upload=1" className="btn-primary">
            <CloudUpload className="size-4" />
            {t("dashboard.uploadFile")}
          </Link>
        </div>
      </div>

      {demo && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
          <Sparkles className="size-5 shrink-0" />
          <p className="min-w-0 flex-1">{t("common.demoNotice")}</p>
          <Link href="/settings?tab=drive" className="font-semibold underline underline-offset-4">
            {t("common.connectGoogle")}
          </Link>
        </div>
      )}

      {!connected && !demo && (
        <div className="card overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="size-5" />
              </div>
              <h2 className="text-lg font-bold">{t("dashboard.setupTitle")}</h2>
              <p className="max-w-2xl text-sm text-muted">{t("dashboard.setupDesc")}</p>
              <p className="text-xs font-medium text-muted">{t("dashboard.setupSteps")}</p>
              {!googleConfigured && (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {t("dashboard.connectHint")}
                </p>
              )}
            </div>
            <Link href="/settings?tab=drive" className="btn-primary">
              {t("dashboard.onboarding")}
              {dirArrow}
            </Link>
          </div>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {t("dashboard.connectionError")} — {translate(locale, `error.${loadError}` as Parameters<typeof translate>[1])}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={<Files className="size-5" />}
          label={t("dashboard.totalFiles")}
          value={stats ? formatNumber(stats.totalFiles, locale) : "—"}
          hint={t("dashboard.statsScope")}
          tone="teal"
        />
        <StatCard
          icon={<FolderPlus className="size-5" />}
          label={t("dashboard.totalFolders")}
          value={stats ? formatNumber(stats.totalFolders, locale) : "—"}
          hint={t("dashboard.statsScope")}
          tone="amber"
        />
        <StatCard
          icon={<FileText className="size-5" />}
          label={t("dashboard.pdfCount")}
          value={stats ? formatNumber(stats.pdfCount, locale) : "—"}
          hint={t("dashboard.statsScope")}
          tone="rose"
        />
        <StatCard
          icon={<FileSpreadsheet className="size-5" />}
          label={t("dashboard.excelCount")}
          value={stats ? formatNumber(stats.excelCount, locale) : "—"}
          hint={t("dashboard.statsScope")}
          tone="emerald"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5" />}
          label={t("dashboard.printedCount")}
          value={stats ? formatNumber(printedCount, locale) : "—"}
          hint={`${printProgress}% ${t("dashboard.storageOf")} ${t("dashboard.totalFiles")}`}
          tone="emerald"
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label={t("dashboard.remainingPrints")}
          value={stats ? formatNumber(remainingPrints, locale) : "—"}
          hint={t("print.statusPending")}
          tone="amber"
        />
      </div>

      <section className="card p-5 border-teal-500/20 bg-gradient-to-r from-teal-500/[0.04] via-surface to-sky-500/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Printer className="size-4" />
              </span>
              <h2 className="text-base font-bold">{t("dashboard.printProgress")}</h2>
            </div>
            <p className="text-xs text-muted">
              {translate(locale, "dashboard.printCompletion")
                .replace("{printed}", formatNumber(printedCount, locale))
                .replace("{total}", formatNumber(totalFiles, locale))
                .replace("{percent}", formatNumber(printProgress, locale))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="size-3.5" />
              {t("print.statusPrinted")}: {formatNumber(printedCount, locale)}
            </span>
            <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
              <Clock className="size-3.5" />
              {t("dashboard.remainingPrints")}: {formatNumber(remainingPrints, locale)}
            </span>
            <Link href="/files?printStatus=pending" className="btn-secondary text-xs py-1.5 px-3">
              {t("dashboard.viewRemaining")}
              {dirArrow}
            </Link>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 transition-all duration-500"
              style={{ width: `${printProgress}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">{t("dashboard.recentFiles")}</h2>
              <p className="text-xs text-muted">{t("dashboard.statsScope")}</p>
            </div>
            <Link href="/recent" className="text-xs font-semibold text-accent hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
              {t("common.noFiles")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((file) => (
                <li key={file.id} className="flex items-center gap-3 py-3">
                  <FileIcon category={file.category} extension={file.extension} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={file.isFolder ? `/files?folder=${file.id}` : `/preview/${file.id}`} className="block truncate text-sm font-semibold hover:text-accent">
                      {file.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatBytes(file.size, locale)} · {formatDate(file.modifiedTime, locale)}
                    </p>
                  </div>
                  <span className="chip hidden sm:inline-flex">{file.extension?.toUpperCase() ?? t("common.folder")}</span>
                  {!file.isFolder && (
                    <a
                      href={`/api/drive/files/${file.id}/content?download=1`}
                      className="icon-btn size-9"
                      title={t("common.download")}
                    >
                      <HardDrive className="size-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">{t("dashboard.storageUsed")}</h2>
              <span className="chip">
                {stats?.storageLimit ? formatBytes(stats.storageLimit, locale) : t("dashboard.storageUnknown")}
              </span>
            </div>
            <p className="text-2xl font-black">
              {stats?.storageUsed !== null && stats?.storageUsed !== undefined
                ? formatBytes(stats.storageUsed, locale)
                : t("dashboard.storageUnknown")}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500"
                style={{ width: `${storagePercent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {storagePercent !== null ? `${storagePercent}%` : "—"} {t("dashboard.storageOf")}{" "}
              {stats?.storageLimit ? formatBytes(stats.storageLimit, locale) : t("dashboard.storageUnknown")}
            </p>
            {stats?.scope === "demo" && <p className="mt-2 text-[11px] font-medium text-sky-600 dark:text-sky-300">{t("common.demo")}</p>}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">{t("dashboard.quickActions")}</h2>
              <Settings className="size-4 text-muted" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/files?upload=1" icon={<CloudUpload className="size-5" />} label={t("common.upload")} />
              <QuickAction href="/files?newFolder=1" icon={<FolderPlus className="size-5" />} label={t("common.newFolder")} />
              <QuickAction href="/files" icon={<Files className="size-5" />} label={t("dashboard.manageFiles")} />
              <QuickAction href="/settings" icon={<Settings className="size-5" />} label={t("nav.settings")} />
              <QuickAction href="/files/images" icon={<ImageIcon className="size-5" />} label={t("nav.images")} />
              <QuickAction href="/recent" icon={<Sparkles className="size-5" />} label={t("nav.recent")} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "teal" | "amber" | "rose" | "emerald";
}) {
  const tones = {
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <div className="stat-card">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted/80">{hint}</p>
      </div>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface-soft p-3 text-xs font-semibold transition-colors hover:border-accent/40 hover:bg-surface"
    >
      <span className="text-accent">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
