"use client";

import { useState } from "react";
import { ExternalLink, Layers, Printer, X } from "lucide-react";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";
import { formatBytes } from "@/lib/file-utils";
import type { DriveItem, Locale } from "@/lib/types";

interface BatchPrintDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItems: DriveItem[];
}

export function BatchPrintDialog({ open, onClose, selectedItems }: BatchPrintDialogProps) {
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
        {/* Print Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenUnified}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 text-start hover:border-accent hover:bg-accent/10 transition-all"
          >
            <div className="flex items-center gap-2 font-bold text-accent text-sm">
              <Layers className="size-4" />
              <span>{t("batch.printUnified")}</span>
            </div>
            <p className="text-xs text-muted">
              عرض جميع المستندات في صفحة طباعة واحدة مع فواصل صفحات تلقائية.
            </p>
          </button>

          <button
            type="button"
            onClick={handleOpenAllTabs}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-border bg-surface p-4 text-start hover:border-foreground/30 hover:bg-surface-soft transition-all"
          >
            <div className="flex items-center gap-2 font-bold text-foreground text-sm">
              <ExternalLink className="size-4 text-muted" />
              <span>{t("batch.printTabs")}</span>
            </div>
            <p className="text-xs text-muted">
              فتح كل ملف في تبويب طباعة مستقل للمعاينة الفردية.
            </p>
          </button>
        </div>

        {/* Selected Files List Preview */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted block">
            المستندات المختارة ({printFiles.length}):
          </span>
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
        </div>
      </div>
    </Modal>
  );
}

