"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Folder,
  FolderOpen,
  GraduationCap,
  Layers,
  List,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, EmptyState, Input, Modal, Select, Spinner } from "./ui";
import { FileIcon } from "./file-icon";
import { BatchPrintDialog } from "./batch-print-dialog";
import { StickerPreviewModal } from "./sticker-preview-modal";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/file-utils";
import { formatDate, formatNumber } from "@/lib/format";
import type { DriveItem, Locale } from "@/lib/types";
import type {
  HierarchyLevel,
  PendingFileItem,
  PendingFolderNode,
  PendingPrintResult,
} from "@/lib/pending-print";

function CheckboxInput({
  checked,
  indeterminate,
  onChange,
  onClick,
  className,
  title,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className={className}
      title={title}
      aria-label={ariaLabel}
    />
  );
}

interface LevelBadgeConfig {
  labelAr: string;
  labelEn: string;
  colorClass: string;
  icon: typeof Folder;
}

const LEVEL_CONFIG: Record<HierarchyLevel, LevelBadgeConfig> = {
  root: {
    labelAr: "الموسم / الامتحان",
    labelEn: "Exam Root",
    colorClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    icon: Layers,
  },
  governorate: {
    labelAr: "محافظة",
    labelEn: "Governorate",
    colorClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40 font-bold",
    icon: MapPin,
  },
  center: {
    labelAr: "سنتر",
    labelEn: "Center",
    colorClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-bold",
    icon: Building2,
  },
  building: {
    labelAr: "مبنى",
    labelEn: "Building",
    colorClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40 font-bold",
    icon: Building2,
  },
  floor: {
    labelAr: "دور",
    labelEn: "Floor",
    colorClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold",
    icon: ClipboardList,
  },
  room: {
    labelAr: "قاعة / لجنة",
    labelEn: "Room",
    colorClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 font-bold",
    icon: GraduationCap,
  },
  folder: {
    labelAr: "مجلد",
    labelEn: "Folder",
    colorClass: "bg-muted text-foreground border-border",
    icon: Folder,
  },
};

