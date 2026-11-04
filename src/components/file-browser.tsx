"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  FolderPlus,
  Grid2X2,
  List,
  Loader2,
  MoreVertical,
  Move,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, EmptyState, Input, Modal, Select, Spinner } from "./ui";
import { UploadDialog } from "./upload-dialog";
import { FolderPicker } from "./folder-picker";
import { FileIcon } from "./file-icon";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/file-utils";
import { formatDate, formatNumber } from "@/lib/format";
import { parseExamInfoFromFileName } from "@/lib/exam-utils";
import type { Breadcrumb, DriveItem, DriveListResult, FileCategory, Locale } from "@/lib/types";

export type BrowserMode = "all" | "category" | "recent" | "favorites";

interface FileBrowserProps {
  mode: BrowserMode;
  category?: FileCategory;
  title: string;
  subtitle?: string;
  initialFolderId?: string | null;
  initialSearch?: string;
  initialSort: string;
  initialView: "grid" | "list";
  itemsPerPage: number;
  demo: boolean;
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  allowMultiple: boolean;
  autoOpenUpload?: boolean;
}

const VIEW_STORAGE_KEY = "fm_view";

function subscribeViewChange(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredView(): "grid" | "list" | null {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "grid" || stored === "list" ? stored : null;
  } catch {
    return null;
  }
}

const SORTS = [
  "modified_desc",
  "modified_asc",
  "name_asc",
  "name_desc",
  "size_desc",
  "size_asc",
] as const;

const CATEGORIES: { value: "" | FileCategory; labelKey: "common.all" | "common.category.pdf" | "common.category.excel" | "common.category.word" | "common.category.image" | "common.category.other" }[] = [
  { value: "", labelKey: "common.all" },
  { value: "pdf", labelKey: "common.category.pdf" },
  { value: "excel", labelKey: "common.category.excel" },
  { value: "word", labelKey: "common.category.word" },
  { value: "image", labelKey: "common.category.image" },
  { value: "other", labelKey: "common.category.other" },
];

function sortLabelKey(sort: string) {
  switch (sort) {
    case "modified_asc":
      return "common.sortModifiedAsc";
    case "name_asc":
      return "common.sortNameAsc";
    case "name_desc":
      return "common.sortNameDesc";
    case "size_desc":
      return "common.sortSizeDesc";
    case "size_asc":
      return "common.sortSizeAsc";
    default:
      return "common.sortModifiedDesc";
  }
}

function ExamBadges({ name }: { name: string }) {
  const info = parseExamInfoFromFileName(name);
  if (!info) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {info.examType && (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
          {info.examType}
        </span>
      )}
      {info.registerType === "proctor" && (
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          📋 Proctor Register
        </span>
      )}
      {info.registerType === "student" && (
        <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
          🎓 Student Register
        </span>
      )}
      {info.floor && (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          دور {info.floor}
        </span>
      )}
      {info.room && (
        <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
          روم {info.room}
        </span>
      )}
    </div>
  );
}

