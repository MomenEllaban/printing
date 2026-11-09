"use client";

import { useState } from "react";
import { Eye, Layers, Loader2, Printer, Tag, X } from "lucide-react";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";
import type { DriveItem } from "@/lib/types";

interface BatchStickersDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFolders: Array<{ id: string; name?: string | null }>;
  currentFolder?: { id: string; name?: string | null } | null;
  onExecute: (options: {
    action: "show" | "print";
    includeChildren: boolean;
    orientation: "landscape" | "portrait";
  }) => Promise<void>;
  loading?: boolean;
}

export function BatchStickersDialog({
  open,
  onClose,
  selectedFolders,
  currentFolder,
  onExecute,
  loading = false,
}: BatchStickersDialogProps) {
  const { locale } = useI18n();
  const [includeChildren, setIncludeChildren] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [activeAction, setActiveAction] = useState<"show" | "print" | null>(null);

  // If user selected 0 folders but is inside a folder, use currentFolder
  const effectiveFolders =
    selectedFolders.length > 0
      ? selectedFolders
      : currentFolder
      ? [currentFolder]
      : [];

  const handleAction = async (action: "show" | "print") => {
    setActiveAction(action);
    try {
      await onExecute({
        action,
        includeChildren,
        orientation,
      });
      onClose();
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        locale === "ar"
          ? "طباعة استيكرات EST للمحدد"
          : "Print EST Stickers for Selected"
      }
      description={
        locale === "ar"
          ? `تجهيز استيكرات A4 رسمية تحمل شعار EST لـ ${effectiveFolders.length} مجلد محدد.`
          : `Prepare official A4 EST placards with logo for ${effectiveFolders.length} selected folder(s).`
      }
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => handleAction("show")}
              disabled={loading || effectiveFolders.length === 0}
              className="flex items-center gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
            >
              {loading && activeAction === "show" ? (
                <Loader2 className="size-4 animate-spin text-indigo-600" />
              ) : (
                <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{locale === "ar" ? "معاينة الكل (PDF موحد)" : "Preview Unified PDF"}</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => handleAction("print")}
              disabled={loading || effectiveFolders.length === 0}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              {loading && activeAction === "print" ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <Printer className="size-4 text-white" />
              )}
              <span>{locale === "ar" ? "طباعة الاستيكرات مباشرة" : "Print Directly"}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Scope selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground block">
            {locale === "ar" ? "نطاق الاستيكرات المطلوب طباعتها:" : "Sticker Scope:"}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIncludeChildren(false)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-start transition-all cursor-pointer ${
                !includeChildren
                  ? "border-indigo-600 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                  : "border-border bg-surface hover:bg-surface-soft"
              }`}
            >
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="size-3.5 text-indigo-600" />
                {locale === "ar"
                  ? `المجلدات المحددة فقط (${effectiveFolders.length})`
                  : `Selected Folders Only (${effectiveFolders.length})`}
              </span>
              <span className="text-[11px] text-muted">
                {locale === "ar"
                  ? "استيكر واحد لكل مجلد تم اختياره في القائمة مباشرة."
                  : "One sticker per explicitly selected folder."}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeChildren(true)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-start transition-all cursor-pointer ${
                includeChildren
                  ? "border-indigo-600 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                  : "border-border bg-surface hover:bg-surface-soft"
              }`}
            >
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-indigo-600" />
                {locale === "ar"
                  ? "تضمين كافة القاعات والفروع الداخلية"
                  : "Include All Sub-rooms & Floors"}
              </span>
              <span className="text-[11px] text-muted">
                {locale === "ar"
                  ? "فحص وتوليد استيكرات لكافة المستويات والقاعات الواقعة بالداخل."
                  : "Scan and generate stickers for all child rooms and levels inside."}
              </span>
            </button>
          </div>
        </div>

        {/* Orientation Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground block">
            {locale === "ar" ? "اتجاه ورقة الاستيكر (مقاس A4):" : "Sticker Orientation (A4):"}
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="sticker-orientation"
                value="landscape"
                checked={orientation === "landscape"}
                onChange={() => setOrientation("landscape")}
                className="size-4 accent-indigo-600 cursor-pointer"
              />
              <span>{locale === "ar" ? "أفقي (Landscape) — موصى به للأبواب والقاعات" : "Landscape (Recommended)"}</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="sticker-orientation"
                value="portrait"
                checked={orientation === "portrait"}
                onChange={() => setOrientation("portrait")}
                className="size-4 accent-indigo-600 cursor-pointer"
              />
              <span>{locale === "ar" ? "رأسي (Portrait)" : "Portrait"}</span>
            </label>
          </div>
        </div>

        {/* Selected Items preview */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-muted block">
            {locale === "ar"
              ? `المجلدات المختارة (${effectiveFolders.length}):`
              : `Selected Folders (${effectiveFolders.length}):`}
          </span>

          <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-soft p-2">
            {effectiveFolders.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs font-medium"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="size-3 text-indigo-600 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] text-muted shrink-0 font-mono">
                  {locale === "ar" ? "مجلد" : "Folder"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

