"use client";

import { useState } from "react";
import { ExternalLink, Layers, Printer, Tag, X } from "lucide-react";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";
import { formatBytes } from "@/lib/file-utils";
import type { DriveItem, Locale } from "@/lib/types";

interface BatchPrintDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItems: DriveItem[];
  isLoading?: boolean;
  onOpenStickers?: () => void;
}

export function BatchPrintDialog({ open, onClose, selectedItems, isLoading = false, onOpenStickers }: BatchPrintDialogProps) {
  const { t, locale } = useI18n();
  const [opening, setOpening] = useState(false);

  const printFiles = selectedItems.filter((i) => !i.isFolder);

  const handleOpenUnified = () => {
    const ids = printFiles.map((i) => i.id).join(",");
    window.open(`/print/batch?files=${ids}`, "_blank");
    onClose();
  };

  const handleOpenAllTabs = () => {
    setOpening(true);
    printFiles.forEach((item, index) => {
      setTimeout(() => {
        window.open(`/print/${item.id}`, "_blank");
      }, index * 200);
    });
    setOpening(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("batch.printTitle")}
      description={t("batch.printDesc", { count: printFiles.length })}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleOpenUnified} className="flex items-center gap-1.5">
            <Layers className="size-4" />
            <span>{t("batch.printUnified")}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Optional Prompt to print stickers for selected folders */}
        {selectedItems.some((i) => i.isFolder) && onOpenStickers && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
            <div className="flex items-center gap-2 text-xs">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Tag className="size-4" />
              </span>
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                  {locale === "ar" ? "هل تود أيضاً طباعة استيكرات المجلدات؟" : "Want to print folder stickers too?"}
                </span>
                <span className="text-[11px] text-muted block">
                  {locale === "ar"
                    ? `قمت باختيار ${selectedItems.filter((i) => i.isFolder).length} مجلد يحتاج استيكرات A4 للأبواب`
                    : `You selected ${selectedItems.filter((i) => i.isFolder).length} folder(s) eligible for A4 placards`}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onOpenStickers();
              }}
              className="text-xs shrink-0 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 cursor-pointer font-bold"
            >
              {locale === "ar" ? "طباعة الاستيكرات" : "Print Stickers"}
            </Button>
          </div>
        )}

        {/* Print Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenUnified}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 text-start hover:border-accent hover:bg-accent/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-accent text-sm">
              <Layers className="size-4" />
              <span>{t("batch.printUnified")}</span>
            </div>
            <p className="text-xs text-muted">
              {locale === "ar"
                ? "عرض جميع المستندات في صفحة طباعة واحدة مع فواصل صفحات تلقائية."
                : "Display all documents in a unified print view with automatic page breaks."}
            </p>
          </button>

          <button
            type="button"
            onClick={handleOpenAllTabs}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-border bg-surface p-4 text-start hover:border-foreground/30 hover:bg-surface-soft transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-foreground text-sm">
              <ExternalLink className="size-4 text-muted" />
              <span>{t("batch.printTabs")}</span>
            </div>
            <p className="text-xs text-muted">
              {locale === "ar"
                ? "فتح كل ملف في تبويب طباعة مستقل للمعاينة الفردية."
                : "Open each document in a separate browser tab for individual preview."}
            </p>
          </button>
        </div>

        {/* Selected Files List Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted block">
              {locale === "ar"
                ? `المستندات المختارة (${printFiles.length}):`
                : `Selected documents (${printFiles.length}):`}
            </span>
            {isLoading && (
              <span className="text-[11px] text-accent animate-pulse">
                {locale === "ar" ? "جارٍ جمع محتويات المجلدات…" : "Scanning folders…"}
              </span>
            )}
          </div>
          {printFiles.length === 0 && isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-soft py-6 text-xs text-muted">
              <span className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>{locale === "ar" ? "جارٍ تجميع المستندات من المجلدات المحددة…" : "Gathering documents from selected folders…"}</span>
            </div>
          ) : (
            <ul className="scrollbar-thin max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-surface-soft p-2">
              {printFiles.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-strong font-mono text-[10px] text-muted">
                      {index + 1}
                    </span>
                    <span className="truncate font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">
                    {formatBytes(item.size, locale as Locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

