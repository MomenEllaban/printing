"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpToLine,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  Files,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  FolderMinus,
  FolderTree,
  GraduationCap,
  Grid2X2,
  GripVertical,
  List,
  Loader2,
  MoreVertical,
  Move,
  Pencil,
  Pin,
  PinOff,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, EmptyState, Input, Modal, Select, Spinner } from "./ui";
import { UploadDialog } from "./upload-dialog";
import { FolderPicker } from "./folder-picker";
import { FileIcon } from "./file-icon";
import { BatchPrintDialog } from "./batch-print-dialog";
import { BatchStickersDialog } from "./batch-stickers-dialog";
import { StickerPreviewModal } from "./sticker-preview-modal";
import { AddProctorDialog } from "./add-proctor-dialog";
import { ExcelViewerModal } from "./excel-viewer-modal";
import { BreadcrumbDropdownItem } from "./breadcrumb-dropdown";
import { useI18n } from "./locale-provider";
import { useActiveProfile } from "./profile-provider";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/file-utils";
import { formatDate, formatNumber } from "@/lib/format";
import { parseExamInfoFromFileName } from "@/lib/exam-utils";
import type { Breadcrumb, DriveItem, DriveListResult, FileCategory, Locale } from "@/lib/types";

import {
  isBuildingExcelFile,
  isProctorRegisterFile,
  isControlRegisterFile,
  isStudentRegisterFile,
  findBuildingExcelFileInItems,
  findProctorFileInItems,
  findControlFileInItems,
  findStudentFileInItems,
  findRegisterFileInItems,
  getFolderRegisterCategory,
  extractLogisticsHierarchy,
  isRoomFolderName,
  isFloorFolderName,
  canProfileAddRegister,
  getRegisterTheme,
  type RegisterCategory,
} from "@/lib/stickers/register-utils";

function RegisterIcon({ category, className }: { category: RegisterCategory; className?: string }) {
  if (category === "building_excel") return <FileSpreadsheet className={className} />;
  if (category === "control") return <Building2 className={className} />;
  if (category === "student") return <GraduationCap className={className} />;
  return <ClipboardList className={className} />;
}

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

function getStoredView(): "grid" | "list" {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "grid" || stored === "list" ? stored : "list";
  } catch {
    return "list";
  }
}

const SORTS = [
  "custom",
  "modified_desc",
  "modified_asc",
  "name_asc",
  "name_desc",
  "size_desc",
  "size_asc",
] as const;

const CATEGORIES: { value: "" | FileCategory; labelKey: "common.all" | "common.category.pdf" | "common.category.excel" | "common.category.word" | "common.category.image" | "common.category.video" | "common.category.other" }[] = [
  { value: "", labelKey: "common.all" },
  { value: "pdf", labelKey: "common.category.pdf" },
  { value: "excel", labelKey: "common.category.excel" },
  { value: "word", labelKey: "common.category.word" },
  { value: "image", labelKey: "common.category.image" },
  { value: "video", labelKey: "common.category.video" },
  { value: "other", labelKey: "common.category.other" },
];