export function FileBrowser({
  mode,
  category,
  title,
  subtitle,
  initialFolderId,
  initialSearch,
  initialSort,
  initialView,
  itemsPerPage,
  demo,
  maxUploadSizeMb,
  allowedExtensions,
  allowMultiple,
  autoOpenUpload,
}: FileBrowserProps) {
  const { t, locale, dir } = useI18n();
  const router = useRouter();

  const [items, setItems] = useState<DriveItem[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Breadcrumb | null>(null);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
  const [search, setSearch] = useState(initialSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch?.trim() ?? "");
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState<"grid" | "list">(initialView);
  const storedView = useSyncExternalStore(subscribeViewChange, getStoredView, () => null);
  const effectiveView = storedView ?? view;
  const [categoryFilter, setCategoryFilter] = useState<"" | FileCategory>(category ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(demo);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(Boolean(autoOpenUpload));
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DriveItem | null>(null);
  const [moving, setMoving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const setViewMode = (next: "grid" | "list") => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const buildParams = useCallback(
    (pageToken?: string | null) => {
      const params = new URLSearchParams();
      if (mode === "recent") params.set("recent", "1");
      else if (mode === "favorites") params.set("favorites", "1");
      else {
        if (folderId) params.set("folder", folderId);
        const activeCategory = mode === "category" ? category : categoryFilter;
        if (activeCategory) params.set("category", activeCategory);
      }
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("sort", sort);
      params.set("pageSize", String(itemsPerPage));
      if (pageToken) params.set("pageToken", pageToken);
      return params;
    },
    [category, categoryFilter, debouncedSearch, folderId, itemsPerPage, mode, sort],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/drive/files?${buildParams().toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as DriveListResult & { message?: string; error?: string };
        if (!response.ok) throw new Error(data.message || t("common.error"));
        setItems(data.items ?? []);
        setNextToken(data.nextPageToken ?? null);
        setBreadcrumbs(data.breadcrumbs ?? []);
        setCurrentFolder(data.currentFolder ?? null);
        setDemoActive(Boolean(data.demo));
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : t("common.error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [buildParams, refreshKey, t]);

  const loadMore = async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/drive/files?${buildParams(nextToken).toString()}`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as DriveListResult & { message?: string };
      if (!response.ok) throw new Error(data.message || t("common.error"));
      setItems((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...(data.items ?? []).filter((item) => !ids.has(item.id))];
      });
      setNextToken(data.nextPageToken ?? null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = () => setRefreshKey((value) => value + 1);

  const navigateFolder = (id: string | null) => {
    setFolderId(id);
    setSearch("");
    setDebouncedSearch("");
    setMenuId(null);
    if (mode === "all") {
      const url = id ? `/files?folder=${encodeURIComponent(id)}` : "/files";
      window.history.replaceState(null, "", url);
    }
  };

  const openItem = (item: DriveItem) => {
    if (item.isFolder) navigateFolder(item.id);
    else router.push(`/preview/${item.id}`);
  };

  const requireWritable = (): boolean => {
    if (demoActive) {
      toast.error(t("common.demoReadOnly"));
      return false;
    }
    return true;
  };

  const toggleFavorite = async (item: DriveItem) => {
    if (favoriteBusy) return;
    setFavoriteBusy(item.id);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry)),
    );
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: item.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(data.favorite ? t("common.favoriteAdded") : t("common.favoriteRemoved"));
      if (mode === "favorites" && !data.favorite) {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }
    } catch (cause) {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: item.isFavorite } : entry)),
      );
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setFavoriteBusy(null);
    }
  };

  const submitNewFolder = async () => {
    if (!requireWritable()) return;
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: mode === "all" && folderId ? folderId : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.folderName"));
      setNewFolderName("");
      setNewFolderOpen(false);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setCreating(false);
    }
  };

  const submitRename = async () => {
    if (!renameTarget || !requireWritable()) return;
    if (!renameValue.trim() || renameValue.trim() === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setRenaming(true);
    try {
      const response = await fetch(`/api/drive/files/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.renamed"));
      setRenameTarget(null);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setRenaming(false);
    }
  };

  const submitMove = async (destinationId: string) => {
    if (!moveTarget || !requireWritable()) return;
    setMoving(true);
    try {
      const response = await fetch(`/api/drive/files/${moveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: destinationId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.moved"));
      setMoveTarget(null);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setMoving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget || !requireWritable()) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/drive/files/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.deleted"));
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  const subtitleText = useMemo(() => {
    if (subtitle) return subtitle;
    if (mode === "favorites") return t("favorites.subtitle");
    if (mode === "recent") return t("recent.subtitle");
    if (currentFolder) return t("files.folderSubtitle");
    return t("files.subtitle");
  }, [currentFolder, mode, subtitle, t]);

  const showBreadcrumbs = (mode === "all" || mode === "category") && breadcrumbs.length > 0;
  const backTarget = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            {mode === "favorites" ? t("nav.favorites") : mode === "recent" ? t("nav.recent") : t("nav.allFiles")}
          </p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{currentFolder?.name || title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitleText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showBreadcrumbs && backTarget && (
            <Button variant="secondary" onClick={() => navigateFolder(backTarget.id)}>
              {dir === "rtl" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
              {t("common.back")}
            </Button>
          )}
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button variant="secondary" onClick={() => setNewFolderOpen(true)} disabled={demoActive}>
            <FolderPlus className="size-4" />
            {t("common.newFolder")}
          </Button>
          <Button onClick={() => setUploadOpen(true)} disabled={demoActive}>
            <CloudUpload className="size-4" />
            {t("common.upload")}
          </Button>
        </div>
      </div>

      {demoActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
          <span className="min-w-0 flex-1">{t("common.demoNotice")}</span>
          <Link href="/settings?tab=drive" className="font-semibold underline underline-offset-4">
            {t("common.connectGoogle")}
          </Link>
        </div>
      )}

      {showBreadcrumbs && (
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-muted/50">/</span>}
              <button
                type="button"
                onClick={() => navigateFolder(crumb.id)}
                className={cn(
                  "rounded-lg px-1.5 py-0.5 hover:bg-surface-strong hover:text-foreground",
                  currentFolder?.id === crumb.id && "font-semibold text-foreground",
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("common.searchPlaceholder")}
              className="h-10 ps-9 pe-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-strong"
                aria-label={t("common.clearFilters")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {mode === "all" && (
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as "" | FileCategory)}
              className="h-10 w-auto min-w-[130px]"
              aria-label={t("common.filters")}
            >
              {CATEGORIES.map((entry) => (
                <option key={entry.value || "all"} value={entry.value}>
                  {t(entry.labelKey)}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-10 w-auto min-w-[150px]"
            aria-label={t("common.sortBy")}
          >
            {SORTS.map((entry) => (
              <option key={entry} value={entry}>
                {t(sortLabelKey(entry))}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1 rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn("rounded-lg p-1.5", effectiveView === "grid" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
              title={t("common.viewGrid")}
              aria-label={t("common.viewGrid")}
            >
              <Grid2X2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("rounded-lg p-1.5", effectiveView === "list" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
              title={t("common.viewList")}
              aria-label={t("common.viewList")}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        {(search || categoryFilter || (mode === "all" && folderId)) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              {t("common.showing")} {formatNumber(items.length, locale as Locale)} {t("common.items")}
            </span>
            {(search || categoryFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                }}
                className="inline-flex items-center gap-1 rounded-full bg-surface-strong px-2 py-0.5 font-medium hover:bg-border"
              >
                <X className="size-3" />
                {t("common.clearFilters")}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button variant="secondary" onClick={refresh}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="card h-36 animate-pulse bg-surface-soft" />
          ))}
        </div>
      ) : items.length === 0 && !loading ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title={
            debouncedSearch
              ? t("files.searchEmptyTitle")
              : mode === "favorites"
                ? t("favorites.emptyTitle")
                : mode === "recent"
                  ? t("recent.emptyTitle")
                  : t("files.emptyTitle")
          }
          description={
            debouncedSearch
              ? t("files.searchEmptyHint")
              : mode === "favorites"
                ? t("favorites.emptyHint")
                : mode === "recent"
                  ? t("recent.emptyHint")
                  : t("files.emptyHint")
          }
          action={
            !demoActive && mode !== "favorites" && mode !== "recent" ? (
              <Button onClick={() => setUploadOpen(true)}>
                <UploadCloud className="size-4" />
                {t("common.upload")}
              </Button>
            ) : undefined
          }
        />
      ) : effectiveView === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="file-card">
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => openItem(item)} className="min-w-0 text-start">
                  <FileIcon category={item.category} extension={item.extension} size="lg" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(item)}
                    disabled={favoriteBusy === item.id}
                    className={cn("icon-btn size-8", item.isFavorite && "text-amber-500")}
                    title={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
                    aria-label={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
                  >
                    <Star className={cn("size-4", item.isFavorite && "fill-current")} />
                  </button>
                  <ItemMenu
                    item={item}
                    open={menuId === item.id}
                    onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                    onClose={() => setMenuId(null)}
                    onPreview={() => openItem(item)}
                    onRename={() => {
                      if (!requireWritable()) return;
                      setRenameTarget(item);
                      setRenameValue(item.name);
                      setMenuId(null);
                    }}
                    onMove={() => {
                      if (!requireWritable()) return;
                      setMoveTarget(item);
                      setMenuId(null);
                    }}
                    onDelete={() => {
                      if (!requireWritable()) return;
                      setDeleteTarget(item);
                      setMenuId(null);
                    }}
                    demo={demoActive}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <button type="button" onClick={() => openItem(item)} className="block w-full truncate text-start text-sm font-semibold hover:text-accent">
                  {item.name}
                </button>
                <ExamBadges name={item.name} />
                <p className="mt-0.5 truncate text-xs text-muted">
                  {item.isFolder ? t("common.folder") : formatBytes(item.size, locale as Locale)} ·{" "}
                  {formatDate(item.modifiedTime, locale as Locale)}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-1.5">
                <button type="button" onClick={() => openItem(item)} className="chip hover:bg-border">
                  {item.isFolder ? t("common.open") : t("common.preview")}
                </button>
                {!item.isFolder && (
                  <a
                    href={`/api/drive/files/${item.id}/content?download=1`}
                    className="icon-btn ms-auto size-8"
                    title={t("common.download")}
                    aria-label={t("common.download")}
                  >
                    <Download className="size-4" />
                  </a>
                )}
                {item.isDemo && <span className="chip">{t("common.demo")}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft text-start text-xs text-muted">
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileName")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileType")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileSize")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.modified")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-soft/60">
                    <td className="max-w-[340px] px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileIcon category={item.category} extension={item.extension} size="sm" />
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => openItem(item)} className="truncate text-start font-medium hover:text-accent block max-w-full">
                            {item.name}
                          </button>
                          <ExamBadges name={item.name} />
                        </div>
                        {item.isFavorite && <Star className="size-3.5 shrink-0 fill-current text-amber-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {item.isFolder ? t("common.folder") : (item.extension || "—").toUpperCase()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                      {item.isFolder ? "—" : formatBytes(item.size, locale as Locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDate(item.modifiedTime, locale as Locale)}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => void toggleFavorite(item)}
                          className={cn("icon-btn size-8", item.isFavorite && "text-amber-500")}
                          title={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
                        >
                          <Star className={cn("size-4", item.isFavorite && "fill-current")} />
                        </button>
                        {!item.isFolder && (
                          <a
                            href={`/print/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn size-8"
                            title={t("common.print")}
                          >
                            <Printer className="size-4" />
                          </a>
                        )}
                        {!item.isFolder && (
                          <a
                            href={`/api/drive/files/${item.id}/content?download=1`}
                            className="icon-btn size-8"
                            title={t("common.download")}
                          >
                            <Download className="size-4" />
                          </a>
                        )}
                        <ItemMenu
                          item={item}
                          open={menuId === item.id}
                          onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                          onClose={() => setMenuId(null)}
                          onPreview={() => openItem(item)}
                          onRename={() => {
                            if (!requireWritable()) return;
                            setRenameTarget(item);
                            setRenameValue(item.name);
                            setMenuId(null);
                          }}
                          onMove={() => {
                            if (!requireWritable()) return;
                            setMoveTarget(item);
                            setMenuId(null);
                          }}
                          onDelete={() => {
                            if (!requireWritable()) return;
                            setDeleteTarget(item);
                            setMenuId(null);
                          }}
                          demo={demoActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nextToken && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetFolderId={mode === "all" ? folderId : null}
        targetFolderName={mode === "all" ? currentFolder?.name ?? null : null}
        demo={demoActive}
        maxUploadSizeMb={maxUploadSizeMb}
        allowedExtensions={allowedExtensions}
        allowMultiple={allowMultiple}
        onUploaded={refresh}
      />

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title={t("common.newFolder")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewFolderOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void submitNewFolder()} loading={creating} disabled={!newFolderName.trim()}>
              {t("common.createFolder")}
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="new-folder-name">
          {t("common.folderName")}
        </label>
        <Input
          id="new-folder-name"
          autoFocus
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitNewFolder();
          }}
          placeholder={t("common.folderName")}
        />
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={t("common.renameItem")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void submitRename()} loading={renaming} disabled={!renameValue.trim()}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="rename-value">
          {t("common.newName")}
        </label>
        <Input
          id="rename-value"
          autoFocus
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitRename();
          }}
        />
      </Modal>

      <FolderPicker
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        onSelect={(destination) => void submitMove(destination)}
        title={t("common.moveTo")}
        excludeIds={moveTarget ? [moveTarget.id] : []}
      />
      {moving && (
        <div className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-lg">
          <Spinner className="size-4" />
          {t("common.loading")}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void submitDelete()}
        title={t("common.deleteConfirmTitle")}
        description={`${deleteTarget?.name ?? ""} — ${t("common.deleteConfirm")}`}
        confirmLabel={t("common.delete")}
        loading={deleting}
      />
    </div>
  );
}

function ItemMenu({
  item,
  open,
  onToggle,
  onClose,
  onPreview,
  onRename,
  onMove,
  onDelete,
  demo,
}: {
  item: DriveItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  demo: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="icon-btn size-8"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.actions")}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label={t("common.close")} onClick={onClose} />
          <div
            role="menu"
            className="absolute end-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl"
          >
            <button type="button" role="menuitem" className="menu-item" onClick={() => { onPreview(); onClose(); }}>
              <Eye className="size-4" />
              {item.isFolder ? t("common.open") : t("common.preview")}
            </button>
            <button type="button" role="menuitem" className="menu-item" onClick={onRename} disabled={demo}>
              <Pencil className="size-4" />
              {t("common.rename")}
            </button>
            <button type="button" role="menuitem" className="menu-item" onClick={onMove} disabled={demo}>
              <Move className="size-4" />
              {t("common.move")}
            </button>
            {!item.isFolder && (
              <a
                role="menuitem"
                className="menu-item"
                href={`/api/drive/files/${item.id}/content?download=1`}
                onClick={onClose}
              >
                <Download className="size-4" />
                {t("common.download")}
              </a>
            )}
            {!item.isFolder && (
              <Link
                role="menuitem"
                className="menu-item"
                href={`/print/${item.id}`}
                target="_blank"
                onClick={onClose}
              >
                <Printer className="size-4" />
                {t("common.print")}
              </Link>
            )}
            {item.webViewLink && (
              <a
                role="menuitem"
                className="menu-item"
                href={item.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                <ExternalLink className="size-4" />
                {t("common.openInDrive")}
              </a>
            )}
            <button type="button" role="menuitem" className="menu-item menu-item-danger" onClick={onDelete} disabled={demo}>
              <Trash2 className="size-4" />
              {t("common.delete")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