export function PendingPrintTree() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PendingPrintResult | null>(null);
  const [search, setSearch] = useState("");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [previewPdfState, setPreviewPdfState] = useState<{ open: boolean; url: string | null; title?: string }>({
    open: false,
    url: null,
  });

  // Fetch unprinted files hierarchy
  const loadPending = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/drive/pending-print", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load pending print files");
      const json: PendingPrintResult = await res.json();
      setData(json);

      // Auto-expand all folders on first load so user immediately sees all pending files
      const allFIds = new Set<string>();
      const collectFolderIds = (nodes: PendingFolderNode[]) => {
        for (const n of nodes) {
          allFIds.add(n.id);
          if (n.subfolders?.length) collectFolderIds(n.subfolders);
        }
      };
      collectFolderIds(json.tree || []);
      setExpandedFolderIds(allFIds);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل تحميل قائمة الملفات بانتظار الطباعة" : "Failed to load pending print files");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  // Mark single file as printed (calls /api/drive/print-status)
  const handleMarkAsPrinted = async (fileId: string, fileName?: string) => {
    setMarkingIds((prev) => new Set(prev).add(fileId));
    try {
      const res = await fetch("/api/drive/print-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          items: [{ id: fileId, name: fileName }],
          action: "mark",
        }),
      });

      if (!res.ok) throw new Error("Failed to update print status");

      toast.success(
        isAr
          ? `✓ تم تأكيد طباعة "${fileName || fileId}" وتحديث النظام بالكامل`
          : `✓ Marked "${fileName || fileId}" as printed and synced system-wide`,
      );

      // Deselect if selected
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });

      // Optimistically update local data & refresh in background
      await loadPending(true);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "حدث خطأ أثناء تحديث حالة الطباعة" : "Failed to update print status");
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  // Direct print (opens /print/[fileId] in new tab)
  const handleDirectPrint = (file: PendingFileItem) => {
    window.open(`/print/${file.id}`, "_blank");
    toast.info(
      isAr
        ? `جارٍ فتح أمر طباعة "${file.name}"... سيتم تسجيل الطباعة فوراً`
        : `Opening print view for "${file.name}"...`,
    );
  };

  // Preview file
  const handlePreview = (file: PendingFileItem) => {
    if (file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setPreviewPdfState({
        open: true,
        url: `/api/drive/files/${file.id}/content`,
        title: file.name,
      });
    } else {
      window.open(`/preview/${file.id}`, "_blank");
    }
  };

  // Toggle folder expansion
  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (!data) return;
    const all = new Set<string>();
    const collect = (nodes: PendingFolderNode[]) => {
      for (const n of nodes) {
        all.add(n.id);
        if (n.subfolders?.length) collect(n.subfolders);
      }
    };
    collect(data.tree);
    setExpandedFolderIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedFolderIds(new Set());
  };

  // Selection handlers
  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const collectFolderFileIds = (node: PendingFolderNode): string[] => {
    const ids: string[] = node.files.map((f) => f.id);
    for (const sub of node.subfolders) {
      ids.push(...collectFolderFileIds(sub));
    }
    return ids;
  };

  const toggleSelectFolder = (node: PendingFolderNode) => {
    const fileIds = collectFolderFileIds(node);
    const allSelected = fileIds.every((id) => selectedFileIds.has(id));

    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        fileIds.forEach((id) => next.delete(id));
      } else {
        fileIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Filter flat files by search query
  const filteredFlatFiles = useMemo(() => {
    if (!data?.flatFiles) return [];
    if (!search.trim()) return data.flatFiles;
    const q = search.trim().toLowerCase();
    return data.flatFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.governorate?.toLowerCase().includes(q) ||
        f.center?.toLowerCase().includes(q) ||
        f.building?.toLowerCase().includes(q) ||
        f.floor?.toLowerCase().includes(q) ||
        f.room?.toLowerCase().includes(q),
    );
  }, [data?.flatFiles, search]);

  // Convert selected items to DriveItem for BatchPrintDialog
  const selectedDriveItems: DriveItem[] = useMemo(() => {
    if (!data?.flatFiles) return [];
    return data.flatFiles
      .filter((f) => selectedFileIds.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        extension: f.extension,
        modifiedTime: f.modifiedTime,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: false,
        category: "pdf",
        parentId: f.parentId,
      }));
  }, [data?.flatFiles, selectedFileIds]);

  const selectAllFiltered = () => {
    if (selectedFileIds.size >= filteredFlatFiles.length && filteredFlatFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFlatFiles.map((f) => f.id)));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-accent" />
        <p className="text-sm text-muted">
          {isAr
            ? "جارٍ استخراج شجرة المجلدات وفحص الملفات المعلقة للطباعة..."
            : "Extracting folder tree and unprinted files..."}
        </p>
      </div>
    );
  }

  const unprintedCount = data?.unprintedCount ?? 0;
  const printedCount = data?.printedCount ?? 0;
  const totalFiles = data?.totalFiles ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <Printer className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {isAr ? "ملفات بانتظار الطباعة" : "Pending Print Files"}
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                {isAr
                  ? "استعراض هرمي شامل لجميع الكشوف والملفات غير المطبوعة عبر الفولدرات (من المحافظة حتى القاعة)"
                  : "Hierarchical view of all unprinted documents mapped across city, center, building, and rooms"}
              </p>
            </div>
          </div>
        </div>

        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedFileIds.size > 0 && (
            <Button
              variant="primary"
              onClick={() => setBatchPrintOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 text-xs sm:text-sm font-bold"
            >
              <Printer className="size-4" />
              <span>
                {isAr
                  ? `طباعة المحدد (${selectedFileIds.size})`
                  : `Print Selected (${selectedFileIds.size})`}
              </span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => void loadPending(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            title={isAr ? "تحديث حالة الطباعة" : "Refresh print status"}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            <span>{isAr ? "تحديث" : "Refresh"}</span>
          </Button>

          <Link href="/files" className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
            <FileText className="size-4" />
            <span>{isAr ? "مدير الملفات الكامل" : "All File Manager"}</span>
          </Link>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <Clock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{isAr ? "بانتظار الطباعة" : "Pending Print"}</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {formatNumber(unprintedCount, locale as Locale)}
            </p>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3 border-emerald-500/30 bg-emerald-500/5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{isAr ? "تمت طباعته" : "Printed"}</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(printedCount, locale as Locale)}
            </p>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Layers className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{isAr ? "إجمالي الملفات" : "Total Files"}</p>
            <p className="text-xl font-black text-foreground">{formatNumber(totalFiles, locale as Locale)}</p>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{isAr ? "نسبة الإنجاز" : "Progress"}</p>
            <p className="text-xl font-black text-foreground">
              {totalFiles > 0 ? Math.round((printedCount / totalFiles) * 100) : 100}%
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, View Mode, Expand/Collapse */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? "بحث باسم الملف أو المحافظة أو السنتر أو القاعة..."
                  : "Search by file name, city, center, room..."
              }
              className="ps-9 pe-9 h-10 w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* View Toggles & Expand All */}
          <div className="flex items-center gap-2">
            {viewMode === "tree" && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleExpandAll}
                  className="flex items-center gap-1 text-xs py-1 px-2.5 cursor-pointer"
                  title={isAr ? "فتح جميع المجلدات" : "Expand All Folders"}
                >
                  <Maximize2 className="size-3.5" />
                  <span className="hidden sm:inline">{isAr ? "توسيع الكل" : "Expand All"}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCollapseAll}
                  className="flex items-center gap-1 text-xs py-1 px-2.5 cursor-pointer"
                  title={isAr ? "طي جميع المجلدات" : "Collapse All Folders"}
                >
                  <Minimize2 className="size-3.5" />
                  <span className="hidden sm:inline">{isAr ? "طي الكل" : "Collapse All"}</span>
                </Button>
              </>
            )}

            <div className="inline-flex rounded-lg border border-border bg-surface-soft p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "tree" ? "bg-surface text-accent shadow-xs" : "text-muted hover:text-foreground",
                )}
              >
                <Layers className="size-3.5" />
                <span>{isAr ? "شجرة" : "Tree"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "flat" ? "bg-surface text-accent shadow-xs" : "text-muted hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
                <span>{isAr ? "قائمة تفصيلية" : "List"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        {filteredFlatFiles.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <CheckboxInput
                checked={selectedFileIds.size > 0 && selectedFileIds.size >= filteredFlatFiles.length}
                indeterminate={selectedFileIds.size > 0 && selectedFileIds.size < filteredFlatFiles.length}
                onChange={selectAllFiltered}
                className="size-4 rounded border-border accent-accent cursor-pointer"
                title={isAr ? "تحديد جميع الملفات المعروضة" : "Select all filtered files"}
              />
              <span className="font-medium">
                {isAr
                  ? `عرض ${formatNumber(filteredFlatFiles.length, locale as Locale)} ملف معلق`
                  : `Showing ${filteredFlatFiles.length} pending files`}
              </span>
            </div>

            {selectedFileIds.size > 0 && (
              <span className="font-bold text-accent">
                {isAr
                  ? `تم تحديد ${selectedFileIds.size} ملف`
                  : `${selectedFileIds.size} files selected`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content: Tree View or Flat List */}
      {unprintedCount === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">
              {isAr ? "جميع الملفات مطبوعة بالكامل! 🎉" : "All files are printed! 🎉"}
            </h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              {isAr
                ? "لا توجد أي وثائق أو كشوف معلقة بانتظار الطباعة حالياً عبر جميع المراكز والمباني والقاعات."
                : "No pending or unprinted documents found across any centers, buildings, or rooms."}
            </p>
          </div>
          <Link href="/files" className="btn-primary inline-flex items-center gap-2 text-xs font-bold px-4 py-2">
            <FileText className="size-4" />
            <span>{isAr ? "الذهاب إلى مدير الملفات" : "Open File Manager"}</span>
          </Link>
        </div>
      ) : viewMode === "flat" || search ? (
        /* Flat List View with full path pills */
        <div className="card overflow-hidden divide-y divide-border/60">
          {filteredFlatFiles.length === 0 ? (
            <div className="p-8 text-center text-muted">
              {isAr ? "لا توجد ملفات تطابق كلمة البحث." : "No files match your search query."}
            </div>
          ) : (
            filteredFlatFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-surface-soft/40 transition-colors",
                  selectedFileIds.has(file.id) && "bg-accent/5",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckboxInput
                    checked={selectedFileIds.has(file.id)}
                    onChange={() => toggleSelectFile(file.id)}
                    className="size-4 rounded border-border accent-accent cursor-pointer"
                  />
                  <div className="min-w-0 text-start">
                    <FileIcon category="pdf" extension={file.extension} size="md" />
                  </div>
                  <div className="min-w-0 space-y-1 text-start">
                    <p className="font-bold text-sm text-foreground truncate">{file.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {/* Full path pill */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-soft border border-border text-[11px] font-semibold text-muted truncate max-w-md">
                        <MapPin className="size-3 text-sky-500 shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </span>

                      <span className="text-[10px] text-muted">
                        {formatBytes(file.size)} • {formatDate(file.modifiedTime, locale as Locale)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ms-auto">
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface-soft cursor-pointer transition-all"
                    title={isAr ? `معاينة "${file.name}"` : `Preview "${file.name}"`}
                  >
                    <Eye className="size-3.5 text-muted" />
                    <span>{isAr ? "معاينة" : "Show"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectPrint(file)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs transition-all"
                    title={isAr ? `طباعة "${file.name}" مباشرة` : `Print "${file.name}"`}
                  >
                    <Printer className="size-3.5" />
                    <span>{isAr ? "طباعة" : "Print"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleMarkAsPrinted(file.id, file.name)}
                    disabled={markingIds.has(file.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer transition-all"
                    title={isAr ? "تأكيد الطباعة ومزامنة الحالة فوراً" : "Mark as printed now"}
                  >
                    {markingIds.has(file.id) ? (
                      <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Check className="size-3.5 text-emerald-600" />
                    )}
                    <span>{isAr ? "تمت الطباعة ✓" : "Mark Done"}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Hierarchical Tree View */
        <div className="card p-3 space-y-1">
          {data?.tree.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              expandedFolderIds={expandedFolderIds}
              selectedFileIds={selectedFileIds}
              markingIds={markingIds}
              onToggleExpand={toggleFolderExpand}
              onToggleSelectFile={toggleSelectFile}
              onToggleSelectFolder={toggleSelectFolder}
              onDirectPrint={handleDirectPrint}
              onMarkAsPrinted={handleMarkAsPrinted}
              onPreview={handlePreview}
              locale={locale as Locale}
              isAr={isAr}
            />
          ))}
        </div>
      )}

      {/* Batch Print Dialog */}
      <BatchPrintDialog
        open={batchPrintOpen}
        onClose={() => setBatchPrintOpen(false)}
        selectedItems={selectedDriveItems}
      />

      {/* Preview Modal */}
      <StickerPreviewModal
        open={previewPdfState.open}
        onClose={() => setPreviewPdfState({ open: false, url: null })}
        pdfUrl={previewPdfState.url}
        title={previewPdfState.title}
      />
    </div>
  );
}

/**
 * Recursive TreeNode component for rendering the pruned hierarchical folder tree
 */
function TreeNodeComponent({
  node,
  depth,
  expandedFolderIds,
  selectedFileIds,
  markingIds,
  onToggleExpand,
  onToggleSelectFile,
  onToggleSelectFolder,
  onDirectPrint,
  onMarkAsPrinted,
  onPreview,
  locale,
  isAr,
}: {
  node: PendingFolderNode;
  depth: number;
  expandedFolderIds: Set<string>;
  selectedFileIds: Set<string>;
  markingIds: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onToggleSelectFile: (fileId: string) => void;
  onToggleSelectFolder: (node: PendingFolderNode) => void;
  onDirectPrint: (file: PendingFileItem) => void;
  onMarkAsPrinted: (fileId: string, name?: string) => Promise<void>;
  onPreview: (file: PendingFileItem) => void;
  locale: Locale;
  isAr: boolean;
}) {
  const isExpanded = expandedFolderIds.has(node.id);
  const levelCfg = LEVEL_CONFIG[node.level] || LEVEL_CONFIG.folder;
  const LevelIcon = levelCfg.icon;

  // Folder selection state
  const collectIds = (n: PendingFolderNode): string[] => {
    const list = n.files.map((f) => f.id);
    for (const sub of n.subfolders) list.push(...collectIds(sub));
    return list;
  };

  const allFileIds = collectIds(node);
  const selectedCount = allFileIds.filter((id) => selectedFileIds.has(id)).length;
  const isAllSelected = allFileIds.length > 0 && selectedCount === allFileIds.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < allFileIds.length;

  return (
    <div className="space-y-1">
      {/* Folder Row */}
      <div
        className={cn(
          "group flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-surface-soft/60 transition-colors select-none",
          isExpanded && "bg-surface-soft/30",
        )}
        style={{ marginInlineStart: `${depth * 20}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Chevron */}
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className="size-6 flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          {/* Folder selection checkbox */}
          <CheckboxInput
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onChange={() => onToggleSelectFolder(node)}
            className="size-4 rounded border-border accent-accent cursor-pointer"
            title={isAr ? `تحديد كل ملفات "${node.name}"` : `Select all in "${node.name}"`}
          />

          {/* Level Icon */}
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface-soft border border-border shrink-0">
            {isExpanded ? (
              <FolderOpen className="size-4 text-amber-500" />
            ) : (
              <LevelIcon className="size-4 text-amber-600 dark:text-amber-400" />
            )}
          </span>

          {/* Folder Name */}
          <span
            onClick={() => onToggleExpand(node.id)}
            className="font-bold text-sm text-foreground truncate cursor-pointer hover:text-accent"
          >
            {node.name}
          </span>

          {/* Level Tag Pill */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] border shrink-0",
              levelCfg.colorClass,
            )}
          >
            {isAr ? levelCfg.labelAr : levelCfg.labelEn}
          </span>

          {/* Unprinted count badge */}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
            {isAr
              ? `${node.unprintedFilesCount} معلق`
              : `${node.unprintedFilesCount} pending`}
          </span>
        </div>

        {/* Path breadcrumbs info for context */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted truncate max-w-sm">
          <span>{node.path}</span>
        </div>
      </div>

      {/* Expanded Folder Children */}
      {isExpanded && (
        <div className="space-y-1">
          {/* Subfolders */}
          {node.subfolders.map((sub) => (
            <TreeNodeComponent
              key={sub.id}
              node={sub}
              depth={depth + 1}
              expandedFolderIds={expandedFolderIds}
              selectedFileIds={selectedFileIds}
              markingIds={markingIds}
              onToggleExpand={onToggleExpand}
              onToggleSelectFile={onToggleSelectFile}
              onToggleSelectFolder={onToggleSelectFolder}
              onDirectPrint={onDirectPrint}
              onMarkAsPrinted={onMarkAsPrinted}
              onPreview={onPreview}
              locale={locale}
              isAr={isAr}
            />
          ))}

          {/* Direct Files in this Folder */}
          {node.files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "group flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-2.5 rounded-xl border border-border/70 bg-surface hover:border-accent hover:bg-surface-soft/40 transition-all shadow-2xs",
                selectedFileIds.has(file.id) && "border-accent bg-accent/5 ring-1 ring-accent/30",
              )}
              style={{ marginInlineStart: `${(depth + 1) * 20}px` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckboxInput
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => onToggleSelectFile(file.id)}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />

                <div className="shrink-0">
                  <FileIcon category="pdf" extension={file.extension} size="sm" />
                </div>

                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-bold text-xs sm:text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-[10px] text-muted">
                    {formatBytes(file.size)} • {formatDate(file.modifiedTime, locale)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onPreview(file)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-surface-soft cursor-pointer transition-all"
                  title={isAr ? `معاينة "${file.name}"` : `Preview "${file.name}"`}
                >
                  <Eye className="size-3 text-muted" />
                  <span className="hidden sm:inline">{isAr ? "معاينة" : "Show"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDirectPrint(file)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs transition-all"
                  title={isAr ? `طباعة "${file.name}" مباشرة` : `Print "${file.name}"`}
                >
                  <Printer className="size-3" />
                  <span>{isAr ? "طباعة" : "Print"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void onMarkAsPrinted(file.id, file.name)}
                  disabled={markingIds.has(file.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer transition-all"
                  title={isAr ? "تأكيد الطباعة ومزامنة الحالة فوراً" : "Mark as printed now"}
                >
                  {markingIds.has(file.id) ? (
                    <Loader2 className="size-3 animate-spin text-emerald-600" />
                  ) : (
                    <Check className="size-3 text-emerald-600" />
                  )}
                  <span>{isAr ? "تمت الطباعة ✓" : "Done"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