function sortLabelKey(sort: string) {
  switch (sort) {
    case "custom":
      return "common.sortCustom";
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

function ExamBadges({ name, isRoomFolder }: { name: string; isRoomFolder?: boolean }) {
  const { locale } = useI18n();
  const info = parseExamInfoFromFileName(name);
  const isStudent = (isRoomFolder && !info?.registerType) || info?.registerType === "student";

  if (!info && !isRoomFolder) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {info?.examType && (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
          {info.examType}
        </span>
      )}
      {info?.registerType === "proctor" && (
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          📋 {locale === "ar" ? "كشف مراقبين" : "Proctor Register"}
        </span>
      )}
      {info?.registerType === "control" && (
        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
          🏢 {locale === "ar" ? "كشف كنترول" : "Control Register"}
        </span>
      )}
      {isStudent && (
        <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
          🎓 {locale === "ar" ? "كشف طلاب" : "Student Register"}
        </span>
      )}
      {info?.floor && (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          {locale === "ar" ? `دور ${info.floor}` : `Floor ${info.floor}`}
        </span>
      )}
      {info?.room && (
        <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
          {locale === "ar" ? `روم ${info.room}` : `Room ${info.room}`}
        </span>
      )}
    </div>
  );
}

function CheckboxInput({
  checked,
  indeterminate,
  onChange,
  onClick,
  className,
  ariaLabel,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate && !checked);
    }
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      title={title}
    />
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
  const { activeProfile } = useActiveProfile();

  const [items, setItems] = useState<DriveItem[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Breadcrumb | null>(null);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
  const [search, setSearch] = useState(initialSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch?.trim() ?? "");
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState<"grid" | "list">(initialView || "list");
  const storedView = useSyncExternalStore(subscribeViewChange, getStoredView, () => "list");
  const effectiveView = storedView ?? view ?? "list";
  const [categoryFilter, setCategoryFilter] = useState<"" | FileCategory>(category ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(demo);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(Boolean(autoOpenUpload));
  const [uploadTargetFolder, setUploadTargetFolder] = useState<{ id: string; name: string } | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
  const [emptyDropDragging, setEmptyDropDragging] = useState(false);
  const [directUploading, setDirectUploading] = useState(false);
  const emptyDropInputRef = useRef<HTMLInputElement>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderTargetParent, setNewFolderTargetParent] = useState<{ id: string; name: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // Drag & drop state for moving files and folders
  const [draggedItem, setDraggedItem] = useState<DriveItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DriveItem | null>(null);
  const [moving, setMoving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null);

  // Pinning & custom ordering state
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("fm_pinned_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {}
    return new Set<string>();
  });

  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const storageKey = `fm_folder_order_${initialFolderId || "root"}`;
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  });

  const [reorderDraggedId, setReorderDraggedId] = useState<string | null>(null);
  const [reorderOverId, setReorderOverId] = useState<string | null>(null);

  // Print status tracking & filtering
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const [printFilter, setPrintFilter] = useState<"all" | "printed" | "pending">("all");

  const fetchPrintStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/drive/print-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.printedIds)) {
          setPrintedIds(new Set(data.printedIds));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchPrintStatus();
  }, [fetchPrintStatus, refreshKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const printParam = urlParams.get("printStatus");
      if (printParam === "pending" || printParam === "printed") {
        setPrintFilter(printParam);
      }
    }
  }, []);

  // Sync state when initialFolderId prop changes (e.g. Back navigation to /files?folder=...)
  useEffect(() => {
    setFolderId(initialFolderId ?? null);
  }, [initialFolderId]);

  // Load custom folder order from localStorage when folderId changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storageKey = `fm_folder_order_${folderId || "root"}`;
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomOrder(parsed);
            return;
          }
        }
        setCustomOrder([]);
      }
    } catch {}
  }, [folderId]);

  // Sync state when initialSearch prop changes
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setDebouncedSearch(initialSearch.trim());
    }
  }, [initialSearch]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined" && mode === "all") {
        const urlParams = new URLSearchParams(window.location.search);
        const folder = urlParams.get("folder");
        setFolderId(folder || null);
        const q = urlParams.get("search");
        if (q !== null) {
          setSearch(q);
          setDebouncedSearch(q.trim());
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mode]);

  // Multi-selection & batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [batchPrintOrientation, setBatchPrintOrientation] = useState<"portrait" | "landscape">("portrait");

  // Expandable folder tree in list view
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderChildren, setFolderChildren] = useState<Record<string, DriveItem[]>>({});
  const [loadingFolderIds, setLoadingFolderIds] = useState<Set<string>>(new Set());
  const [descendantsCache, setDescendantsCache] = useState<
    Record<string, { files: DriveItem[]; folders: DriveItem[]; descendantIds: string[] }>
  >({});
  const [loadingDescendantIds, setLoadingDescendantIds] = useState<Set<string>>(new Set());

  const fetchFolderChildren = useCallback(async (fId: string): Promise<DriveItem[] | undefined> => {
    setLoadingFolderIds((prev) => new Set(prev).add(fId));
    try {
      const res = await fetch(`/api/drive/files?folder=${encodeURIComponent(fId)}&pageSize=100`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        setFolderChildren((prev) => ({ ...prev, [fId]: data.items }));
        return data.items;
      }
    } catch {
      // ignore
    } finally {
      setLoadingFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(fId);
        return next;
      });
    }
    return undefined;
  }, []);

  const toggleFolderExpand = useCallback(
    (fId: string, folderName?: string) => {
      setExpandedFolderIds((prev) => {
        const next = new Set(prev);
        if (next.has(fId)) {
          next.delete(fId);
        } else {
          next.add(fId);
          // When expanding a Floor folder in tree view, auto-expand its room subfolders so user immediately sees room files!
          const isFloor = folderName ? isFloorFolderName(folderName) : false;
          void fetchFolderChildren(fId).then((children) => {
            if (isFloor && Array.isArray(children)) {
              const rooms = children.filter((c) => c.isFolder);
              if (rooms.length > 0) {
                setExpandedFolderIds((innerPrev) => {
                  const innerNext = new Set(innerPrev);
                  rooms.forEach((r) => innerNext.add(r.id));
                  return innerNext;
                });
                rooms.forEach((r) => {
                  if (!folderChildren[r.id]) {
                    void fetchFolderChildren(r.id);
                  }
                });
              }
            }
          });
        }
        return next;
      });
    },
    [fetchFolderChildren, folderChildren],
  );

  useEffect(() => {
    setExpandedFolderIds(new Set());
    setFolderChildren({});
    setDescendantsCache({});
  }, [folderId]);

  // All folders are CLOSED by default when opening File Manager App or navigating.
  // ONLY auto-expand room folders when the user opens a Floor folder so they immediately see room contents faster!
  useEffect(() => {
    if (items.length > 0 && currentFolder && isFloorFolderName(currentFolder.name)) {
      const roomFolders = items.filter((item) => item.isFolder);
      if (roomFolders.length > 0) {
        setExpandedFolderIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          roomFolders.forEach((f) => {
            if (!next.has(f.id)) {
              next.add(f.id);
              changed = true;
              if (!folderChildren[f.id]) {
                void fetchFolderChildren(f.id);
              }
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [items, currentFolder, fetchFolderChildren, folderChildren]);

  useEffect(() => {
    if (expandedFolderIds.size > 0) {
      expandedFolderIds.forEach((id) => void fetchFolderChildren(id));
    }
  }, [refreshKey, fetchFolderChildren]);

  // Prefetch direct children for eligible register folders so register file existence is detected immediately
  useEffect(() => {
    if (items.length > 0) {
      items
        .filter(
          (i) =>
            i.isFolder &&
            getFolderRegisterCategory({ folder: i, breadcrumbs, isCurrentFolder: false }) !== null,
        )
        .forEach((f) => {
          if (!folderChildren[f.id] && !loadingFolderIds.has(f.id)) {
            void fetchFolderChildren(f.id);
          }
        });
    }
  }, [items, breadcrumbs, folderChildren, loadingFolderIds, fetchFolderChildren]);

  const totalKnownFolders = useMemo(() => {
    const ids = new Set<string>();
    items.filter((i) => i.isFolder).forEach((i) => ids.add(i.id));
    Object.values(folderChildren).forEach((children) => {
      children.filter((c) => c.isFolder).forEach((c) => ids.add(c.id));
    });
    return ids;
  }, [items, folderChildren]);

  const allExpanded =
    totalKnownFolders.size > 0 && Array.from(totalKnownFolders).every((id) => expandedFolderIds.has(id));

  const expandAllFolders = useCallback(() => {
    const allFolderIds = new Set<string>();
    items.filter((i) => i.isFolder).forEach((i) => allFolderIds.add(i.id));
    Object.values(folderChildren).forEach((children) => {
      children.filter((c) => c.isFolder).forEach((c) => allFolderIds.add(c.id));
    });
    setExpandedFolderIds(allFolderIds);
    allFolderIds.forEach((id) => {
      if (!folderChildren[id]) {
        void fetchFolderChildren(id);
      }
    });
  }, [items, folderChildren, fetchFolderChildren]);

  const collapseAllFolders = useCallback(() => {
    setExpandedFolderIds(new Set());
  }, []);

  const requireWritable = useCallback((): boolean => {
    if (demoActive) {
      toast.error(t("common.demoReadOnly"));
      return false;
    }
    return true;
  }, [demoActive, t]);

  const handleOpenNewSubFolder = useCallback(
    (folder: DriveItem) => {
      if (!requireWritable()) return;
      setNewFolderTargetParent({ id: folder.id, name: folder.name });
      setNewFolderName("");
      setNewFolderOpen(true);
    },
    [requireWritable],
  );

  const handleOpenUploadForFolder = useCallback(
    (folder: DriveItem) => {
      if (!requireWritable()) return;
      setUploadTargetFolder({ id: folder.id, name: folder.name });
      setUploadOpen(true);
    },
    [requireWritable],
  );

  const handleDirectFilesUpload = useCallback(
    async (files: File[]) => {
      if (demoActive) {
        toast.error(t("upload.demoBlocked"));
        return;
      }
      if (!requireWritable()) return;

      const maxBytes = maxUploadSizeMb * 1024 * 1024;
      const allowed = new Set(allowedExtensions.map((item) => item.toLowerCase()));

      const validFiles: File[] = [];
      for (const file of files) {
        const dot = file.name.lastIndexOf(".");
        const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
        if (file.size > maxBytes) {
          toast.error(`${file.name}: ${t("error.fileTooLarge")}`);
          continue;
        }
        if (!allowed.has(ext)) {
          toast.error(`${file.name}: ${t("upload.rejected")}`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setDirectUploading(true);
      const toastId = toast.loading(
        locale === "ar"
          ? `جاري رفع ${validFiles.length > 1 ? `${validFiles.length} ملفات` : validFiles[0].name}...`
          : `Uploading ${validFiles.length > 1 ? `${validFiles.length} files` : validFiles[0].name}...`,
      );

      let successCount = 0;
      for (const file of validFiles) {
        try {
          if (file.size <= 4.2 * 1024 * 1024) {
            const formData = new FormData();
            formData.append("file", file);
            if (folderId) formData.append("parentId", folderId);

            const directRes = await fetch("/api/drive/upload/direct", {
              method: "POST",
              body: formData,
            });
            const data = await directRes.json().catch(() => ({}));
            if (!directRes.ok) throw new Error(data.message || t("common.uploadFailed"));
            successCount++;
          } else {
            const initRes = await fetch("/api/drive/upload/init", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
                parentId: folderId || undefined,
              }),
            });
            const init = await initRes.json().catch(() => ({}));
            if (!initRes.ok) throw new Error(init.message || t("error.uploadInit"));

            const uploadPutRes = await fetch(init.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type || "application/octet-stream" },
              body: file,
            });
            const putData = await uploadPutRes.json().catch(() => ({}));
            const fileId = putData.id;
            if (!fileId) throw new Error(t("common.uploadFailed"));

            const completeRes = await fetch("/api/drive/upload/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId, pendingToken: init.pendingToken }),
            });
            if (!completeRes.ok) {
              const compData = await completeRes.json().catch(() => ({}));
              throw new Error(compData.message || t("common.uploadFailed"));
            }
            successCount++;
          }
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : t("common.uploadFailed")}`);
        }
      }

      setDirectUploading(false);
      if (successCount > 0) {
        toast.success(
          locale === "ar"
            ? `تم رفع ${successCount > 1 ? `${successCount} ملفات` : validFiles[0].name} بنجاح`
            : `Uploaded ${successCount > 1 ? `${successCount} files` : validFiles[0].name} successfully`,
          { id: toastId },
        );
        setRefreshKey((v) => v + 1);
      } else {
        toast.dismiss(toastId);
      }
    },
    [allowedExtensions, demoActive, folderId, locale, maxUploadSizeMb, requireWritable, t],
  );

  const [busyStickerId, setBusyStickerId] = useState<string | null>(null);
  const [stickerAction, setStickerAction] = useState<"show" | "print" | null>(null);
  const [busyExamStickerId, setBusyExamStickerId] = useState<string | null>(null);
  const [examStickerAction, setExamStickerAction] = useState<"show" | "print" | null>(null);
  const [previewPdfState, setPreviewPdfState] = useState<{
    open: boolean;
    url: string | null;
    title?: string;
    customTitle?: string;
    customDescription?: string;
  }>({ open: false, url: null });
  const previewStickerState = previewPdfState;
  const setPreviewStickerState = setPreviewPdfState;

  // Excel Tabs Viewer & Print Modal
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelModalFile, setExcelModalFile] = useState<DriveItem | null>(null);
  const [excelModalBuilding, setExcelModalBuilding] = useState<string | undefined>(undefined);

  // Register Dialog & Actions (Building Excel / Room Student Register)
  const [proctorDialogOpen, setProctorDialogOpen] = useState(false);
  const [proctorDialogFolder, setProctorDialogFolder] = useState<{ id: string; name: string } | null>(null);
  const [proctorDialogType, setProctorDialogType] = useState<RegisterCategory>("building_excel");

  const handleOpenRegisterDialog = useCallback(
    (folder: { id: string; name: string }, type: RegisterCategory = "building_excel") => {
      if (!type) return;
      if (!canProfileAddRegister(activeProfile.id, type)) {
        toast.error(
          locale === "ar"
            ? "غير مصرح لحسابك برفع أو تعديل هذا النوع من الملفات."
            : "Your profile is not authorized to upload or manage this file type.",
        );
        return;
      }
      setProctorDialogFolder({ id: folder.id, name: folder.name });
      setProctorDialogType(type);
      setProctorDialogOpen(true);
      if (!folderChildren[folder.id]) {
        void fetchFolderChildren(folder.id);
      }
    },
    [folderChildren, fetchFolderChildren, activeProfile.id, locale],
  );

  const handleOpenProctorDialog = useCallback(
    (folder: { id: string; name: string }) => {
      const cat = getFolderRegisterCategory({
        folder,
        breadcrumbs,
        isCurrentFolder: false,
      });
      if (cat) {
        handleOpenRegisterDialog(folder, cat);
      }
    },
    [handleOpenRegisterDialog, breadcrumbs],
  );

  const handleShowRegisterFile = useCallback(
    (file: DriveItem, folder?: { id: string; name: string }, type?: RegisterCategory) => {
      const isRoom = isCurrentFolderRoom || (folder ? isRoomFolderName(folder.name) : false);
      const resolvedType =
        type ||
        (isRoom
          ? "student"
          : isBuildingExcelFile(file)
          ? "building_excel"
          : isControlRegisterFile(file)
          ? "control"
          : isStudentRegisterFile(file)
          ? "student"
          : "proctor");

      if (resolvedType === "building_excel" || isBuildingExcelFile(file)) {
        setExcelModalFile(file);
        setExcelModalBuilding(folder?.name);
        setExcelModalOpen(true);
        return;
      }

      const isControl = resolvedType === "control";
      const isStudent = resolvedType === "student";
      const registerLabel = isControl ? "Control Register" : isStudent ? "Student Register" : "Proctor Register";
      const registerLabelAr = isControl ? "معاينة كشف الكنترول" : isStudent ? "معاينة كشف الطلاب" : "معاينة كشف المراقبين";
      const descAr = isControl
        ? "معاينة مباشرة لكشف أعضاء الكنترول والإشراف بالمبنى قبل الطباعة."
        : isStudent
        ? "معاينة مباشرة لكشف حضور وتوزيع الطلاب بالقاعة قبل الطباعة."
        : "معاينة مباشرة لكشف حضور وتوزيع السادة المراقبين والملاحظين قبل الطباعة.";
      const descEn = isControl
        ? "Live preview of Building Control & Supervision Register before printing."
        : isStudent
        ? "Live preview of Student Attendance & Seating Register before printing."
        : "Live preview of Proctor Attendance & Assignment Register before printing.";

      setPreviewPdfState({
        open: true,
        url: `/api/drive/files/${file.id}/content`,
        title: folder ? `${registerLabel} - ${folder.name}` : file.name,
        customTitle:
          locale === "ar"
            ? `${registerLabelAr}: ${folder?.name || file.name}`
            : `${registerLabel}: ${folder?.name || file.name}`,
        customDescription: locale === "ar" ? descAr : descEn,
      });
    },
    [locale],
  );

  const handleShowProctorFile = useCallback(
    (file: DriveItem, folder?: { id: string; name: string }) => {
      const folderCat = folder ? getFolderRegisterCategory({ folder, breadcrumbs, isCurrentFolder: false }) : null;
      const type: RegisterCategory =
        folderCat ||
        (isBuildingExcelFile(file)
          ? "building_excel"
          : isControlRegisterFile(file)
          ? "control"
          : isStudentRegisterFile(file)
          ? "student"
          : "proctor");
      handleShowRegisterFile(file, folder, type);
    },
    [handleShowRegisterFile, breadcrumbs],
  );

  const handlePrintRegisterFile = useCallback(
    (file: DriveItem, folder?: { id: string; name: string }, type?: RegisterCategory) => {
      const isRoom = isCurrentFolderRoom || (folder ? isRoomFolderName(folder.name) : false);
      const resolvedType =
        type ||
        (isRoom
          ? "student"
          : isBuildingExcelFile(file)
          ? "building_excel"
          : isControlRegisterFile(file)
          ? "control"
          : isStudentRegisterFile(file)
          ? "student"
          : "proctor");

      if (resolvedType === "building_excel" || isBuildingExcelFile(file)) {
        // Open the specialized Excel tab viewer and print dialog
        setExcelModalFile(file);
        setExcelModalBuilding(folder?.name);
        setExcelModalOpen(true);
        return;
      }

      const isControl = resolvedType === "control";
      const isStudent = resolvedType === "student";
      const typeNameAr = isControl ? "كشف كنترول" : isStudent ? "كشف طلاب" : "كشف مراقبين";
      const typeNameEn = isControl ? "control" : isStudent ? "student" : "proctor";
      const toastId = toast.loading(
        locale === "ar"
          ? `جاري تجهيز ${typeNameAr} "${folder?.name || file.name}" للطباعة...`
          : `Preparing ${typeNameEn} register for print...`,
      );
      try {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = `/api/drive/files/${file.id}/content`;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(`/print/${file.id}`, "_blank");
          }
        };
        toast.success(
          locale === "ar"
            ? `تم إرسال ${typeNameAr} للطباعة بنجاح`
            : `${isControl ? "Control" : isStudent ? "Student" : "Proctor"} register sent to printer`,
          { id: toastId },
        );
      } catch {
        window.open(`/print/${file.id}`, "_blank");
        toast.dismiss(toastId);
      }
    },
    [locale],
  );

  const handlePrintProctorFile = useCallback(
    (file: DriveItem, folder?: { id: string; name: string }) => {
      const folderCat = folder ? getFolderRegisterCategory({ folder, breadcrumbs, isCurrentFolder: false }) : null;
      const type: RegisterCategory =
        folderCat ||
        (isBuildingExcelFile(file)
          ? "building_excel"
          : isControlRegisterFile(file)
          ? "control"
          : isStudentRegisterFile(file)
          ? "student"
          : "proctor");
      handlePrintRegisterFile(file, folder, type);
    },
    [handlePrintRegisterFile, breadcrumbs],
  );

  const handleProctorUploaded = useCallback(
    (newFile: DriveItem) => {
      if (!proctorDialogFolder) return;
      const fId = proctorDialogFolder.id;
      setFolderChildren((prev) => {
        const existing = prev[fId] || [];
        return {
          ...prev,
          [fId]: [newFile, ...existing.filter((item) => item.id !== newFile.id)],
        };
      });
      if (currentFolder?.id === fId) {
        setItems((prev) => [newFile, ...prev.filter((item) => item.id !== newFile.id)]);
      }
      setExpandedFolderIds((prev) => new Set(prev).add(fId));
      setRefreshKey((v) => v + 1);
    },
    [proctorDialogFolder, currentFolder],
  );

  const getHierarchyInfoForFolder = useCallback(
    (target: { id: string; name: string }) => {
      const names = breadcrumbs.map((b) => b.name || "");
      const isEst = (n: string) =>
        /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s]+))?$/i.test(n.trim());
      const estIdx = names.findIndex(isEst);
      const relevant = estIdx >= 0 ? names.slice(estIdx) : names;

      const examName = relevant[0] || "EST 1";
      const governorate = relevant[1];
      const center = relevant[2];
      const building = relevant[3] || (!/floor|دور/i.test(target.name) ? target.name : undefined);
      const floor = relevant[4] || (/floor|دور/i.test(target.name) ? target.name : undefined);

      const children = folderChildren[target.id] || [];
      const rooms = children
        .filter((c) => c.isFolder || /room|قاعة|\d+/i.test(c.name))
        .map((c) => c.name);
      const floors = children
        .filter((c) => c.isFolder && /floor|دور/i.test(c.name))
        .map((c) => c.name);

      return { examName, governorate, center, building, floor, rooms, floors };
    },
    [breadcrumbs, folderChildren],
  );

  const handleStickerAction = useCallback(
    async (
      e: React.MouseEvent | null,
      target: { id: string; name?: string | null },
      action: "show" | "print",
      orientation: "portrait" | "landscape" = "portrait",
    ) => {
      if (e) e.stopPropagation();
      if (!target.id || busyStickerId) return;

      setBusyStickerId(target.id);
      setStickerAction(action);
      const toastId = toast.loading(
        action === "show"
          ? (locale === "ar"
            ? `جاري تجهيز معاينة استيكر "${target.name || "EST"}"...`
            : `Loading sticker preview for "${target.name || "EST"}"...`)
          : (locale === "ar"
            ? `جاري تجهيز استيكر "${target.name || "EST"}" للطباعة (${orientation === "portrait" ? "طولي" : "عرضي"})...`
            : `Preparing sticker for "${target.name || "EST"}" for printing (${orientation})...`),
      );

      try {
        const knownChildFiles = (folderChildren[target.id] || (currentFolder?.id === target.id ? items : []))
          .filter((i) => !i.isFolder)
          .map((i) => i.name);
        const queryParam = knownChildFiles.length > 0 ? `?knownFiles=${encodeURIComponent(JSON.stringify(knownChildFiles))}` : "";
        const sep = queryParam ? "&" : "?";
        const res = await fetch(`/api/stickers/${encodeURIComponent(target.id)}${queryParam}${sep}orientation=${orientation}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              (locale === "ar" ? "فشل إنشاء ملف الاستيكر" : "Failed to generate sticker PDF"),
          );
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);

        if (action === "show") {
          setPreviewStickerState({
            open: true,
            url: objectUrl,
            title: target.name || "EST",
          });
          toast.success(
            locale === "ar" ? "تم فتح نافذة المعاينة بنجاح" : "Sticker preview opened",
            { id: toastId },
          );
        } else {
          // Direct print via hidden iframe with window.open fallback
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          iframe.src = objectUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              const w = window.open(objectUrl, "_blank");
              w?.focus();
              w?.print();
            }
          };
          toast.success(
            locale === "ar" ? "تم إرسال الاستيكر للطباعة بنجاح" : "Sticker sent to printer",
            { id: toastId },
          );
        }
      } catch (err) {
        console.error("[sticker] Failed:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : locale === "ar"
            ? "حدث خطأ أثناء معالجة الاستيكر"
            : "Error processing sticker",
          { id: toastId },
        );
      } finally {
        setBusyStickerId(null);
        setStickerAction(null);
      }
    },
    [busyStickerId, locale, folderChildren, currentFolder, items],
  );

  const handleShowSticker = useCallback(
    (e: React.MouseEvent | null, target: { id: string; name?: string | null }) =>
      handleStickerAction(e, target, "show"),
    [handleStickerAction],
  );

  const handlePrintSticker = useCallback(
    (
      e: React.MouseEvent | null,
      target: { id: string; name?: string | null },
      orientation: "portrait" | "landscape" = "portrait",
    ) => handleStickerAction(e, target, "print", orientation),
    [handleStickerAction],
  );

  const handleExamStickerAction = useCallback(
    async (
      e: React.MouseEvent | null,
      target: { id: string; name?: string | null },
      action: "show" | "print",
      orientation: "portrait" | "landscape" = "portrait",
    ) => {
      if (e) e.stopPropagation();
      if (!target.id || busyExamStickerId) return;

      setBusyExamStickerId(target.id);
      setExamStickerAction(action);
      const isFloor = target.name ? isFloorFolderName(target.name) : false;
      const toastId = toast.loading(
        action === "show"
          ? (locale === "ar"
            ? isFloor
              ? `جاري تجهيز معاينة ملصقات كيسة امتحانات الدور "${target.name || "Floor"}" (A4)...`
              : `جاري تجهيز معاينة استيكرات الامتحانات للقاعة "${target.name || "EST"}"...`
            : isFloor
            ? `Loading floor exam bag placards preview for "${target.name || "Floor"}" (A4)...`
            : `Loading exam stickers preview for "${target.name || "EST"}"...`)
          : (locale === "ar"
            ? isFloor
              ? `جاري تجهيز ملصقات كيسة امتحانات الدور "${target.name || "Floor"}" للطباعة (A4)...`
              : `جاري تجهيز استيكرات الامتحانات للقاعة "${target.name || "EST"}" للطباعة (${orientation === "portrait" ? "طولي" : "عرضي"})...`
            : isFloor
            ? `Preparing floor exam bag placards for "${target.name || "Floor"}" for printing (A4)...`
            : `Preparing exam stickers for "${target.name || "EST"}" for printing (${orientation})...`),
      );

      try {
        const knownChildFiles = (folderChildren[target.id] || (currentFolder?.id === target.id ? items : []))
          .filter((i) => !i.isFolder)
          .map((i) => i.name);
        const queryParam = knownChildFiles.length > 0 ? `&knownFiles=${encodeURIComponent(JSON.stringify(knownChildFiles))}` : "";
        const res = await fetch(`/api/stickers/${encodeURIComponent(target.id)}?type=exam${queryParam}&orientation=${orientation}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              (locale === "ar" ? "فشل إنشاء استيكرات الامتحانات" : "Failed to generate exam stickers PDF"),
          );
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);

        if (action === "show") {
          setPreviewStickerState({
            open: true,
            url: objectUrl,
            title: isFloor
              ? `EST Floor Exam Bag Placards - ${target.name || "Floor"}`
              : `EST Exam Stickers - ${target.name || "Room"}`,
            customTitle:
              locale === "ar"
                ? isFloor
                  ? `ملصقات كيسة امتحانات الدور للمادة — ${target.name || "الدور"}`
                  : `استيكرات الامتحانات — قاعة ${target.name || ""}`
                : isFloor
                ? `Floor Subject Exam Bag Placards — ${target.name || "Floor"}`
                : `EST Exam Stickers — Room ${target.name || ""}`,
            customDescription:
              locale === "ar"
                ? isFloor
                  ? "ملصقات كيسة امتحانات الدور لكل مادة (مقاس A4) تشمل تفاصيل الدور واسم المادة وبيان القاعات وأعداد الطلاب وقوائم التدقيق."
                  : "ملصقات أوراق الامتحان الرسمية (نسختان لكل مادة) — مقاس ربع صفحة A4."
                : isFloor
                ? "Official A4 Floor Subject Exam Bag Placards with rooms directory and student count checklist."
                : "Official exam paper dossiers (2 copies per subject) — Quarter A4.",
          });
          toast.success(
            locale === "ar"
              ? isFloor
                ? "تم فتح معاينة ملصقات كيسة امتحانات الدور بنجاح"
                : "تم فتح معاينة استيكرات الامتحانات بنجاح"
              : "Exam stickers preview opened",
            { id: toastId },
          );
        } else {
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          iframe.src = objectUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              const w = window.open(objectUrl, "_blank");
              w?.focus();
              w?.print();
            }
          };
          toast.success(
            locale === "ar" ? "تم إرسال استيكرات الامتحانات للطباعة بنجاح" : "Exam stickers sent to printer",
            { id: toastId },
          );
        }
      } catch (err) {
        console.error("[exam-sticker] Failed:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : locale === "ar"
            ? "حدث خطأ أثناء معالجة استيكرات الامتحانات"
            : "Error processing exam stickers",
          { id: toastId },
        );
      } finally {
        setBusyExamStickerId(null);
        setExamStickerAction(null);
      }
    },
    [busyExamStickerId, locale, folderChildren, currentFolder, items],
  );

  const handleShowExamStickers = useCallback(
    (e: React.MouseEvent | null, target: { id: string; name?: string | null }) =>
      handleExamStickerAction(e, target, "show"),
    [handleExamStickerAction],
  );

  const handlePrintExamStickers = useCallback(
    (
      e: React.MouseEvent | null,
      target: { id: string; name?: string | null },
      orientation: "portrait" | "landscape" = "portrait",
    ) => handleExamStickerAction(e, target, "print", orientation),
    [handleExamStickerAction],
  );

  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [seedingEst, setSeedingEst] = useState(false);

  const handleSeedEst = useCallback(async () => {
    setSeedingEst(true);
    setSeedConfirmOpen(false);
    const toastId = toast.loading(
      locale === "ar"
        ? "جاري إنشاء هيكل المدارس والقاعات كاملاً لاختبارات EST 1 و EST 2 في Google Drive..."
        : "Creating official EST 1 & EST 2 Schools hierarchy in Google Drive...",
    );
    try {
      const res = await fetch("/api/est/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFolderId: currentFolder?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (locale === "ar" ? "فشل إنشاء المجلدات" : "Failed to create folders"));
      }
      toast.success(
        data.message ||
          (locale === "ar"
            ? "تم بنجاح إنشاء وتحديث هيكل المدارس الرسمية (18 مدرسة) في Google Drive"
            : "Successfully created/updated official Schools hierarchy in Google Drive"),
        { id: toastId },
      );
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ أثناء إنشاء هيكل EST"
          : "Error creating EST structure",
        { id: toastId },
      );
    } finally {
      setSeedingEst(false);
    }
  }, [locale]);

  const handleDragStartItem = useCallback(
    (e: React.DragEvent, item: DriveItem) => {
      if (demoActive) return;
      e.stopPropagation();
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.id);
    },
    [demoActive],
  );

  const handleDragEndItem = useCallback(() => {
    setDraggedItem(null);
    setDragOverFolderId(null);
  }, []);

  const handleDragOverFolder = useCallback(
    (e: React.DragEvent, folder: DriveItem | { id: string; name: string }) => {
      if (!draggedItem || draggedItem.id === folder.id) return;
      if (draggedItem.parentId === folder.id) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (dragOverFolderId !== folder.id) {
        setDragOverFolderId(folder.id);
      }
    },
    [draggedItem, dragOverFolderId],
  );

  const handleDragLeaveFolder = useCallback(
    (e: React.DragEvent, folder: DriveItem | { id: string; name: string }) => {
      e.stopPropagation();
      if (dragOverFolderId === folder.id) {
        setDragOverFolderId(null);
      }
    },
    [dragOverFolderId],
  );

  const handleDropOnFolder = useCallback(
    async (e: React.DragEvent, targetFolder: { id: string; name: string }) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(null);
      if (!draggedItem || draggedItem.id === targetFolder.id) return;
      if (!requireWritable()) return;

      if (draggedItem.parentId === targetFolder.id) {
        toast.info(
          locale === "ar"
            ? `العنصر "${draggedItem.name}" موجود بالفعل داخل مجلد "${targetFolder.name}"`
            : `"${draggedItem.name}" is already in "${targetFolder.name}"`,
        );
        return;
      }

      const itemToMove = draggedItem;
      setDraggedItem(null);

      const toastId = toast.loading(
        locale === "ar"
          ? `جاري نقل "${itemToMove.name}" إلى مجلد "${targetFolder.name}"...`
          : `Moving "${itemToMove.name}" to "${targetFolder.name}"...`,
      );

      try {
        const moveFileId = itemToMove.shortcutId || itemToMove.id;
        const response = await fetch(`/api/drive/files/${moveFileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: targetFolder.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || t("common.error"));

        toast.success(
          locale === "ar"
            ? `تم نقل "${itemToMove.name}" إلى مجلد "${targetFolder.name}" بنجاح!`
            : `Moved "${itemToMove.name}" to "${targetFolder.name}" successfully!`,
          { id: toastId },
        );

        setItems((current) => current.filter((i) => i.id !== itemToMove.id));

        setFolderChildren((current) => {
          const next: Record<string, DriveItem[]> = {};
          for (const [fId, children] of Object.entries(current)) {
            next[fId] = children.filter((c) => c.id !== itemToMove.id);
          }
          return next;
        });

        setExpandedFolderIds((prev) => new Set(prev).add(targetFolder.id));
        void fetchFolderChildren(targetFolder.id);

        refresh();
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : t("common.error"), { id: toastId });
      }
    },
    [draggedItem, fetchFolderChildren, locale, requireWritable, t],
  );

  const allKnownItems = useMemo(() => {
    const map = new Map<string, DriveItem>();
    items.forEach((i) => map.set(i.id, i));
    Object.values(folderChildren).forEach((children) => {
      children.forEach((c) => map.set(c.id, c));
    });
    Object.values(descendantsCache).forEach(({ files, folders }) => {
      files.forEach((f) => map.set(f.id, f));
      folders.forEach((f) => map.set(f.id, f));
    });
    return Array.from(map.values());
  }, [items, folderChildren, descendantsCache]);

  const selectedItems = useMemo(
    () => allKnownItems.filter((i) => selectedIds.has(i.id)),
    [allKnownItems, selectedIds],
  );

  const selectedFolderCount = useMemo(
    () => selectedItems.filter((i) => i.isFolder).length,
    [selectedItems],
  );

  const selectedFilesCount = useMemo(
    () => selectedItems.filter((i) => !i.isFolder).length,
    [selectedItems],
  );

  const isCurrentFolderRoom = useMemo(() => {
    if (!currentFolder) return false;
    const cat = getFolderRegisterCategory({
      folder: currentFolder,
      breadcrumbs,
      isCurrentFolder: true,
    });
    return cat === "student" || isRoomFolderName(currentFolder.name);
  }, [currentFolder, breadcrumbs]);

  const isCurrentFolderFloor = useMemo(() => {
    if (!currentFolder) return false;
    const cat = getFolderRegisterCategory({
      folder: currentFolder,
      breadcrumbs,
      isCurrentFolder: true,
    });
    return cat === "proctor" || isFloorFolderName(currentFolder.name);
  }, [currentFolder, breadcrumbs]);

  const isCurrentFolderCanHaveExamStickers = isCurrentFolderRoom || isCurrentFolderFloor;

  const displayItems = useMemo(() => {
    let filtered = items;
    if (printFilter !== "all") {
      filtered = items.filter((item) => {
        if (item.isFolder) return false;
        const isPrinted = printedIds.has(item.id);
        return printFilter === "printed" ? isPrinted : !isPrinted;
      });
    }

    let orderedList: DriveItem[];
    if (sort === "custom" && customOrder.length > 0) {
      const orderMap = new Map<string, number>();
      customOrder.forEach((id, idx) => orderMap.set(id, idx));
      orderedList = [...filtered].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        if (idxA !== idxB) return idxA - idxB;
        return a.name.localeCompare(b.name);
      });
    } else {
      orderedList = filtered;
    }

    const isItemPinned = (i: DriveItem) => pinnedIds.has(i.id) || Boolean(i.isPinned);
    const pinned: DriveItem[] = [];
    const unpinned: DriveItem[] = [];

    for (const item of orderedList) {
      if (isItemPinned(item)) {
        pinned.push({ ...item, isPinned: true });
      } else {
        unpinned.push(item);
      }
    }

    return [...pinned, ...unpinned];
  }, [items, printFilter, printedIds, sort, customOrder, pinnedIds]);

  const togglePin = useCallback(
    async (item: DriveItem) => {
      const isCurrentlyPinned = pinnedIds.has(item.id) || Boolean(item.isPinned);
      const nextPinned = new Set(pinnedIds);
      if (isCurrentlyPinned) {
        nextPinned.delete(item.id);
      } else {
        nextPinned.add(item.id);
      }
      setPinnedIds(nextPinned);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("fm_pinned_items", JSON.stringify(Array.from(nextPinned)));
        }
      } catch {}

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isPinned: !isCurrentlyPinned } : i))
      );

      toast.success(
        isCurrentlyPinned
          ? (locale === "ar" ? `تم إلغاء تثبيت "${item.name}"` : `Unpinned "${item.name}"`)
          : (locale === "ar" ? `تم تثبيت "${item.name}" في البداية 📌` : `Pinned "${item.name}" to top 📌`),
      );

      try {
        await fetch("/api/drive/custom-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: isCurrentlyPinned ? "unpin" : "pin",
            itemId: item.id,
            fileId: item.id,
            folderId: folderId || "root",
          }),
        });
      } catch {}
    },
    [pinnedIds, locale],
  );

  const handleReorderItem = useCallback(
    async (itemId: string, direction: "top" | "up" | "down" | "bottom") => {
      const currentList = [...displayItems];
      const index = currentList.findIndex((i) => i.id === itemId);
      if (index === -1) return;

      const [movedItem] = currentList.splice(index, 1);
      let targetIndex = 0;
      if (direction === "top") {
        targetIndex = 0;
      } else if (direction === "bottom") {
        targetIndex = currentList.length;
      } else if (direction === "up") {
        targetIndex = Math.max(0, index - 1);
      } else if (direction === "down") {
        targetIndex = Math.min(currentList.length, index + 1);
      }
      currentList.splice(targetIndex, 0, movedItem);

      const newOrder = currentList.map((i) => i.id);
      setCustomOrder(newOrder);
      setSort("custom");

      try {
        if (typeof window !== "undefined") {
          const storageKey = `fm_folder_order_${folderId || "root"}`;
          window.localStorage.setItem(storageKey, JSON.stringify(newOrder));
        }
      } catch {}

      toast.success(
        direction === "top"
          ? (locale === "ar" ? `تم نقل "${movedItem.name}" إلى البداية بنجاح ⏫` : `Moved "${movedItem.name}" to top ⏫`)
          : direction === "bottom"
          ? (locale === "ar" ? `تم نقل "${movedItem.name}" إلى النهاية بنجاح ⏬` : `Moved "${movedItem.name}" to bottom ⏬`)
          : (locale === "ar" ? `تم تغيير ترتيب "${movedItem.name}" بنجاح` : `Reordered "${movedItem.name}" successfully`),
      );

      try {
        await fetch("/api/drive/custom-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_order",
            folderId: folderId || "root",
            customOrder: newOrder,
            orderedIds: newOrder,
          }),
        });
      } catch {}
    },
    [displayItems, folderId, locale],
  );

  const handleReorderDragStart = useCallback(
    (e: React.DragEvent, item: DriveItem) => {
      if (demoActive) return;
      e.stopPropagation();
      setReorderDraggedId(item.id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `reorder:${item.id}`);
    },
    [demoActive],
  );

  const handleReorderDragEnd = useCallback(() => {
    setReorderDraggedId(null);
    setReorderOverId(null);
  }, []);

  const handleReorderDragOver = useCallback(
    (e: React.DragEvent, item: DriveItem) => {
      if (!reorderDraggedId || reorderDraggedId === item.id) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (reorderOverId !== item.id) {
        setReorderOverId(item.id);
      }
    },
    [reorderDraggedId, reorderOverId],
  );

  const handleReorderDrop = useCallback(
    async (e: React.DragEvent, targetItem: DriveItem) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId = reorderDraggedId;
      setReorderDraggedId(null);
      setReorderOverId(null);
      if (!sourceId || sourceId === targetItem.id) return;

      const currentList = [...displayItems];
      const fromIdx = currentList.findIndex((i) => i.id === sourceId);
      const toIdx = currentList.findIndex((i) => i.id === targetItem.id);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = currentList.splice(fromIdx, 1);
      currentList.splice(toIdx, 0, moved);

      const newOrder = currentList.map((i) => i.id);
      setCustomOrder(newOrder);
      setSort("custom");

      try {
        if (typeof window !== "undefined") {
          const storageKey = `fm_folder_order_${folderId || "root"}`;
          window.localStorage.setItem(storageKey, JSON.stringify(newOrder));
        }
      } catch {}

      toast.success(
        locale === "ar"
          ? `تم نقل "${moved.name}" إلى الموضع المحدد بنجاح`
          : `Moved "${moved.name}" to new position`,
      );

      try {
        await fetch("/api/drive/custom-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_order",
            folderId: folderId || "root",
            customOrder: newOrder,
            orderedIds: newOrder,
          }),
        });
      } catch {}
    },
    [reorderDraggedId, displayItems, folderId, locale],
  );

  const getDescendantIdsRecursively = useCallback(
    (fId: string): string[] => {
      const cached = descendantsCache[fId];
      if (cached) return cached.descendantIds;

      const ids: string[] = [];
      const queue = [fId];
      const visited = new Set<string>([fId]);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const children = folderChildren[curr] || [];
        for (const child of children) {
          ids.push(child.id);
          if (child.isFolder && !visited.has(child.id)) {
            visited.add(child.id);
            queue.push(child.id);
          }
        }
      }
      return ids;
    },
    [descendantsCache, folderChildren],
  );

  const fetchFolderDescendants = useCallback(async (targetFolderId: string) => {
    setLoadingDescendantIds((prev) => new Set(prev).add(targetFolderId));
    try {
      const res = await fetch("/api/drive/folders/descendants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderIds: [targetFolderId] }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.descendantIds)) {
          setDescendantsCache((prev) => ({
            ...prev,
            [targetFolderId]: {
              files: data.files || [],
              folders: data.folders || [],
              descendantIds: data.descendantIds || [],
            },
          }));
          if (data.folderTree && typeof data.folderTree === "object") {
            setFolderChildren((prev) => ({ ...prev, ...data.folderTree }));
          }
          setSelectedIds((prev) => {
            if (!prev.has(targetFolderId)) return prev;
            const next = new Set(prev);
            (data.descendantIds as string[]).forEach((id) => next.add(id));
            return next;
          });
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to fetch folder descendants:", err);
    } finally {
      setLoadingDescendantIds((prev) => {
        const next = new Set(prev);
        next.delete(targetFolderId);
        return next;
      });
    }
    return null;
  }, []);

  const getFolderCheckState = useCallback(
    (folderId: string): { checked: boolean; indeterminate: boolean } => {
      const isSelected = selectedIds.has(folderId);
      const children = folderChildren[folderId];

      if (!children || children.length === 0) {
        return { checked: isSelected, indeterminate: false };
      }

      const allChildrenDescendants = children.flatMap((c) =>
        c.isFolder ? [c.id, ...getDescendantIdsRecursively(c.id)] : [c.id],
      );

      const totalCount = allChildrenDescendants.length;
      const selectedCount = allChildrenDescendants.filter((cid) => selectedIds.has(cid)).length;

      if (totalCount > 0 && selectedCount === totalCount) {
        return { checked: true, indeterminate: false };
      }
      if (selectedCount > 0 && selectedCount < totalCount) {
        return { checked: false, indeterminate: true };
      }
      if (isSelected && selectedCount === 0) {
        return { checked: true, indeterminate: false };
      }
      return { checked: false, indeterminate: false };
    },
    [selectedIds, folderChildren, getDescendantIdsRecursively],
  );

  const togglePrintStatus = async (item: DriveItem) => {
    const isCurrentlyPrinted = printedIds.has(item.id);
    const action = isCurrentlyPrinted ? "unmark" : "mark";
    try {
      const res = await fetch("/api/drive/print-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: item.id,
          items: [{ id: item.id, name: item.name }],
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrintedIds(new Set(data.printedIds));
        toast.success(t("batch.markPrintedSuccess"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleBatchMarkPrinted = async () => {
    if (selectedIds.size === 0) return;
    let printableFiles = selectedItems.filter((i) => !i.isFolder);
    const selectedFolders = selectedItems.filter((i) => i.isFolder);

    if (printableFiles.length === 0 && selectedFolders.length > 0) {
      try {
        const res = await fetch("/api/drive/folders/descendants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderIds: selectedFolders.map((f) => f.id) }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.files) && data.files.length > 0) {
          printableFiles = data.files;
        }
      } catch {
        // ignore
      }
    }

    const fileIdsToMark =
      printableFiles.length > 0 ? printableFiles.map((f) => f.id) : Array.from(selectedIds);

    try {
      const res = await fetch("/api/drive/print-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: fileIdsToMark,
          items: printableFiles.map((i) => ({ id: i.id, name: i.name })),
          action: "mark",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrintedIds(new Set(data.printedIds));
        toast.success(t("batch.markPrintedSuccess"));
        clearSelection();
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const toggleSelect = useCallback(
    (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
      e?.stopPropagation();
      const item = allKnownItems.find((i) => i.id === id);
      const isCurrentlySelected = selectedIds.has(id);

      if (!item?.isFolder) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlySelected) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }

      // It's a folder!
      const checkState = getFolderCheckState(id);
      if (checkState.checked || checkState.indeterminate) {
        // Deselect folder and all descendants
        const descIds = getDescendantIdsRecursively(id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          descIds.forEach((childId) => next.delete(childId));
          return next;
        });
      } else {
        // Select folder and all descendants
        const localDescIds = getDescendantIdsRecursively(id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          localDescIds.forEach((childId) => next.add(childId));
          return next;
        });
        void fetchFolderDescendants(id);
      }
    },
    [allKnownItems, selectedIds, getFolderCheckState, getDescendantIdsRecursively, fetchFolderDescendants],
  );

  const selectAll = async () => {
    if (allKnownItems.length > 0 && selectedIds.size >= allKnownItems.length) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set(allKnownItems.map((i) => i.id));
      setSelectedIds(newSelected);

      const visibleFolders = items.filter((i) => i.isFolder);
      if (visibleFolders.length > 0) {
        try {
          const res = await fetch("/api/drive/folders/descendants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderIds: visibleFolders.map((f) => f.id) }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.descendantIds)) {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                (data.descendantIds as string[]).forEach((id) => next.add(id));
                return next;
              });
              if (data.folderTree) {
                setFolderChildren((prev) => ({ ...prev, ...data.folderTree }));
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!activeProfile.canDelete) {
      toast.error(
        locale === "ar"
          ? "حذف الملفات متاح لحساب المدير المسؤول (البرنتنج) فقط"
          : "Deleting files is restricted to Admin (Printing)",
      );
      return;
    }
    if (!requireWritable()) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/drive/files/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t("batch.deleteFailed"));

      toast.success(t("batch.deleteSuccess", { count: data.deletedCount || selectedIds.size }));
      clearSelection();
      setBatchDeleteOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("batch.deleteFailed"));
    } finally {
      setBatchDeleting(false);
    }
  };

  const [batchStickersOpen, setBatchStickersOpen] = useState(false);
  const [busyBatchStickers, setBusyBatchStickers] = useState(false);
  const [batchStickerAction, setBatchStickerAction] = useState<"show" | "print" | null>(null);
  const [batchStickerType, setBatchStickerType] = useState<"regular" | "exam">("regular");
  const [batchStickersInitialType, setBatchStickersInitialType] = useState<"regular" | "exam">("regular");

  const handleBatchStickersAction = useCallback(
    async ({
      action,
      type = "regular",
      includeChildren = false,
      orientation,
    }: {
      action: "show" | "print";
      type?: "regular" | "exam";
      includeChildren?: boolean;
      orientation?: "landscape" | "portrait";
    }) => {
      const selectedFolders = selectedItems.filter((i) => i.isFolder);
      const targetFolders =
        selectedFolders.length > 0
          ? selectedFolders
          : currentFolder
          ? [currentFolder]
          : [];

      if (targetFolders.length === 0) {
        toast.error(
          locale === "ar"
            ? "يرجى تحديد مجلد واحد على الأقل لطباعة استيكراته"
            : "Please select at least one folder for stickers",
        );
        return;
      }

      setBusyBatchStickers(true);
      setBatchStickerAction(action);
      setBatchStickerType(type);

      const toastId = toast.loading(
        action === "show"
          ? (locale === "ar"
            ? type === "exam"
              ? `جاري تجهيز استيكرات الامتحانات (${targetFolders.length} مجلد) للمعاينة...`
              : `جاري تجهيز استيكرات (${targetFolders.length} مجلد) للمعاينة...`
            : `Generating sticker preview for ${targetFolders.length} folder(s)...`)
          : (locale === "ar"
            ? type === "exam"
              ? `جاري تجهيز استيكرات الامتحانات (${targetFolders.length} مجلد) للطباعة...`
              : `جاري تجهيز استيكرات (${targetFolders.length} مجلد) للطباعة...`
            : `Preparing stickers for ${targetFolders.length} folder(s)...`),
      );

      try {
        const knownFiles: Record<string, string[]> = {};
        for (const f of targetFolders) {
          const files = (folderChildren[f.id] || (currentFolder?.id === f.id ? items : []))
            .filter((i) => !i.isFolder)
            .map((i) => i.name);
          if (files.length > 0) {
            knownFiles[f.id] = files;
          }
        }

        const res = await fetch("/api/stickers/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderIds: targetFolders.map((f) => f.id),
            type,
            includeChildren,
            orientation,
            knownFiles,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.message ||
              (locale === "ar" ? "فشل إنشاء استيكرات المجلدات" : "Failed to generate stickers"),
          );
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);

        if (action === "show") {
          setPreviewStickerState({
            open: true,
            url: objectUrl,
            title:
              type === "exam"
                ? locale === "ar"
                  ? `استيكرات الامتحانات — (${targetFolders.length} مجلد)`
                  : `Exam Stickers (${targetFolders.length} Folders)`
                : locale === "ar"
                ? `استيكرات مجمعة (${targetFolders.length} مجلد)`
                : `Batch Stickers (${targetFolders.length} Folders)`,
            customTitle:
              type === "exam"
                ? locale === "ar"
                  ? `استيكرات الامتحانات الرسمية — ${targetFolders.length} مجلد`
                  : `Official Exam Stickers — ${targetFolders.length} Folders`
                : undefined,
            customDescription:
              type === "exam"
                ? locale === "ar"
                  ? "نسختان لكل مادة بمقاس ربع صفحة A4."
                  : "2 copies per subject at quarter-A4 size."
                : undefined,
          });
          toast.success(
            locale === "ar"
              ? "تم فتح جميع الاستيكرات في نافذة المعاينة بنجاح"
              : "Stickers preview opened",
            { id: toastId },
          );
        } else {
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          iframe.src = objectUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              const w = window.open(objectUrl, "_blank");
              w?.focus();
              w?.print();
            }
          };
          toast.success(
            locale === "ar"
              ? "تم إرسال جميع الاستيكرات للطباعة بنجاح"
              : "All stickers sent to printer",
            { id: toastId },
          );
        }
      } catch (err) {
        console.error("[batch-stickers] Failed:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : locale === "ar"
            ? "حدث خطأ أثناء معالجة الاستيكرات"
            : "Error processing stickers",
          { id: toastId },
        );
      } finally {
        setBusyBatchStickers(false);
        setBatchStickerAction(null);
      }
    },
    [selectedItems, currentFolder, locale],
  );

  const handleBatchPrint = async (orientation: "portrait" | "landscape" = "portrait") => {
    setBatchPrintOrientation(orientation);
    if (selectedItems.length === 0) return;
    let printable = selectedItems.filter((i) => !i.isFolder);
    const selectedFolders = selectedItems.filter((i) => i.isFolder);

    if (printable.length === 0 && selectedFolders.length > 0) {
      const toastId = toast.loading(
        locale === "ar"
          ? "جارٍ تجميع ملفات المجلدات المحددة للطباعة…"
          : "Gathering printable files from selected folders…",
      );
      try {
        const res = await fetch("/api/drive/folders/descendants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderIds: selectedFolders.map((f) => f.id) }),
        });
        const data = await res.json();
        toast.dismiss(toastId);
        if (res.ok && Array.isArray(data.files) && data.files.length > 0) {
          setDescendantsCache((prev) => {
            const next = { ...prev };
            selectedFolders.forEach((f) => {
              next[f.id] = {
                files: data.files,
                folders: data.folders,
                descendantIds: data.descendantIds,
              };
            });
            return next;
          });
          if (data.folderTree) {
            setFolderChildren((prev) => ({ ...prev, ...data.folderTree }));
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            (data.descendantIds as string[]).forEach((id) => next.add(id));
            return next;
          });
          printable = data.files;
        } else {
          toast.error(
            locale === "ar"
              ? "لا توجد ملفات قابلة للطباعة داخل المجلدات المحددة."
              : "No printable files found inside the selected folders.",
          );
          return;
        }
      } catch {
        toast.dismiss(toastId);
        toast.error(t("print.notAvailable"));
        return;
      }
    }

    if (printable.length === 0) {
      toast.error(
        locale === "ar"
          ? "لا توجد ملفات قابلة للطباعة محددة."
          : t("print.notAvailable"),
      );
      return;
    }

    if (printable.length === 1) {
      window.open(`/print/${printable[0].id}?orientation=${orientation}`, "_blank");
      return;
    }

    setBatchPrintOpen(true);
  };

  const handleBatchDownload = async () => {
    let downloadable = selectedItems.filter((i) => !i.isFolder);
    const selectedFolders = selectedItems.filter((i) => i.isFolder);

    if (downloadable.length === 0 && selectedFolders.length > 0) {
      const toastId = toast.loading(
        locale === "ar" ? "جارٍ تجميع الملفات للتنزيل…" : "Gathering files to download…",
      );
      try {
        const res = await fetch("/api/drive/folders/descendants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderIds: selectedFolders.map((f) => f.id) }),
        });
        const data = await res.json();
        toast.dismiss(toastId);
        if (res.ok && Array.isArray(data.files) && data.files.length > 0) {
          downloadable = data.files;
        }
      } catch {
        toast.dismiss(toastId);
      }
    }

    if (downloadable.length === 0) {
      toast.error(
        locale === "ar"
          ? "لا توجد ملفات قابلة للتنزيل في التحديد."
          : "No downloadable files found in selection.",
      );
      return;
    }

    toast.info(t("batch.downloadStarted", { count: downloadable.length }));
    downloadable.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/api/drive/files/${item.id}/content?download=1`;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
  };

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
        if (Array.isArray(data.pinnedIds) && data.pinnedIds.length > 0) {
          setPinnedIds((prev) => {
            const next = new Set(prev);
            data.pinnedIds?.forEach((id) => next.add(id));
            return next;
          });
        }
        if (Array.isArray(data.customOrder) && data.customOrder.length > 0) {
          setCustomOrder((prev) => (prev.length > 0 ? prev : (data.customOrder ?? [])));
        }
        (data.items ?? []).forEach((item) => {
          if (item.isPinned) {
            setPinnedIds((prev) => new Set(prev).add(item.id));
          }
        });
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
    setSelectedIds(new Set());
    setSearch("");
    setDebouncedSearch("");
    setMenuId(null);
    if (mode === "all") {
      const url = id ? `/files?folder=${encodeURIComponent(id)}` : "/files";
      window.history.pushState(null, "", url);
    }
  };

  const openItem = (item: DriveItem) => {
    if (item.isFolder) {
      navigateFolder(item.id);
    } else {
      const currentUrl =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/files";
      router.push(`/preview/${item.id}?from=${encodeURIComponent(currentUrl)}`);
    }
  };

  const toggleFavorite = async (item: DriveItem) => {
    if (favoriteBusy) return;
    setFavoriteBusy(item.id);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry)),
    );
    setFolderChildren((current) => {
      const next: Record<string, DriveItem[]> = {};
      for (const [fId, children] of Object.entries(current)) {
        next[fId] = children.map((c) => (c.id === item.id ? { ...c, isFavorite: !c.isFavorite } : c));
      }
      return next;
    });
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
      setFolderChildren((current) => {
        const next: Record<string, DriveItem[]> = {};
        for (const [fId, children] of Object.entries(current)) {
          next[fId] = children.map((c) => (c.id === item.id ? { ...c, isFavorite: item.isFavorite } : c));
        }
        return next;
      });
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setFavoriteBusy(null);
    }
  };

  const submitNewFolder = async () => {
    if (!requireWritable()) return;
    if (!newFolderName.trim()) return;
    setCreating(true);
    const targetParentId = newFolderTargetParent?.id || (mode === "all" && folderId ? folderId : undefined);
    try {
      const response = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: targetParentId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.folderName"));
      setNewFolderName("");
      setNewFolderOpen(false);

      if (newFolderTargetParent?.id) {
        setExpandedFolderIds((prev) => new Set(prev).add(newFolderTargetParent.id));
        void fetchFolderChildren(newFolderTargetParent.id);
      }
      setNewFolderTargetParent(null);
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
      const newName = renameValue.trim();
      setItems((current) =>
        current.map((item) => (item.id === renameTarget.id ? { ...item, name: newName } : item)),
      );
      setFolderChildren((current) => {
        const next: Record<string, DriveItem[]> = {};
        for (const [fId, children] of Object.entries(current)) {
          next[fId] = children.map((c) => (c.id === renameTarget.id ? { ...c, name: newName } : c));
        }
        return next;
      });
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
      const moveFileId = moveTarget.shortcutId || moveTarget.id;
      const response = await fetch(`/api/drive/files/${moveFileId}`, {
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
    if (!deleteTarget) return;
    if (!activeProfile.canDelete) {
      toast.error(
        locale === "ar"
          ? "حذف الملفات متاح لحساب المدير المسؤول (البرنتنج) فقط"
          : "Deleting files is restricted to Admin (Printing)",
      );
      return;
    }
    if (!requireWritable()) return;
    setDeleting(true);
    try {
      const deleteFileId = deleteTarget.shortcutId || deleteTarget.id;
      const response = await fetch(`/api/drive/files/${deleteFileId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.deleted"));
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setFolderChildren((current) => {
        const next: Record<string, DriveItem[]> = {};
        for (const [fId, children] of Object.entries(current)) {
          next[fId] = children.filter((c) => c.id !== deleteTarget.id);
        }
        return next;
      });
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
          {currentFolder && (
            <div className="inline-flex items-center rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-0.5 shadow-xs">
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border-e border-indigo-500/20 select-none">
                <Tag className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">{locale === "ar" ? "الاستيكر" : "Sticker"}</span>
              </span>
              <button
                type="button"
                onClick={(e) => handleShowSticker(e, currentFolder)}
                disabled={busyStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-all"
                title={locale === "ar" ? `معاينة استيكر "${currentFolder.name}" (عرض)` : `Preview sticker for "${currentFolder.name}" (Show)`}
              >
                {busyStickerId === currentFolder.id && stickerAction === "show" ? (
                  <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Eye className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{locale === "ar" ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePrintSticker(e, currentFolder, "portrait")}
                disabled={busyStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-all border-s border-indigo-500/20"
                title={locale === "ar" ? `طباعة استيكر "${currentFolder.name}" بالطول (Portrait)` : `Print sticker for "${currentFolder.name}" in Portrait`}
              >
                {busyStickerId === currentFolder.id && stickerAction === "print" ? (
                  <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Printer className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{locale === "ar" ? "طباعة بالطول" : "Portrait"}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePrintSticker(e, currentFolder, "landscape")}
                disabled={busyStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-all border-s border-indigo-500/20"
                title={locale === "ar" ? `طباعة استيكر "${currentFolder.name}" بالعرض (Landscape)` : `Print sticker for "${currentFolder.name}" in Landscape`}
              >
                <span>{locale === "ar" ? "بالعرض" : "Landscape"}</span>
              </button>
            </div>
          )}
          {isCurrentFolderCanHaveExamStickers && currentFolder && (
            <div className="inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 p-0.5 shadow-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-200 border-e border-amber-500/25 select-none">
                <Files className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">
                  {isCurrentFolderFloor
                    ? locale === "ar"
                      ? "استيكرات الدور"
                      : "Floor Stickers"
                    : locale === "ar"
                    ? "استيكرات الامتحانات"
                    : "Exam Stickers"}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => handleShowExamStickers(e, currentFolder)}
                disabled={busyExamStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer transition-all"
                title={
                  locale === "ar"
                    ? isCurrentFolderFloor
                      ? `معاينة ملصقات كيسة امتحانات الدور "${currentFolder.name}" (مقاس A4)`
                      : `معاينة استيكرات الامتحانات لقاعة "${currentFolder.name}" (عرض)`
                    : isCurrentFolderFloor
                    ? `Preview floor exam bag placards for "${currentFolder.name}" (A4)`
                    : `Preview exam stickers for "${currentFolder.name}" (Show)`
                }
              >
                {busyExamStickerId === currentFolder.id && examStickerAction === "show" ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Eye className="size-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{locale === "ar" ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePrintExamStickers(e, currentFolder, "portrait")}
                disabled={busyExamStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer transition-all border-s border-amber-500/25"
                title={
                  locale === "ar"
                    ? isCurrentFolderFloor
                      ? `طباعة ملصقات كيسة امتحانات الدور "${currentFolder.name}" مباشرة (مقاس A4)`
                      : `طباعة استيكرات الامتحانات لقاعة "${currentFolder.name}" بالطول (Portrait)`
                    : isCurrentFolderFloor
                    ? `Print floor exam bag placards for "${currentFolder.name}" directly (A4)`
                    : `Print exam stickers for "${currentFolder.name}" in Portrait`
                }
              >
                {busyExamStickerId === currentFolder.id && examStickerAction === "print" ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Printer className="size-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{locale === "ar" ? "طباعة بالطول" : "Portrait"}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePrintExamStickers(e, currentFolder, "landscape")}
                disabled={busyExamStickerId === currentFolder.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer transition-all border-s border-amber-500/25"
                title={
                  locale === "ar"
                    ? `طباعة استيكرات الامتحانات لقاعة "${currentFolder.name}" بالعرض (Landscape)`
                    : `Print exam stickers for "${currentFolder.name}" in Landscape`
                }
              >
                <span>{locale === "ar" ? "بالعرض" : "Landscape"}</span>
              </button>
            </div>
          )}
          {currentFolder && (() => {
            const regCategory = isCurrentFolderRoom
              ? "student"
              : getFolderRegisterCategory({
                  folder: currentFolder,
                  breadcrumbs,
                  isCurrentFolder: true,
                });
            if (!regCategory) return null;

            const currentRegFile = findRegisterFileInItems(regCategory, items);
            const theme = getRegisterTheme(regCategory);
            const labelShort = locale === "ar" ? theme.shortAr : theme.shortEn;
            const labelAdd = locale === "ar" ? theme.addLabelAr : theme.addLabelEn;
            const regNameAr = theme.nameAr;
            const regNameEn = theme.nameEn;
            const canAdd = canProfileAddRegister(activeProfile.id, regCategory);

            if (currentRegFile) {
              return (
                <div className={cn("inline-flex items-center rounded-xl border p-0.5 shadow-xs", theme.chipBorderClass, theme.chipBgClass)}>
                  <button
                    type="button"
                    onClick={() => handleOpenRegisterDialog(currentFolder, regCategory)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border-e rounded-s cursor-pointer select-none transition-all",
                      theme.textClass,
                      theme.chipBorderClass,
                      theme.hoverBgClass,
                    )}
                    title={
                      locale === "ar"
                        ? `${regNameAr}: "${currentRegFile.name}" (اضغط للإدارة — المسؤول: ${theme.ownerAr})`
                        : `${regNameEn}: "${currentRegFile.name}" (Click to manage — Owner: ${theme.ownerEn})`
                    }
                  >
                    <RegisterIcon category={regCategory} className={cn("size-3.5", theme.iconColorClass)} />
                    <span className="hidden sm:inline">{labelShort}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShowRegisterFile(currentRegFile, currentFolder, regCategory)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all",
                      theme.textClass,
                      theme.hoverBgClass,
                    )}
                    title={
                      locale === "ar"
                        ? `معاينة ${regNameAr} "${currentFolder.name}" (عرض)`
                        : `Preview ${regNameEn.toLowerCase()} for "${currentFolder.name}" (Show)`
                    }
                  >
                    <Eye className={cn("size-3.5", theme.iconColorClass)} />
                    <span>{locale === "ar" ? "معاينة" : "Show"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintRegisterFile(currentRegFile, currentFolder, regCategory)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all",
                      theme.textClass,
                      theme.hoverBgClass,
                    )}
                    title={
                      locale === "ar"
                        ? `طباعة ${regNameAr} "${currentFolder.name}" مباشرة`
                        : `Print ${regNameEn.toLowerCase()} for "${currentFolder.name}" directly`
                    }
                  >
                    <Printer className={cn("size-3.5", theme.iconColorClass)} />
                    <span>{locale === "ar" ? "طباعة" : "Print"}</span>
                  </button>
                </div>
              );
            }

            if (!canAdd) return null;

            return (
              <button
                type="button"
                onClick={() => handleOpenRegisterDialog(currentFolder, regCategory)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all shadow-xs",
                  theme.borderClass,
                  theme.bgClass,
                  theme.textClass,
                  theme.hoverBgClass,
                )}
                title={
                  locale === "ar"
                    ? `إضافة ${regNameAr} (PDF) لـ "${currentFolder.name}" (المسؤول: ${theme.ownerAr})`
                    : `Add ${regNameEn} for "${currentFolder.name}" (Responsible: ${theme.ownerEn})`
                }
              >
                <RegisterIcon category={regCategory} className={cn("size-3.5", theme.iconColorClass)} />
                <span>{labelAdd}</span>
              </button>
            );
          })()}
          {currentFolder && (() => {
            const logisticsInfo = extractLogisticsHierarchy({
              breadcrumbs,
              currentFolder,
            });
            // Show button if we are inside a governorate, center, building, floor, or room
            if (!logisticsInfo.governorate && !logisticsInfo.center && !logisticsInfo.building) {
              return null;
            }

            const q = new URLSearchParams();
            if (logisticsInfo.cycle) q.set("cycle", logisticsInfo.cycle);
            if (logisticsInfo.exam) q.set("exam", logisticsInfo.exam);
            if (logisticsInfo.governorate) q.set("governorate", logisticsInfo.governorate);
            if (logisticsInfo.center) q.set("center", logisticsInfo.center);
            if (logisticsInfo.building) q.set("building", logisticsInfo.building);
            if (logisticsInfo.buildingFolderId) q.set("folderId", logisticsInfo.buildingFolderId);

            const targetLabel =
              logisticsInfo.building || logisticsInfo.center || logisticsInfo.governorate || currentFolder.name;

            return (
              <Link
                href={`/logistics?${q.toString()}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer transition-all shadow-xs"
                title={
                  locale === "ar"
                    ? `فتح مركز الاستيكرات واللوجستيات لـ "${targetLabel}" (ملء البيانات والحساب التلقائي)`
                    : `Open Logistics Hub for "${targetLabel}" (Auto-populates hierarchy)`
                }
              >
                <Boxes className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>{locale === "ar" ? "اللوجستيات والكراتين" : "Logistics Hub"}</span>
              </Link>
            );
          })()}
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          {!demoActive && (
            <Button
              variant="secondary"
              onClick={() => setSeedConfirmOpen(true)}
              disabled={seedingEst}
              className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer hidden md:inline-flex"
              title={
                locale === "ar"
                  ? "إنشاء هيكل مجلدات EST (December 2026 / EST 1) تلقائياً"
                  : "Auto-create EST folder structure (December 2026 / EST 1)"
              }
            >
              {seedingEst ? (
                <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <FolderTree className="size-4 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{locale === "ar" ? "إنشاء هيكل EST" : "Create EST Tree"}</span>
            </Button>
          )}
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
          {breadcrumbs.map((crumb, index) => {
            const parentCrumb = index > 0 ? breadcrumbs[index - 1] : null;
            return (
              <span key={crumb.id} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-muted/50 select-none">/</span>}
                <BreadcrumbDropdownItem
                  crumb={crumb}
                  parentCrumb={parentCrumb}
                  isCurrent={currentFolder?.id === crumb.id}
                  isDragOver={dragOverFolderId === crumb.id}
                  draggedItem={draggedItem}
                  locale={locale as Locale}
                  onNavigate={navigateFolder}
                  onDragOver={handleDragOverFolder}
                  onDragLeave={handleDragLeaveFolder}
                  onDrop={handleDropOnFolder}
                  folderChildren={folderChildren}
                  fetchFolderChildren={fetchFolderChildren}
                />
              </span>
            );
          })}
        </nav>
      )}

      {/* Quick EST Schools Seed Banner if inside EST 1 / EST 2 and Schools folder is missing */}
      {!demoActive &&
        currentFolder &&
        /^EST\s*[12]$/i.test(currentFolder.name.trim()) &&
        !items.some((i) => i.isFolder && /^schools$/i.test(i.name.trim())) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-950 dark:text-indigo-200">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <FolderTree className="size-5" />
              </span>
              <div>
                <p className="font-bold text-foreground">
                  {locale === "ar"
                    ? "مجلد المدارس (Schools) غير موجود هنا بعد"
                    : "Schools folder is not created here yet"}
                </p>
                <p className="text-xs text-muted">
                  {locale === "ar"
                    ? "اضغط هنا لإنشاء فولدر Schools بالـ 18 مدرسة وأدوارها وقاعاتها وتفريغ المحافظات فوراً"
                    : "Click here to create Schools folder with all 18 schools, floors, rooms, and clear governorate folders"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSeedConfirmOpen(true)}
              disabled={seedingEst}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 cursor-pointer shadow-sm shadow-indigo-500/25"
            >
              {seedingEst ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              <span>{locale === "ar" ? "إنشاء مجلد Schools الآن" : "Create Schools Folder Now"}</span>
            </Button>
          </div>
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
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-strong cursor-pointer"
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
              className="h-10 w-full sm:w-auto min-w-[120px] text-xs sm:text-sm cursor-pointer"
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
            className="h-10 w-full sm:w-auto min-w-[140px] text-xs sm:text-sm cursor-pointer"
            aria-label={t("common.sortBy")}
          >
            {SORTS.map((entry) => (
              <option key={entry} value={entry}>
                {t(sortLabelKey(entry))}
              </option>
            ))}
          </Select>

          <Select
            value={printFilter}
            onChange={(event) => setPrintFilter(event.target.value as "all" | "printed" | "pending")}
            className="h-10 w-full sm:w-auto min-w-[140px] text-xs sm:text-sm cursor-pointer"
            aria-label={t("print.filterAll")}
          >
            <option value="all">{t("print.filterAll")}</option>
            <option value="printed">✓ {t("print.filterPrinted")}</option>
            <option value="pending">⏳ {t("print.filterPending")}</option>
          </Select>

          <div className="flex items-center gap-1 rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn("rounded-lg p-1.5 cursor-pointer", effectiveView === "grid" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
              title={t("common.viewGrid")}
              aria-label={t("common.viewGrid")}
            >
              <Grid2X2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("rounded-lg p-1.5 cursor-pointer", effectiveView === "list" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
              title={t("common.viewList")}
              aria-label={t("common.viewList")}
            >
              <List className="size-4" />
            </button>
          </div>

          {effectiveView === "list" && totalKnownFolders.size > 0 && (
            <button
              type="button"
              onClick={allExpanded ? collapseAllFolders : expandAllFolders}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                allExpanded
                  ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
                  : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-soft",
              )}
              title={
                allExpanded
                  ? locale === "ar"
                    ? "طي جميع المجلدات"
                    : "Collapse all folders"
                  : locale === "ar"
                    ? "توسيع وعرض جميع المجلدات ومحتوياتها"
                    : "Expand all folders"
              }
            >
              {allExpanded ? (
                <>
                  <FolderMinus className="size-3.5 text-accent" />
                  <span className="hidden sm:inline">{locale === "ar" ? "طي الكل" : "Collapse All"}</span>
                </>
              ) : (
                <>
                  <FolderTree className="size-3.5" />
                  <span className="hidden sm:inline">{locale === "ar" ? "توسيع الكل" : "Expand All"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {(search || categoryFilter || printFilter !== "all" || (mode === "all" && folderId)) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              {t("common.showing")} {formatNumber(displayItems.length, locale as Locale)} {t("common.items")}
            </span>
            {(search || categoryFilter || printFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                  setPrintFilter("all");
                }}
                className="inline-flex items-center gap-1 rounded-full bg-surface-strong px-2 py-0.5 font-medium hover:bg-border cursor-pointer"
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
      ) : displayItems.length === 0 && !loading ? (
        printFilter !== "all" || debouncedSearch || mode === "favorites" || mode === "recent" ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={
              printFilter !== "all"
                ? printFilter === "pending"
                  ? t("print.filterPending")
                  : t("print.filterPrinted")
                : debouncedSearch
                  ? t("files.searchEmptyTitle")
                  : mode === "favorites"
                    ? t("favorites.emptyTitle")
                    : t("recent.emptyTitle")
            }
            description={
              printFilter !== "all"
                ? t("files.searchEmptyHint")
                : debouncedSearch
                  ? t("files.searchEmptyHint")
                  : mode === "favorites"
                    ? t("favorites.emptyHint")
                    : t("recent.emptyHint")
            }
            action={
              printFilter !== "all" ? (
                <Button variant="secondary" onClick={() => setPrintFilter("all")}>
                  {t("print.filterAll")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          /* Direct Drag & Drop Zone for empty folder - immediate upload with no extra buttons */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!demoActive && !directUploading) setEmptyDropDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEmptyDropDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEmptyDropDragging(false);
              if (demoActive || directUploading) return;
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const filesList = Array.from(e.dataTransfer.files);
                void handleDirectFilesUpload(filesList);
              }
            }}
            onClick={() => {
              if (!demoActive && !directUploading) emptyDropInputRef.current?.click();
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-14 text-center transition-all cursor-pointer",
              emptyDropDragging
                ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 scale-[1.01]"
                : "border-border/80 bg-surface/40 hover:border-emerald-500/60 hover:bg-surface-soft hover:shadow-md",
              (demoActive || directUploading) && "opacity-60 cursor-not-allowed",
            )}
          >
            {directUploading ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in fade-in-50">
                <Loader2 className="size-12 animate-spin text-emerald-600 dark:text-emerald-400 mb-3" />
                <p className="text-base sm:text-lg font-bold text-foreground">
                  {locale === "ar" ? "جاري رفع الملفات مباشرة داخل هذا المجلد..." : "Uploading files directly into this folder..."}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {locale === "ar" ? "يرجى الانتظار، سيتم حفظ الملفات بأسمائها الأصلية فوراً" : "Please wait, files will be saved with their exact original names"}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "mb-4 flex size-16 items-center justify-center rounded-2xl transition-transform duration-200",
                    emptyDropDragging
                      ? "bg-emerald-500 text-white scale-110"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110",
                  )}
                >
                  <CloudUpload className="size-8" />
                </div>

                <p className="text-base sm:text-lg font-bold text-foreground">
                  {emptyDropDragging ? (
                    t("upload.dragActive")
                  ) : (
                    <>
                      <span>{t("common.dropFiles")}</span>{" "}
                      <span className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-500/50 group-hover:decoration-emerald-500 transition-colors">
                        {t("common.browse")}
                      </span>
                    </>
                  )}
                </p>

                <p className="mt-2 text-xs text-muted max-w-sm">
                  {locale === "ar"
                    ? "اسحب ملفات PDF أو Excel أو أي مستندات هنا لرفعها مباشرة داخل هذا المجلد"
                    : "Drop PDF, Excel, or any files here to upload directly into this folder"}
                </p>
              </>
            )}

            <input
              ref={emptyDropInputRef}
              type="file"
              multiple
              disabled={directUploading || demoActive}
              className="hidden"
              accept={allowedExtensions.map((ext) => `.${ext}`).join(",")}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const filesList = Array.from(e.target.files);
                  void handleDirectFilesUpload(filesList);
                  e.target.value = "";
                }
              }}
            />
          </div>
        )
      ) : effectiveView === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {displayItems.map((item) => {
            const isPrinted = !item.isFolder && printedIds.has(item.id);
            const isPending = !item.isFolder && !printedIds.has(item.id);
            const isPinned = pinnedIds.has(item.id) || Boolean(item.isPinned);

            return (
              <div
                key={item.id}
                draggable={!demoActive}
                onDragStart={(e) => handleDragStartItem(e, item)}
                onDragEnd={handleDragEndItem}
                onDragOver={(e) => {
                  if (item.isFolder) handleDragOverFolder(e, item);
                }}
                onDragLeave={(e) => {
                  if (item.isFolder) handleDragLeaveFolder(e, item);
                }}
                onDrop={(e) => {
                  if (item.isFolder) handleDropOnFolder(e, item);
                }}
                onClick={() => openItem(item)}
                className={cn(
                  "file-card relative transition-all cursor-pointer group select-none",
                  dragOverFolderId === item.id &&
                  "ring-2 ring-accent border-accent bg-accent/15 scale-[1.02] shadow-lg",
                  draggedItem?.id === item.id && "opacity-40 border-dashed",
                  selectedIds.has(item.id) && "ring-2 ring-accent border-accent bg-accent/5",
                  !selectedIds.has(item.id) &&
                  isPrinted &&
                  "border-emerald-500/40 bg-emerald-500/[0.04] shadow-sm shadow-emerald-500/5 hover:border-emerald-500/60",
                  !selectedIds.has(item.id) &&
                  isPending &&
                  "border-amber-500/40 bg-amber-500/[0.03] hover:border-amber-500/60",
                )}
              >
                {dragOverFolderId === item.id && (
                  <div className="rounded-lg bg-accent px-2 py-1 text-center text-xs font-bold text-white shadow-xs animate-pulse">
                    📥 {locale === "ar" ? "إفلات للنقل هنا" : "Drop to move here"}
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CheckboxInput
                      checked={item.isFolder ? getFolderCheckState(item.id).checked : selectedIds.has(item.id)}
                      indeterminate={item.isFolder ? getFolderCheckState(item.id).indeterminate : false}
                      onChange={(e) => toggleSelect(item.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4 rounded border-border accent-accent cursor-pointer"
                      ariaLabel={`Select ${item.name}`}
                    />
                    <div className="min-w-0 text-start">
                      <FileIcon category={item.category} extension={item.extension} size="lg" isShortcut={item.isShortcut} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(item)}
                      disabled={favoriteBusy === item.id}
                      className={cn("icon-btn size-8 cursor-pointer", item.isFavorite && "text-amber-500")}
                      title={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
                      aria-label={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
                    >
                      <Star className={cn("size-4", item.isFavorite && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePin(item)}
                      className={cn(
                        "icon-btn size-8 cursor-pointer transition-colors",
                        isPinned ? "text-amber-500 bg-amber-500/10" : "text-muted hover:text-foreground",
                      )}
                      title={isPinned ? t("common.unpinFromTop") : t("common.pinToTop")}
                      aria-label={isPinned ? t("common.unpinFromTop") : t("common.pinToTop")}
                    >
                      <Pin className={cn("size-4", isPinned && "fill-current")} />
                    </button>
                    {(() => {
                      const regCategory = getFolderRegisterCategory({
                        folder: item,
                        breadcrumbs,
                        isCurrentFolder: false,
                      });
                      const regFile = regCategory ? findRegisterFileInItems(regCategory, folderChildren[item.id]) : undefined;
                      return (
                        <ItemMenu
                          item={item}
                          isPrinted={isPrinted}
                          isPinned={isPinned}
                          onTogglePin={() => void togglePin(item)}
                          onReorderItem={handleReorderItem}
                          onTogglePrint={() => void togglePrintStatus(item)}
                          onShowSticker={(folder) => handleShowSticker(null, folder)}
                          onPrintSticker={(folder, orientation) => handlePrintSticker(null, folder, orientation)}
                          onShowExamStickers={(folder) => handleShowExamStickers(null, folder)}
                          onPrintExamStickers={(folder, orientation) => handlePrintExamStickers(null, folder, orientation)}
                          onOpenProctorDialog={handleOpenProctorDialog}
                          onShowProctorFile={handleShowProctorFile}
                          onPrintProctorFile={handlePrintProctorFile}
                          proctorFile={regFile}
                          registerFile={regFile}
                          registerCategory={regCategory}
                          breadcrumbs={breadcrumbs}
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
                      );
                    })()}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="block truncate text-start text-sm font-semibold group-hover:text-accent transition-colors">
                      {item.name}
                    </span>
                    {item.isShortcut && (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20">
                        ↗ {locale === "ar" ? "اختصار" : "Shortcut"}
                      </span>
                    )}
                    {isPinned && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Pin className="size-2.5 fill-current" />
                        {t("common.pinned")}
                      </span>
                    )}
                  </div>
                  <ExamBadges name={item.name} isRoomFolder={isCurrentFolderRoom && !item.isFolder} />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {!item.isFolder && (
                      isPrinted ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                          {t("print.statusPrinted")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                          {t("print.statusPending")}
                        </span>
                      )
                    )}
                    <span className="text-xs text-muted">
                      {item.isFolder ? t("common.folder") : formatBytes(item.size, locale as Locale)} ·{" "}
                      {formatDate(item.modifiedTime, locale as Locale)}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openItem(item)} className="chip hover:bg-border cursor-pointer">
                    {item.isFolder ? t("common.open") : t("common.preview")}
                  </button>
                  {!item.isFolder && (
                    <div className="inline-flex items-center rounded-lg border border-border/70 bg-surface-soft p-0.5 text-xs">
                      <a
                        href={`/print/${item.id}?orientation=portrait`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface rounded text-foreground cursor-pointer"
                        title={locale === "ar" ? "طباعة الملف بالطول (Portrait)" : "Print Portrait"}
                      >
                        <Printer className="size-3 text-muted" />
                        <span className="text-[10px]">{locale === "ar" ? "طولي" : "Port"}</span>
                      </a>
                      <a
                        href={`/print/${item.id}?orientation=landscape`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface rounded text-foreground cursor-pointer border-s border-border/50"
                        title={locale === "ar" ? "طباعة الملف بالعرض (Landscape)" : "Print Landscape"}
                      >
                        <span className="text-[10px]">{locale === "ar" ? "عرضي" : "Land"}</span>
                      </a>
                    </div>
                  )}
                  {item.isFolder && (
                    <>
                      <div className="inline-flex items-center rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-0.5 text-xs">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border-e border-indigo-500/20 select-none">
                          <Tag className="size-3 text-indigo-600 dark:text-indigo-400" />
                          <span>{locale === "ar" ? "استيكر" : "Sticker"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleShowSticker(e, item)}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center justify-center size-6 rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                          title={locale === "ar" ? `معاينة استيكر "${item.name}" (عرض)` : `Preview sticker for "${item.name}" (Show)`}
                        >
                          {busyStickerId === item.id && stickerAction === "show" ? (
                            <Loader2 className="size-3 animate-spin text-indigo-600" />
                          ) : (
                            <Eye className="size-3 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePrintSticker(e, item, "portrait")}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer border-s border-indigo-500/20"
                          title={locale === "ar" ? `طباعة استيكر "${item.name}" بالطول (Portrait)` : `Print sticker for "${item.name}" in Portrait`}
                        >
                          {busyStickerId === item.id && stickerAction === "print" ? (
                            <Loader2 className="size-3 animate-spin text-indigo-600" />
                          ) : (
                            <Printer className="size-3 text-indigo-600 dark:text-indigo-400" />
                          )}
                          <span className="text-[10px]">{locale === "ar" ? "طولي" : "Port"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePrintSticker(e, item, "landscape")}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer border-s border-indigo-500/20"
                          title={locale === "ar" ? `طباعة استيكر "${item.name}" بالعرض (Landscape)` : `Print sticker for "${item.name}" in Landscape`}
                        >
                          <span className="text-[10px]">{locale === "ar" ? "عرضي" : "Land"}</span>
                        </button>
                      </div>

                      {(() => {
                        const regCategory = getFolderRegisterCategory({
                          folder: item,
                          breadcrumbs,
                          isCurrentFolder: false,
                        });
                        if (!regCategory) return null;

                        const regFile = findRegisterFileInItems(regCategory, folderChildren[item.id]);
                        const theme = getRegisterTheme(regCategory);
                        const regNameAr = theme.nameAr;
                        const regNameEn = theme.nameEn;
                        const chipLabel = locale === "ar" ? theme.shortAr : theme.shortEn;
                        const chipAddLabel = locale === "ar" ? theme.addLabelAr : theme.addLabelEn;
                        const canAdd = canProfileAddRegister(activeProfile.id, regCategory);

                        if (regFile) {
                          return (
                            <div className={cn("inline-flex items-center rounded-lg border p-0.5 text-xs shadow-2xs", theme.chipBorderClass, theme.chipBgClass)}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRegisterDialog(item, regCategory);
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold border-e rounded-s cursor-pointer select-none",
                                  theme.textClass,
                                  theme.chipBorderClass,
                                  theme.hoverBgClass,
                                )}
                                title={
                                  locale === "ar"
                                    ? `${regNameAr}: "${regFile.name}" (اضغط للإدارة — المسؤول: ${theme.ownerAr})`
                                    : `${regNameEn}: "${regFile.name}" (Click to manage — Owner: ${theme.ownerEn})`
                                }
                              >
                                <RegisterIcon category={regCategory} className={cn("size-3", theme.iconColorClass)} />
                                <span>{chipLabel}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowRegisterFile(regFile, item, regCategory);
                                }}
                                className={cn("inline-flex items-center justify-center size-6 rounded cursor-pointer", theme.hoverBgClass, theme.textClass)}
                                title={
                                  locale === "ar"
                                    ? `معاينة ${regNameAr} "${item.name}" (عرض)`
                                    : `Preview ${regNameEn.toLowerCase()} for "${item.name}" (Show)`
                                }
                              >
                                <Eye className={cn("size-3", theme.iconColorClass)} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintRegisterFile(regFile, item, regCategory);
                                }}
                                className={cn("inline-flex items-center justify-center size-6 rounded cursor-pointer", theme.hoverBgClass, theme.textClass)}
                                title={
                                  locale === "ar"
                                    ? `طباعة ${regNameAr} "${item.name}" مباشرة`
                                    : `Print ${regNameEn.toLowerCase()} for "${item.name}" directly`
                                }
                              >
                                <Printer className={cn("size-3", theme.iconColorClass)} />
                              </button>
                            </div>
                          );
                        }

                        if (!canAdd) return null;

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRegisterDialog(item, regCategory);
                            }}
                            className={cn(
                              "chip border flex items-center gap-1 cursor-pointer font-bold text-xs transition-all",
                              theme.borderClass,
                              theme.bgClass,
                              theme.textClass,
                              theme.hoverBgClass,
                            )}
                            title={
                              locale === "ar"
                                ? `إضافة ${regNameAr} (PDF) داخل "${item.name}" (المسؤول: ${theme.ownerAr})`
                                : `Add ${regNameEn} (PDF) into "${item.name}" (Responsible: ${theme.ownerEn})`
                            }
                          >
                            <RegisterIcon category={regCategory} className={cn("size-3", theme.iconColorClass)} />
                            <span>{chipAddLabel}</span>
                          </button>
                        );
                      })()}
                    </>
                  )}
                  {!item.isFolder && (
                    <a
                      href={`/print/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip hover:bg-border flex items-center gap-1 text-accent cursor-pointer"
                      title={t("common.print")}
                    >
                      <Printer className="size-3" />
                      {t("common.print")}
                    </a>
                  )}
                  {!item.isFolder && (
                    <a
                      href={`/api/drive/files/${item.id}/content?download=1`}
                      className="icon-btn ms-auto size-8 cursor-pointer"
                      title={t("common.download")}
                      aria-label={t("common.download")}
                    >
                      <Download className="size-4" />
                    </a>
                  )}
                  {item.isDemo && <span className="chip">{t("common.demo")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft text-start text-xs text-muted">
                  <th className="w-10 px-3 py-3 text-center">
                    <CheckboxInput
                      checked={allKnownItems.length > 0 && selectedIds.size >= allKnownItems.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < allKnownItems.length}
                      onChange={() => void selectAll()}
                      className="size-4 rounded border-border accent-accent cursor-pointer"
                      title={t("batch.selectAll")}
                      ariaLabel={t("batch.selectAll")}
                    />
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileName")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileType")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.fileSize")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("common.modified")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => (
                  <TreeRow
                    key={item.id}
                    item={item}
                    depth={0}
                    isRoomFolder={isCurrentFolderRoom}
                    expandedFolderIds={expandedFolderIds}
                    loadingFolderIds={loadingFolderIds}
                    folderChildren={folderChildren}
                    printedIds={printedIds}
                    selectedIds={selectedIds}
                    printFilter={printFilter}
                    menuId={menuId}
                    demoActive={demoActive}
                    getFolderCheckState={getFolderCheckState}
                    onToggleExpand={toggleFolderExpand}
                    onToggleSelect={toggleSelect}
                    onOpenItem={openItem}
                    onToggleFavorite={toggleFavorite}
                    onTogglePrintStatus={togglePrintStatus}
                    onMenuToggle={(id) => setMenuId(menuId === id ? null : id)}
                    onMenuClose={() => setMenuId(null)}
                    onRename={(target) => {
                      if (!requireWritable()) return;
                      setRenameTarget(target);
                      setRenameValue(target.name);
                      setMenuId(null);
                    }}
                    onMove={(target) => {
                      if (!requireWritable()) return;
                      setMoveTarget(target);
                      setMenuId(null);
                    }}
                    onDelete={(target) => {
                      if (!requireWritable()) return;
                      setDeleteTarget(target);
                      setMenuId(null);
                    }}
                    onNewSubFolder={handleOpenNewSubFolder}
                    onUploadToFolder={handleOpenUploadForFolder}
                    onShowSticker={handleShowSticker}
                    onPrintSticker={handlePrintSticker}
                    onShowExamStickers={handleShowExamStickers}
                    onPrintExamStickers={handlePrintExamStickers}
                    onOpenProctorDialog={handleOpenProctorDialog}
                    onShowProctorFile={handleShowProctorFile}
                    onPrintProctorFile={handlePrintProctorFile}
                    breadcrumbs={breadcrumbs}
                    busyStickerId={busyStickerId}
                    stickerAction={stickerAction}
                    busyExamStickerId={busyExamStickerId}
                    examStickerAction={examStickerAction}
                    draggedItem={draggedItem}
                    dragOverFolderId={dragOverFolderId}
                    onDragStartItem={handleDragStartItem}
                    onDragEndItem={handleDragEndItem}
                    onDragOverFolder={handleDragOverFolder}
                    onDragLeaveFolder={handleDragLeaveFolder}
                    onDropOnFolder={handleDropOnFolder}
                    isPinned={pinnedIds.has(item.id) || Boolean(item.isPinned)}
                    onTogglePin={togglePin}
                    onReorderItem={handleReorderItem}
                    onReorderDragStart={handleReorderDragStart}
                    onReorderDragEnd={handleReorderDragEnd}
                    onReorderDragOver={handleReorderDragOver}
                    onReorderDrop={handleReorderDrop}
                    reorderOverId={reorderOverId}
                    reorderDraggedId={reorderDraggedId}
                  />
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
        onClose={() => {
          setUploadOpen(false);
          setUploadTargetFolder(null);
          setPendingUploadFiles(null);
        }}
        targetFolderId={uploadTargetFolder?.id ?? (mode === "all" ? folderId : null)}
        targetFolderName={uploadTargetFolder?.name ?? (mode === "all" ? currentFolder?.name ?? null : null)}
        demo={demoActive}
        maxUploadSizeMb={maxUploadSizeMb}
        allowedExtensions={allowedExtensions}
        allowMultiple={allowMultiple}
        initialFiles={pendingUploadFiles}
        onUploaded={() => {
          if (uploadTargetFolder?.id) {
            setExpandedFolderIds((prev) => new Set(prev).add(uploadTargetFolder.id));
            void fetchFolderChildren(uploadTargetFolder.id);
          }
          refresh();
        }}
      />

      <Modal
        open={newFolderOpen}
        onClose={() => {
          setNewFolderOpen(false);
          setNewFolderTargetParent(null);
        }}
        title={
          newFolderTargetParent
            ? locale === "ar"
              ? `مجلد جديد داخل "${newFolderTargetParent.name}"`
              : `New folder inside "${newFolderTargetParent.name}"`
            : t("common.newFolder")
        }
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setNewFolderOpen(false);
                setNewFolderTargetParent(null);
              }}
            >
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

      {/* Floating Drag Helper Pill */}
      {draggedItem && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-accent bg-surface-strong/95 px-5 py-2.5 text-xs font-semibold text-foreground shadow-2xl backdrop-blur-md animate-bounce pointer-events-none">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white text-xs">
            {draggedItem.isFolder ? "📁" : "📄"}
          </span>
          <span>
            {locale === "ar"
              ? `اسحب "${draggedItem.name}" وأفلته فوق أي مجلد أو مسار لنقله`
              : `Drag "${draggedItem.name}" and drop onto any folder or breadcrumb to move it`}
          </span>
        </div>
      )}

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

      <ConfirmDialog
        open={seedConfirmOpen}
        onClose={() => setSeedConfirmOpen(false)}
        onConfirm={() => void handleSeedEst()}
        title={locale === "ar" ? "إنشاء هيكل مجلدات المدارس لاختبارات EST" : "Create EST Schools Folder Structure"}
        description={
          locale === "ar"
            ? "سيتم إنشاء وتحديث مجلد المدارس الرسمي (فولدر Schools يحتوي على 18 مدرسة، جميع الأدوار، والقاعات) مع المحافظات الفارغة داخل Google Drive مباشرة. هل تريد المتابعة؟"
            : "This will automatically create/update the official Schools folder (Schools folder with 18 schools, all floors, and rooms) and empty governorates in Google Drive. Continue?"
        }
        confirmLabel={locale === "ar" ? "بدء الإنشاء" : "Create Structure"}
        loading={seedingEst}
      />

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 rounded-2xl border border-border bg-surface-strong/95 px-3 sm:px-5 py-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw] sm:max-w-fit">
          <div className="flex items-center gap-1.5 border-e border-border/60 pe-2 sm:pe-3 text-xs font-bold text-foreground">
            <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-accent text-white text-[10px] sm:text-[11px] font-mono">
              {selectedIds.size}
            </span>
            <span className="hidden sm:inline">
              {selectedFolderCount > 0
                ? locale === "ar"
                  ? `${selectedIds.size} محدد (${selectedFilesCount} ملف، ${selectedFolderCount} مجلد)`
                  : `${selectedIds.size} selected (${selectedFilesCount} files, ${selectedFolderCount} folders)`
                : t("batch.selected", { count: selectedIds.size })}
            </span>
            {loadingDescendantIds.size > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-accent animate-pulse font-normal">
                <Loader2 className="size-3 animate-spin" />
                <span className="hidden md:inline">
                  {locale === "ar" ? "فحص المجلدات…" : "Scanning folders…"}
                </span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {/* Batch Regular Stickers Action Button */}
            <div className="inline-flex items-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setBatchStickersInitialType("regular");
                  setBatchStickersOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 rounded-s-lg border-e border-indigo-500/25 transition-all cursor-pointer"
                title={
                  locale === "ar"
                    ? "خيارات استيكرات العناصر المحددة (تحديد النطاق والاتجاه)"
                    : "Options for selected folder stickers"
                }
              >
                <Tag className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {locale === "ar"
                    ? `استيكرات (${selectedFolderCount > 0 ? selectedFolderCount : 1})`
                    : `Stickers (${selectedFolderCount > 0 ? selectedFolderCount : 1})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchStickersAction({ action: "show", type: "regular" })}
                disabled={busyBatchStickers}
                className="inline-flex items-center justify-center size-7 rounded hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                title={
                  locale === "ar"
                    ? "معاينة استيكرات العناصر المحددة في مستند PDF موحد (Show)"
                    : "Preview unified stickers in new tab (Show)"
                }
                aria-label="Preview Stickers"
              >
                {busyBatchStickers && batchStickerAction === "show" && batchStickerType === "regular" ? (
                  <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Eye className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleBatchStickersAction({ action: "print", type: "regular", orientation: "portrait" })}
                disabled={busyBatchStickers}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer border-s border-indigo-500/25"
                title={
                  locale === "ar"
                    ? "طباعة استيكرات العناصر المحددة بالطول (Portrait)"
                    : "Print unified stickers in Portrait"
                }
                aria-label="Print Stickers Portrait"
              >
                {busyBatchStickers && batchStickerAction === "print" && batchStickerType === "regular" ? (
                  <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Printer className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{locale === "ar" ? "طولي" : "Port"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchStickersAction({ action: "print", type: "regular", orientation: "landscape" })}
                disabled={busyBatchStickers}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer border-s border-indigo-500/25"
                title={
                  locale === "ar"
                    ? "طباعة استيكرات العناصر المحددة بالعرض (Landscape)"
                    : "Print unified stickers in Landscape"
                }
                aria-label="Print Stickers Landscape"
              >
                <span>{locale === "ar" ? "عرضي" : "Land"}</span>
              </button>
            </div>

            {/* Exam Stickers Action Button (shown whenever folders/rooms/floors/buildings are selected or in a room/floor) */}
            {(selectedFolderCount > 0 || (isCurrentFolderCanHaveExamStickers && currentFolder)) && (
              <div className="inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setBatchStickersInitialType("exam");
                    setBatchStickersOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 rounded-s-lg border-e border-amber-500/25 transition-all cursor-pointer"
                  title={
                    locale === "ar"
                      ? "طباعة استيكرات الامتحانات للمجلدات المحددة أو القاعة"
                      : "Print Exam Stickers for selected folders or room"
                  }
                >
                  <Files className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    {locale === "ar"
                      ? `استيكرات الامتحانات (${selectedFolderCount > 0 ? selectedFolderCount : 1})`
                      : `Exam Stickers (${selectedFolderCount > 0 ? selectedFolderCount : 1})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchStickersAction({ action: "show", type: "exam", includeChildren: true })}
                  disabled={busyBatchStickers}
                  className="inline-flex items-center justify-center size-7 rounded hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 transition-all cursor-pointer"
                  title={
                    locale === "ar"
                      ? "معاينة استيكرات الامتحانات للمجلدات أو القاعة (Show)"
                      : "Preview exam stickers for folders or room (Show)"
                  }
                  aria-label="Preview Exam Stickers"
                >
                  {busyBatchStickers && batchStickerAction === "show" && batchStickerType === "exam" ? (
                    <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Eye className="size-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchStickersAction({ action: "print", type: "exam", includeChildren: true, orientation: "portrait" })}
                  disabled={busyBatchStickers}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 transition-all cursor-pointer border-s border-amber-500/25"
                  title={
                    locale === "ar"
                      ? "طباعة استيكرات الامتحانات للمجلدات أو القاعة بالطول (Portrait)"
                      : "Print exam stickers in Portrait"
                  }
                  aria-label="Print Exam Stickers Portrait"
                >
                  {busyBatchStickers && batchStickerAction === "print" && batchStickerType === "exam" ? (
                    <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Printer className="size-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>{locale === "ar" ? "طولي" : "Port"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchStickersAction({ action: "print", type: "exam", includeChildren: true, orientation: "landscape" })}
                  disabled={busyBatchStickers}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 transition-all cursor-pointer border-s border-amber-500/25"
                  title={
                    locale === "ar"
                      ? "طباعة استيكرات الامتحانات للمجلدات أو القاعة بالعرض (Landscape)"
                      : "Print exam stickers in Landscape"
                  }
                  aria-label="Print Exam Stickers Landscape"
                >
                  <span>{locale === "ar" ? "عرضي" : "Land"}</span>
                </button>
              </div>
            )}

            <div className="inline-flex items-center rounded-xl border border-border bg-surface-soft p-0.5 shadow-sm">
              <Button
                variant="primary"
                onClick={() => handleBatchPrint("portrait")}
                className="text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1 shadow-sm rounded-lg"
                title={locale === "ar" ? "طباعة الملفات المحددة بالطول (Portrait)" : "Print selected files in Portrait"}
              >
                <Printer className="size-3.5 sm:size-4" />
                <span>{locale === "ar" ? "طباعة (طولي)" : "Print (Portrait)"}</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBatchPrint("landscape")}
                className="text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1 rounded-lg ms-1"
                title={locale === "ar" ? "طباعة الملفات المحددة بالعرض (Landscape)" : "Print selected files in Landscape"}
              >
                <Printer className="size-3.5 sm:size-4" />
                <span>{locale === "ar" ? "عرضي" : "Landscape"}</span>
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={() => void handleBatchMarkPrinted()}
              className="text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1"
            >
              <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500" />
              <span>{t("batch.markPrinted")}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleBatchDownload}
              className="text-xs py-1.5 px-2 sm:px-3 flex items-center gap-1"
            >
              <Download className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">{t("batch.downloadSelected")}</span>
            </Button>

            {activeProfile.canDelete && (
              <Button
                variant="danger"
                onClick={() => setBatchDeleteOpen(true)}
                className="text-xs py-1.5 px-2 sm:px-3 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">{t("batch.deleteSelected")}</span>
              </Button>
            )}

            <button
              type="button"
              onClick={clearSelection}
              className="icon-btn size-7 text-muted hover:text-foreground"
              title={t("batch.deselectAll")}
            >
              <X className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => void handleBatchDelete()}
        title={t("batch.deleteConfirmTitle")}
        description={t("batch.deleteConfirmDesc", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        loading={batchDeleting}
      />

      {/* Batch Print Dialog */}
      <BatchPrintDialog
        open={batchPrintOpen}
        onClose={() => setBatchPrintOpen(false)}
        selectedItems={selectedItems}
        isLoading={loadingDescendantIds.size > 0}
        onOpenStickers={() => setBatchStickersOpen(true)}
        initialOrientation={batchPrintOrientation}
      />

      {/* Batch Stickers Dialog */}
      <BatchStickersDialog
        open={batchStickersOpen}
        onClose={() => setBatchStickersOpen(false)}
        selectedFolders={selectedItems.filter((i) => i.isFolder)}
        currentFolder={currentFolder}
        initialType={batchStickersInitialType}
        loading={busyBatchStickers}
        onExecute={handleBatchStickersAction}
      />

      {/* In-app PDF Preview Modal (Stickers & Proctor Registers) */}
      <StickerPreviewModal
        open={previewPdfState.open}
        onClose={() => setPreviewPdfState({ open: false, url: null })}
        pdfUrl={previewPdfState.url}
        title={previewPdfState.title}
        customTitle={previewPdfState.customTitle}
        customDescription={previewPdfState.customDescription}
      />

      {/* Add / Manage Register Dialog (Building Excel / Room Student Register) */}
      <AddProctorDialog
        open={proctorDialogOpen}
        onClose={() => {
          setProctorDialogOpen(false);
          setProctorDialogFolder(null);
        }}
        folder={proctorDialogFolder}
        registerType={proctorDialogType || undefined}
        currentProctorFile={
          proctorDialogFolder
            ? findRegisterFileInItems(proctorDialogType, folderChildren[proctorDialogFolder.id]) ||
              (currentFolder?.id === proctorDialogFolder.id ? findRegisterFileInItems(proctorDialogType, items) : undefined)
            : undefined
        }
        hierarchyInfo={proctorDialogFolder ? getHierarchyInfoForFolder(proctorDialogFolder) : undefined}
        onSuccess={handleProctorUploaded}
        onPreviewFile={(file) => handleShowRegisterFile(file, proctorDialogFolder || undefined, proctorDialogType)}
        onPrintFile={(file) => handlePrintRegisterFile(file, proctorDialogFolder || undefined, proctorDialogType)}
      />

      {/* Building Excel Tabs Viewer & Print Modal */}
      <ExcelViewerModal
        open={excelModalOpen}
        onClose={() => {
          setExcelModalOpen(false);
          setExcelModalFile(null);
        }}
        file={excelModalFile}
        buildingName={excelModalBuilding}
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
  isPrinted,
  onTogglePrint,
  onShowSticker,
  onPrintSticker,
  onShowExamStickers,
  onPrintExamStickers,
  onOpenProctorDialog,
  onShowProctorFile,
  onPrintProctorFile,
  proctorFile,
  registerFile,
  registerCategory,
  breadcrumbs,
  demo,
  isPinned,
  onTogglePin,
  onReorderItem,
}: {
  item: DriveItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  isPrinted?: boolean;
  onTogglePrint?: () => void;
  onShowSticker?: (folder: DriveItem) => void;
  onPrintSticker?: (folder: DriveItem, orientation?: "portrait" | "landscape") => void;
  onShowExamStickers?: (folder: DriveItem) => void;
  onPrintExamStickers?: (folder: DriveItem, orientation?: "portrait" | "landscape") => void;
  onOpenProctorDialog?: (folder: DriveItem) => void;
  onShowProctorFile?: (file: DriveItem, folder?: DriveItem) => void;
  onPrintProctorFile?: (file: DriveItem, folder?: DriveItem) => void;
  proctorFile?: DriveItem;
  registerFile?: DriveItem;
  registerCategory?: RegisterCategory;
  breadcrumbs?: Breadcrumb[];
  demo: boolean;
  isPinned?: boolean;
  onTogglePin?: (item: DriveItem) => void;
  onReorderItem?: (itemId: string, direction: "top" | "up" | "down" | "bottom") => void;
}) {
  const { t, locale } = useI18n();
  const { activeProfile } = useActiveProfile();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth || 208;
    const menuHeight = menuEl?.offsetHeight || 290;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Vertical positioning: flip above if close to bottom
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    let top: number;
    if (placeAbove) {
      top = Math.max(8, rect.top - menuHeight - 4);
    } else {
      top = Math.min(viewportHeight - menuHeight - 8, rect.bottom + 4);
    }

    // Horizontal positioning: RTL vs LTR aware
    const isRtl = document.documentElement.dir === "rtl" || locale === "ar";
    let left: number;
    if (isRtl) {
      if (rect.left < menuWidth) {
        left = rect.left;
      } else {
        left = rect.right - menuWidth;
      }
    } else {
      if (viewportWidth - rect.right < menuWidth) {
        left = rect.right - menuWidth;
      } else {
        left = rect.left;
      }
    }

    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setPosition({ top, left });
  }, [locale]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    const frameId = requestAnimationFrame(() => {
      updatePosition();
    });

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, updatePosition]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn("icon-btn size-8 transition-colors", open && "bg-surface-soft text-foreground ring-2 ring-accent/30")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.actions")}
      >
        <MoreVertical className="size-4" />
      </button>

      {open && mounted && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[9990] cursor-default bg-transparent"
            aria-label={t("common.close")}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <div
            ref={menuRef}
            role="menu"
            style={
              position
                ? { top: `${position.top}px`, left: `${position.left}px` }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-border/80 bg-surface/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                onPreview();
                onClose();
              }}
            >
              <Eye className="size-4 text-accent" />
              <span>{item.isFolder ? t("common.open") : t("common.preview")}</span>
            </button>
            {onTogglePin && (
              <button
                type="button"
                role="menuitem"
                className="menu-item cursor-pointer text-amber-600 dark:text-amber-400 font-semibold"
                onClick={() => {
                  onTogglePin(item);
                  onClose();
                }}
              >
                <Pin className={cn("size-4", isPinned && "fill-current")} />
                <span>{isPinned ? t("common.unpinFromTop") : t("common.pinToTop")}</span>
              </button>
            )}
            {item.isFolder && onShowSticker && (
              <button
                type="button"
                role="menuitem"
                className="menu-item cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold"
                onClick={() => {
                  onShowSticker(item);
                  onClose();
                }}
              >
                <Eye className="size-4" />
                <span>{locale === "ar" ? "معاينة الاستيكر (عرض)" : "Preview Sticker (Show)"}</span>
              </button>
            )}
            {item.isFolder && onPrintSticker && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold"
                  onClick={() => {
                    onPrintSticker(item, "portrait");
                    onClose();
                  }}
                >
                  <Printer className="size-4" />
                  <span>{locale === "ar" ? "طباعة الاستيكر (طولي Portrait)" : "Print Sticker (Portrait)"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold"
                  onClick={() => {
                    onPrintSticker(item, "landscape");
                    onClose();
                  }}
                >
                  <Printer className="size-4" />
                  <span>{locale === "ar" ? "طباعة الاستيكر (عرضي Landscape)" : "Print Sticker (Landscape)"}</span>
                </button>
              </>
            )}
            {item.isFolder && onShowExamStickers && (() => {
              const regCat = registerCategory ?? getFolderRegisterCategory({
                folder: item,
                breadcrumbs,
                isCurrentFolder: false,
              });
              const isRoom = regCat === "student" || isRoomFolderName(item.name);
              const isFloor = regCat === "proctor" || isFloorFolderName(item.name);
              if (!isRoom && !isFloor) return null;
              return (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item cursor-pointer text-amber-700 dark:text-amber-400 font-semibold"
                    onClick={() => {
                      onShowExamStickers(item);
                      onClose();
                    }}
                  >
                    <Files className="size-4" />
                    <span>
                      {isFloor
                        ? locale === "ar"
                          ? "معاينة استيكرات كيسة امتحانات الدور (A4)"
                          : "Preview Floor Exam Bag Placards (A4)"
                        : locale === "ar"
                        ? "معاينة استيكرات الامتحانات"
                        : "Preview Exam Stickers"}
                    </span>
                  </button>
                  {onPrintExamStickers && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item cursor-pointer text-amber-700 dark:text-amber-400 font-semibold"
                        onClick={() => {
                          onPrintExamStickers(item, "portrait");
                          onClose();
                        }}
                      >
                        <Printer className="size-4" />
                        <span>
                          {isFloor
                            ? locale === "ar"
                              ? "طباعة استيكرات كيسة امتحانات الدور (طولي)"
                              : "Print Floor Exam Bag Placards (Portrait)"
                            : locale === "ar"
                            ? "طباعة استيكرات الامتحانات (طولي Portrait)"
                            : "Print Exam Stickers (Portrait)"}
                        </span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item cursor-pointer text-amber-700 dark:text-amber-400 font-semibold"
                        onClick={() => {
                          onPrintExamStickers(item, "landscape");
                          onClose();
                        }}
                      >
                        <Printer className="size-4" />
                        <span>
                          {isFloor
                            ? locale === "ar"
                              ? "طباعة استيكرات كيسة امتحانات الدور (عرضي)"
                              : "Print Floor Exam Bag Placards (Landscape)"
                            : locale === "ar"
                            ? "طباعة استيكرات الامتحانات (عرضي Landscape)"
                            : "Print Exam Stickers (Landscape)"}
                        </span>
                      </button>
                    </>
                  )}
                </>
              );
            })()}
            {item.isFolder && onOpenProctorDialog && (() => {
              const regCategory = registerCategory ?? getFolderRegisterCategory({
                folder: item,
                breadcrumbs,
                isCurrentFolder: false,
              });
              if (!regCategory) return null;
              const theme = getRegisterTheme(regCategory);
              const targetRegFile = registerFile ?? proctorFile;
              const regNameAr = theme.nameAr;
              const regNameEn = theme.nameEn;
              const labelShow = locale === "ar" ? `معاينة ${regNameAr} (عرض)` : `Preview ${regNameEn} (Show)`;
              const labelPrint = locale === "ar" ? `طباعة ${regNameAr}` : `Print ${regNameEn}`;
              const labelManage = locale === "ar" ? `إدارة / استبدال ${regNameAr}` : `Manage / Replace ${regNameEn}`;
              const labelAdd = locale === "ar" ? `إضافة ${regNameAr} (PDF)` : `Add ${regNameEn} (PDF)`;
              const canAdd = canProfileAddRegister(activeProfile.id, regCategory);

              if (targetRegFile) {
                return (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn("menu-item cursor-pointer font-semibold", theme.textClass)}
                      onClick={() => {
                        onShowProctorFile?.(targetRegFile, item);
                        onClose();
                      }}
                    >
                      <Eye className="size-4" />
                      <span>{labelShow}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn("menu-item cursor-pointer font-semibold", theme.textClass)}
                      onClick={() => {
                        onPrintProctorFile?.(targetRegFile, item);
                        onClose();
                      }}
                    >
                      <Printer className="size-4" />
                      <span>{labelPrint}</span>
                    </button>
                    {canAdd && (
                      <button
                        type="button"
                        role="menuitem"
                        className={cn("menu-item cursor-pointer", theme.textClass)}
                        onClick={() => {
                          onOpenProctorDialog(item);
                          onClose();
                        }}
                      >
                        <RegisterIcon category={regCategory} className="size-4" />
                        <span>{labelManage}</span>
                      </button>
                    )}
                  </>
                );
              }

              if (!canAdd) return null;

              return (
                <button
                  type="button"
                  role="menuitem"
                  className={cn("menu-item cursor-pointer font-semibold", theme.textClass)}
                  onClick={() => {
                    onOpenProctorDialog(item);
                    onClose();
                  }}
                >
                  <RegisterIcon category={regCategory} className="size-4" />
                  <span>{labelAdd}</span>
                </button>
              );
            })()}
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                onRename();
                onClose();
              }}
              disabled={demo}
            >
              <Pencil className="size-4" />
              <span>{t("common.rename")}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                onMove();
                onClose();
              }}
              disabled={demo}
            >
              <Move className="size-4" />
              <span>{t("common.move")}</span>
            </button>
            {onReorderItem && (
              <>
                <div className="my-1 border-t border-border/60" />
                <div className="px-2 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider select-none">
                  {locale === "ar" ? "ترتيب العنصر" : "Reorder"}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-xs"
                  onClick={() => {
                    onReorderItem(item.id, "top");
                    onClose();
                  }}
                >
                  <ArrowUpToLine className="size-4 text-accent" />
                  <span>{t("common.moveToTop")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-xs"
                  onClick={() => {
                    onReorderItem(item.id, "up");
                    onClose();
                  }}
                >
                  <ArrowUp className="size-4" />
                  <span>{t("common.moveUp")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-xs"
                  onClick={() => {
                    onReorderItem(item.id, "down");
                    onClose();
                  }}
                >
                  <ArrowDown className="size-4" />
                  <span>{t("common.moveDown")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item cursor-pointer text-xs"
                  onClick={() => {
                    onReorderItem(item.id, "bottom");
                    onClose();
                  }}
                >
                  <ArrowDownToLine className="size-4 text-muted" />
                  <span>{t("common.moveToBottom")}</span>
                </button>
              </>
            )}
            {!item.isFolder && onTogglePrint && (
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  onTogglePrint();
                  onClose();
                }}
              >
                {isPrinted ? (
                  <>
                    <Clock className="size-4 text-amber-500" />
                    <span>{t("print.markAsPending")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>{t("print.markAsPrinted")}</span>
                  </>
                )}
              </button>
            )}
            {!item.isFolder && (
              <a
                role="menuitem"
                className="menu-item"
                href={`/api/drive/files/${item.id}/content?download=1`}
                onClick={onClose}
              >
                <Download className="size-4 text-sky-500" />
                <span>{t("common.download")}</span>
              </a>
            )}
            {!item.isFolder && (
              <>
                <Link
                  role="menuitem"
                  className="menu-item"
                  href={`/print/${item.id}?orientation=portrait`}
                  target="_blank"
                  onClick={onClose}
                >
                  <Printer className="size-4 text-accent" />
                  <span>{locale === "ar" ? "طباعة الملف (طولي Portrait)" : "Print (Portrait)"}</span>
                </Link>
                <Link
                  role="menuitem"
                  className="menu-item"
                  href={`/print/${item.id}?orientation=landscape`}
                  target="_blank"
                  onClick={onClose}
                >
                  <Printer className="size-4 text-accent" />
                  <span>{locale === "ar" ? "طباعة الملف (عرضي Landscape)" : "Print (Landscape)"}</span>
                </Link>
              </>
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
                <ExternalLink className="size-4 text-muted" />
                <span>{t("common.openInDrive")}</span>
              </a>
            )}
            {activeProfile.canDelete && (
              <>
                <div className="my-1 border-t border-border/60" />
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item menu-item-danger text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  disabled={demo}
                >
                  <Trash2 className="size-4" />
                  <span>{t("common.delete")}</span>
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

interface TreeRowProps {
  item: DriveItem;
  depth: number;
  expandedFolderIds: Set<string>;
  loadingFolderIds: Set<string>;
  folderChildren: Record<string, DriveItem[]>;
  printedIds: Set<string>;
  selectedIds: Set<string>;
  printFilter: "all" | "printed" | "pending";
  menuId: string | null;
  demoActive: boolean;
  isRoomFolder?: boolean;
  getFolderCheckState: (folderId: string) => { checked: boolean; indeterminate: boolean };
  onToggleExpand: (folderId: string, folderName?: string) => void;
  onToggleSelect: (id: string, e?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => void;
  onOpenItem: (item: DriveItem) => void;
  onToggleFavorite: (item: DriveItem) => void;
  onTogglePrintStatus: (item: DriveItem) => void;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onNewSubFolder: (folder: DriveItem) => void;
  onUploadToFolder: (folder: DriveItem) => void;
  onShowSticker: (e: React.MouseEvent | null, folder: DriveItem) => void;
  onPrintSticker: (e: React.MouseEvent | null, folder: DriveItem, orientation?: "portrait" | "landscape") => void;
  onShowExamStickers?: (e: React.MouseEvent | null, folder: DriveItem) => void;
  onPrintExamStickers?: (e: React.MouseEvent | null, folder: DriveItem, orientation?: "portrait" | "landscape") => void;
  onOpenProctorDialog?: (folder: DriveItem) => void;
  onShowProctorFile?: (file: DriveItem, folder?: DriveItem) => void;
  onPrintProctorFile?: (file: DriveItem, folder?: DriveItem) => void;
  breadcrumbs?: Breadcrumb[];
  busyStickerId: string | null;
  stickerAction: "show" | "print" | null;
  busyExamStickerId?: string | null;
  examStickerAction?: "show" | "print" | null;
  draggedItem: DriveItem | null;
  dragOverFolderId: string | null;
  onDragStartItem: (e: React.DragEvent, item: DriveItem) => void;
  onDragEndItem: () => void;
  onDragOverFolder: (e: React.DragEvent, folder: DriveItem) => void;
  onDragLeaveFolder: (e: React.DragEvent, folder: DriveItem) => void;
  onDropOnFolder: (e: React.DragEvent, folder: DriveItem) => void;
  isPinned?: boolean;
  onTogglePin?: (item: DriveItem) => void;
  onReorderItem?: (itemId: string, direction: "top" | "up" | "down" | "bottom") => void;
  onReorderDragStart?: (e: React.DragEvent, item: DriveItem) => void;
  onReorderDragEnd?: () => void;
  onReorderDragOver?: (e: React.DragEvent, item: DriveItem) => void;
  onReorderDrop?: (e: React.DragEvent, targetItem: DriveItem) => void;
  reorderOverId?: string | null;
  reorderDraggedId?: string | null;
}

function TreeRow({
  item,
  depth,
  expandedFolderIds,
  loadingFolderIds,
  folderChildren,
  printedIds,
  selectedIds,
  printFilter,
  menuId,
  demoActive,
  isRoomFolder,
  getFolderCheckState,
  onToggleExpand,
  onToggleSelect,
  onOpenItem,
  onToggleFavorite,
  onTogglePrintStatus,
  onMenuToggle,
  onMenuClose,
  onRename,
  onMove,
  onDelete,
  onNewSubFolder,
  onUploadToFolder,
  onShowSticker,
  onPrintSticker,
  onShowExamStickers,
  onPrintExamStickers,
  onOpenProctorDialog,
  onShowProctorFile,
  onPrintProctorFile,
  breadcrumbs,
  busyStickerId,
  stickerAction,
  busyExamStickerId,
  examStickerAction,
  draggedItem,
  dragOverFolderId,
  onDragStartItem,
  onDragEndItem,
  onDragOverFolder,
  onDragLeaveFolder,
  onDropOnFolder,
  isPinned,
  onTogglePin,
  onReorderItem,
  onReorderDragStart,
  onReorderDragEnd,
  onReorderDragOver,
  onReorderDrop,
  reorderOverId,
  reorderDraggedId,
}: TreeRowProps) {
  const { t, locale } = useI18n();
  const { activeProfile } = useActiveProfile();
  const isPrinted = !item.isFolder && printedIds.has(item.id);
  const isPending = !item.isFolder && !printedIds.has(item.id);
  const isExpanded = item.isFolder && expandedFolderIds.has(item.id);
  const isLoadingChildren = item.isFolder && loadingFolderIds.has(item.id);
  const rawChildren = folderChildren[item.id] || [];
  const checkState = item.isFolder
    ? getFolderCheckState(item.id)
    : { checked: selectedIds.has(item.id), indeterminate: false };

  const children = useMemo(() => {
    if (printFilter === "all") return rawChildren;
    return rawChildren.filter((child) => {
      if (child.isFolder) return true;
      const printed = printedIds.has(child.id);
      return printFilter === "printed" ? printed : !printed;
    });
  }, [rawChildren, printFilter, printedIds]);

  return (
    <Fragment key={item.id}>
      <tr
        draggable={!demoActive}
        onDragStart={(e) => onDragStartItem(e, item)}
        onDragEnd={onDragEndItem}
        onDragOver={(e) => {
          if (reorderDraggedId) {
            onReorderDragOver?.(e, item);
          } else if (item.isFolder) {
            onDragOverFolder(e, item);
          }
        }}
        onDragLeave={(e) => {
          if (!reorderDraggedId && item.isFolder) {
            onDragLeaveFolder(e, item);
          }
        }}
        onDrop={(e) => {
          if (reorderDraggedId) {
            onReorderDrop?.(e, item);
          } else if (item.isFolder) {
            onDropOnFolder(e, item);
          }
        }}
        onClick={() => onOpenItem(item)}
        className={cn(
          "border-b border-border/60 last:border-0 hover:bg-surface-soft/60 transition-all cursor-pointer group select-none",
          reorderOverId === item.id &&
          "bg-accent/20 border-t-2 border-accent ring-1 ring-accent",
          dragOverFolderId === item.id &&
          "bg-accent/20 border-y-2 border-accent ring-2 ring-accent shadow-md scale-[1.005]",
          draggedItem?.id === item.id && "opacity-40 border-dashed",
          depth > 0 && "bg-surface-soft/20",
          selectedIds.has(item.id) && "bg-accent/10 hover:bg-accent/15",
          !selectedIds.has(item.id) &&
          isPrinted &&
          "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] border-s-4 border-s-emerald-500 dark:border-s-emerald-400",
          !selectedIds.has(item.id) &&
          isPending &&
          "bg-amber-500/[0.03] hover:bg-amber-500/[0.07] border-s-4 border-s-amber-500/80 dark:border-s-amber-400/90",
        )}
      >
        <td className="w-12 px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-0.5">
            <button
              type="button"
              draggable={!demoActive}
              onDragStart={(e) => onReorderDragStart?.(e, item)}
              onDragEnd={onReorderDragEnd}
              className="cursor-grab active:cursor-grabbing text-muted/30 hover:text-foreground rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title={locale === "ar" ? "اسحب لإعادة الترتيب يدويًا" : "Drag to reorder manually"}
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-3.5" />
            </button>
            <CheckboxInput
              checked={checkState.checked}
              indeterminate={checkState.indeterminate}
              onChange={(e) => onToggleSelect(item.id, e)}
              className="size-4 rounded border-border accent-accent cursor-pointer"
              ariaLabel={`Select ${item.name}`}
            />
          </div>
        </td>
        <td className="max-w-[340px] px-4 py-2.5">
          <div
            className="flex items-center gap-2"
            style={depth > 0 ? { paddingInlineStart: `${depth * 20}px` } : undefined}
          >
            {depth > 0 && (
              <span className="text-muted/40 font-mono text-xs select-none shrink-0" aria-hidden="true">
                └
              </span>
            )}
            {item.isFolder ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(item.id, item.name);
                }}
                className={cn(
                  "icon-btn size-7 text-muted hover:text-accent hover:bg-surface-strong shrink-0 rounded-md transition-all flex items-center justify-center cursor-pointer",
                  isExpanded && "text-accent bg-accent/10",
                )}
                title={
                  isExpanded
                    ? locale === "ar"
                      ? "طي المجلد"
                      : "Collapse folder"
                    : locale === "ar"
                      ? "توسيع وعرض محتويات المجلد"
                      : "Expand folder"
                }
                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
              >
                {isLoadingChildren ? (
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                ) : isExpanded ? (
                  <ChevronDown className="size-3.5 text-accent" />
                ) : locale === "ar" ? (
                  <ChevronLeft className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="w-7 shrink-0" />
            )}
            <FileIcon category={item.category} extension={item.extension} size="sm" isShortcut={item.isShortcut} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="truncate text-start font-medium group-hover:text-accent max-w-full text-xs sm:text-sm transition-colors">
                  {item.name}
                </span>
                {item.isShortcut && (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20">
                    ↗ {locale === "ar" ? "اختصار" : "Shortcut"}
                  </span>
                )}
                {isPinned && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    <Pin className="size-2.5 fill-current" />
                    {t("common.pinned")}
                  </span>
                )}
                {dragOverFolderId === item.id && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow-xs animate-pulse shrink-0">
                    📥 {locale === "ar" ? "إفلات للنقل هنا" : "Drop to move here"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <ExamBadges name={item.name} isRoomFolder={isRoomFolder && !item.isFolder} />
                {!item.isFolder && (
                  isPrinted ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                      {t("print.statusPrinted")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                      {t("print.statusPending")}
                    </span>
                  )
                )}
              </div>
            </div>
            {item.isFavorite && <Star className="size-3.5 shrink-0 fill-current text-amber-500" />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-xs text-muted">
          {item.isFolder ? t("common.folder") : (item.extension || "—").toUpperCase()}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
          {item.isFolder ? "—" : formatBytes(item.size, locale)}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
          {formatDate(item.modifiedTime, locale)}
        </td>
        <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {item.isFolder && (
              <div className="flex items-center gap-1 me-1">
                {(() => {
                  const regCategory = getFolderRegisterCategory({
                    folder: item,
                    breadcrumbs,
                    depth,
                    isCurrentFolder: false,
                  });
                  const isRoomFolder = regCategory === "student" || isRoomFolderName(item.name);
                  const isFloorFolder = regCategory === "proctor" || isFloorFolderName(item.name);

                  return (
                    <>
                      {/* Button 1: Regular Room Sticker */}
                      <div className="inline-flex items-center rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-0.5 shadow-2xs">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border-e border-indigo-500/20 select-none">
                          <Tag className="size-3 text-indigo-600 dark:text-indigo-400" />
                          <span className="hidden sm:inline">
                            {isRoomFolder
                              ? locale === "ar"
                                ? "استيكر الغرفة"
                                : "Room Sticker"
                              : locale === "ar"
                              ? "استيكر"
                              : "Sticker"}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => onShowSticker(e, item)}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center justify-center size-6 rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                          title={
                            locale === "ar"
                              ? isRoomFolder
                                ? `معاينة استيكر الغرفة "${item.name}" (عرض)`
                                : `معاينة استيكر "${item.name}" (عرض)`
                              : `Preview sticker for "${item.name}" (Show)`
                          }
                          aria-label="Preview Sticker"
                        >
                          {busyStickerId === item.id && stickerAction === "show" ? (
                            <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Eye className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => onPrintSticker(e, item, "portrait")}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer border-s border-indigo-500/20"
                          title={
                            locale === "ar"
                              ? isRoomFolder
                                ? `طباعة استيكر الغرفة "${item.name}" بالطول (Portrait)`
                                : `طباعة استيكر "${item.name}" بالطول (Portrait)`
                              : `Print sticker for "${item.name}" in Portrait`
                          }
                          aria-label="Print Sticker Portrait"
                        >
                          <Printer className="size-3 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-[10px] font-bold">{locale === "ar" ? "طولي" : "Port"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onPrintSticker(e, item, "landscape")}
                          disabled={busyStickerId === item.id}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer border-s border-indigo-500/20"
                          title={
                            locale === "ar"
                              ? isRoomFolder
                                ? `طباعة استيكر الغرفة "${item.name}" بالعرض (Landscape)`
                                : `طباعة استيكر "${item.name}" بالعرض (Landscape)`
                              : `Print sticker for "${item.name}" in Landscape`
                          }
                          aria-label="Print Sticker Landscape"
                        >
                          <span className="text-[10px] font-bold">{locale === "ar" ? "عرضي" : "Land"}</span>
                        </button>
                      </div>

                      {/* Button 2: Exam Stickers (Room packets or Floor A4 Subject Bag Placards) */}
                      {(isRoomFolder || isFloorFolder) && onShowExamStickers && onPrintExamStickers && (
                        <div className="inline-flex items-center rounded-lg border border-amber-500/40 bg-amber-500/10 p-0.5 shadow-2xs">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200 border-e border-amber-500/25 select-none">
                            <Files className="size-3 text-amber-600 dark:text-amber-400" />
                            <span className="hidden sm:inline">
                              {isFloorFolder
                                ? locale === "ar"
                                  ? "استيكرات الدور"
                                  : "Floor Stickers"
                                : locale === "ar"
                                ? "استيكرات الامتحانات"
                                : "Exam Stickers"}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => onShowExamStickers(e, item)}
                            disabled={busyExamStickerId === item.id}
                            className="inline-flex items-center justify-center size-6 rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-all cursor-pointer"
                            title={
                              locale === "ar"
                                ? isFloorFolder
                                  ? `معاينة ملصقات كيسة امتحانات الدور "${item.name}" (مقاس A4)`
                                  : `معاينة استيكرات الامتحانات للقاعة "${item.name}" (عرض)`
                                : isFloorFolder
                                ? `Preview floor exam bag placards for "${item.name}" (A4)`
                                : `Preview exam stickers for "${item.name}" (Show)`
                            }
                            aria-label="Preview Exam Stickers"
                          >
                            {busyExamStickerId === item.id && examStickerAction === "show" ? (
                              <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Eye className="size-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => onPrintExamStickers(e, item, "portrait")}
                            disabled={busyExamStickerId === item.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-all cursor-pointer border-s border-amber-500/25"
                            title={
                              locale === "ar"
                                ? isFloorFolder
                                  ? `طباعة ملصقات كيسة امتحانات الدور "${item.name}" بالطول (A4 Portrait)`
                                  : `طباعة استيكرات الامتحانات للقاعة "${item.name}" بالطول (Portrait)`
                                : `Print exam stickers for "${item.name}" in Portrait`
                            }
                            aria-label="Print Exam Stickers Portrait"
                          >
                            <Printer className="size-3 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-bold">{locale === "ar" ? "طولي" : "Port"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => onPrintExamStickers(e, item, "landscape")}
                            disabled={busyExamStickerId === item.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-all cursor-pointer border-s border-amber-500/25"
                            title={
                              locale === "ar"
                                ? isFloorFolder
                                  ? `طباعة ملصقات كيسة امتحانات الدور "${item.name}" بالعرض (A4 Landscape)`
                                  : `طباعة استيكرات الامتحانات لقاعة "${item.name}" بالعرض (Landscape)`
                                : `Print exam stickers for "${item.name}" in Landscape`
                            }
                            aria-label="Print Exam Stickers Landscape"
                          >
                            <span className="text-[10px] font-bold">{locale === "ar" ? "عرضي" : "Land"}</span>
                          </button>
                        </div>
                      )}

                      {/* Register File / Chip */}
                      {(() => {
                        if (!regCategory) return null;

                        const regFile = findRegisterFileInItems(regCategory, folderChildren[item.id]);
                        const theme = getRegisterTheme(regCategory);
                        const regNameAr = theme.nameAr;
                        const regNameEn = theme.nameEn;
                        const chipLabel = locale === "ar" ? theme.shortAr : theme.shortEn;
                        const chipAddLabel = locale === "ar" ? theme.addLabelAr : theme.addLabelEn;
                        const canAdd = canProfileAddRegister(activeProfile.id, regCategory);

                        if (regFile) {
                          return (
                            <div className={cn("inline-flex items-center rounded-lg border p-0.5 shadow-2xs", theme.chipBorderClass, theme.chipBgClass)}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenProctorDialog?.(item);
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold border-e rounded-s cursor-pointer select-none",
                                  theme.textClass,
                                  theme.chipBorderClass,
                                  theme.hoverBgClass,
                                )}
                                title={
                                  locale === "ar"
                                    ? `${regNameAr}: "${regFile.name}" (اضغط للإدارة — المسؤول: ${theme.ownerAr})`
                                    : `${regNameEn}: "${regFile.name}" (Click to manage — Owner: ${theme.ownerEn})`
                                }
                              >
                                <RegisterIcon category={regCategory} className={cn("size-3", theme.iconColorClass)} />
                                <span className="hidden sm:inline">{chipLabel}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowProctorFile?.(regFile, item);
                                }}
                                className={cn("inline-flex items-center justify-center size-6 rounded cursor-pointer transition-all", theme.hoverBgClass, theme.textClass)}
                                title={
                                  locale === "ar"
                                    ? `معاينة ${regNameAr} "${item.name}" (عرض)`
                                    : `Preview ${regNameEn.toLowerCase()} for "${item.name}" (Show)`
                                }
                                aria-label={`Preview ${regNameEn}`}
                              >
                                <Eye className={cn("size-3.5", theme.iconColorClass)} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPrintProctorFile?.(regFile, item);
                                }}
                                className={cn("inline-flex items-center justify-center size-6 rounded cursor-pointer transition-all", theme.hoverBgClass, theme.textClass)}
                                title={
                                  locale === "ar"
                                    ? `طباعة ${regNameAr} "${item.name}" مباشرة`
                                    : `Print ${regNameEn.toLowerCase()} for "${item.name}" directly`
                                }
                                aria-label={`Print ${regNameEn}`}
                              >
                                <Printer className={cn("size-3.5", theme.iconColorClass)} />
                              </button>
                            </div>
                          );
                        }

                        if (!canAdd) return null;

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProctorDialog?.(item);
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer shadow-2xs",
                              theme.borderClass,
                              theme.bgClass,
                              theme.textClass,
                              theme.hoverBgClass,
                            )}
                            title={
                              locale === "ar"
                                ? `إضافة ${regNameAr} (PDF) داخل "${item.name}" (المسؤول: ${theme.ownerAr})`
                                : `Add ${regNameEn} (PDF) into "${item.name}" (Responsible: ${theme.ownerEn})`
                            }
                          >
                            <RegisterIcon category={regCategory} className={cn("size-3", theme.iconColorClass)} />
                            <span className="hidden sm:inline">{chipAddLabel}</span>
                          </button>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(item)}
              className={cn("icon-btn size-7 cursor-pointer", item.isFavorite && "text-amber-500")}
              title={item.isFavorite ? t("common.unfavorite") : t("common.favorite")}
            >
              <Star className={cn("size-3.5", item.isFavorite && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => onTogglePin?.(item)}
              className={cn(
                "icon-btn size-7 cursor-pointer transition-colors",
                isPinned
                  ? "text-amber-500 hover:text-amber-600 bg-amber-500/10"
                  : "text-muted/60 hover:text-amber-500 hover:bg-amber-500/10",
              )}
              title={isPinned ? t("common.unpinFromTop") : t("common.pinToTop")}
              aria-label={isPinned ? t("common.unpinFromTop") : t("common.pinToTop")}
            >
              <Pin className={cn("size-3.5", isPinned && "fill-current")} />
            </button>
            {!item.isFolder && (
              <div className="inline-flex items-center rounded-lg border border-border/70 bg-surface-soft p-0.5 shadow-2xs">
                <a
                  href={`/print/${item.id}?orientation=portrait`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface rounded text-foreground cursor-pointer transition-colors"
                  title={locale === "ar" ? "طباعة الملف بالطول (Portrait)" : "Print Portrait"}
                >
                  <Printer className="size-3 text-muted" />
                  <span className="text-[10px] font-bold">{locale === "ar" ? "طولي" : "Port"}</span>
                </a>
                <a
                  href={`/print/${item.id}?orientation=landscape`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface rounded text-foreground cursor-pointer transition-colors border-s border-border/50"
                  title={locale === "ar" ? "طباعة الملف بالعرض (Landscape)" : "Print Landscape"}
                >
                  <span className="text-[10px] font-bold">{locale === "ar" ? "عرضي" : "Land"}</span>
                </a>
              </div>
            )}
            {!item.isFolder && (
              <a
                href={`/api/drive/files/${item.id}/content?download=1`}
                className="icon-btn size-7 cursor-pointer"
                title={t("common.download")}
              >
                <Download className="size-3.5" />
              </a>
            )}
            {(() => {
              const regCategory = item.isFolder
                ? getFolderRegisterCategory({
                    folder: item,
                    breadcrumbs,
                    depth,
                    isCurrentFolder: false,
                  })
                : null;
              const regFile = regCategory ? findRegisterFileInItems(regCategory, folderChildren[item.id]) : undefined;
              return (
                <ItemMenu
                  item={item}
                  isPrinted={isPrinted}
                  isPinned={isPinned}
                  onTogglePin={onTogglePin ? () => onTogglePin(item) : undefined}
                  onReorderItem={onReorderItem}
                  onTogglePrint={() => onTogglePrintStatus(item)}
                  onShowSticker={(folder) => onShowSticker(null, folder)}
                  onPrintSticker={(folder, orientation) => onPrintSticker(null, folder, orientation)}
                  onShowExamStickers={(folder) => onShowExamStickers?.(null, folder)}
                  onPrintExamStickers={(folder, orientation) => onPrintExamStickers?.(null, folder, orientation)}
                  onOpenProctorDialog={onOpenProctorDialog}
                  onShowProctorFile={onShowProctorFile}
                  onPrintProctorFile={onPrintProctorFile}
                  proctorFile={regFile}
                  registerFile={regFile}
                  registerCategory={regCategory}
                  breadcrumbs={breadcrumbs}
                  open={menuId === item.id}
                  onToggle={() => onMenuToggle(item.id)}
                  onClose={onMenuClose}
                  onPreview={() => onOpenItem(item)}
                  onRename={() => onRename(item)}
                  onMove={() => onMove(item)}
                  onDelete={() => onDelete(item)}
                  demo={demoActive}
                />
              );
            })()}
          </div>
        </td>
      </tr>

      {/* Expanded sub-tree */}
      {isExpanded && (
        isLoadingChildren ? (
          <tr className="border-b border-border/40 bg-surface-soft/20 text-muted">
            <td
              colSpan={6}
              className="py-2.5 px-4 text-xs text-muted"
              style={{ paddingInlineStart: `${(depth + 1) * 20 + 48}px` }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-accent" />
                <span>{t("common.loading")}</span>
              </div>
            </td>
          </tr>
        ) : children.length === 0 ? (
          <tr className="border-b border-border/40 bg-surface-soft/20 text-muted">
            <td
              colSpan={6}
              className="py-2.5 px-4 text-xs italic"
              style={{ paddingInlineStart: `${(depth + 1) * 20 + 48}px` }}
            >
              {locale === "ar" ? "المجلد فارغ لا يحتوي على ملفات أو مجلدات" : "Folder is empty"}
            </td>
          </tr>
        ) : (
          children.map((child) => (
            <TreeRow
              key={child.id}
              item={child}
              depth={depth + 1}
              isRoomFolder={item.isFolder && isRoomFolderName(item.name)}
              expandedFolderIds={expandedFolderIds}
              loadingFolderIds={loadingFolderIds}
              folderChildren={folderChildren}
              printedIds={printedIds}
              selectedIds={selectedIds}
              printFilter={printFilter}
              menuId={menuId}
              demoActive={demoActive}
              getFolderCheckState={getFolderCheckState}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              onOpenItem={onOpenItem}
              onToggleFavorite={onToggleFavorite}
              onTogglePrintStatus={onTogglePrintStatus}
              onMenuToggle={onMenuToggle}
              onMenuClose={onMenuClose}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              onNewSubFolder={onNewSubFolder}
              onUploadToFolder={onUploadToFolder}
              onShowSticker={onShowSticker}
              onPrintSticker={onPrintSticker}
              onShowExamStickers={onShowExamStickers}
              onPrintExamStickers={onPrintExamStickers}
              onOpenProctorDialog={onOpenProctorDialog}
              onShowProctorFile={onShowProctorFile}
              onPrintProctorFile={onPrintProctorFile}
              breadcrumbs={breadcrumbs}
              busyStickerId={busyStickerId}
              stickerAction={stickerAction}
              busyExamStickerId={busyExamStickerId}
              examStickerAction={examStickerAction}
              draggedItem={draggedItem}
              dragOverFolderId={dragOverFolderId}
              onDragStartItem={onDragStartItem}
              onDragEndItem={onDragEndItem}
              onDragOverFolder={onDragOverFolder}
              onDragLeaveFolder={onDragLeaveFolder}
              onDropOnFolder={onDropOnFolder}
              isPinned={child.isPinned}
              onTogglePin={onTogglePin}
            />
          ))
        )
      )}
    </Fragment>
  );
}
