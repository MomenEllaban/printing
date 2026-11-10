"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Printer, X } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { Spinner } from "@/components/ui";
import { formatBytes } from "@/lib/file-utils";
import type { DriveItem, Locale } from "@/lib/types";

interface PrintSettings {
  paperSize: "A4" | "A3" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  scale: number;
  margins: "default" | "none" | "minimum";
}

const MARGIN_MM: Record<PrintSettings["margins"], number> = { default: 12, minimum: 6, none: 0 };

export function BatchPrintDocument({
  items,
  settings,
}: {
  items: DriveItem[];
  settings: PrintSettings;
}) {
  const { t, locale } = useI18n();
  const [activePrintIndex, setActivePrintIndex] = useState<number | null>(null);
  const [printedCount, setPrintedCount] = useState(0);

  const pageSize = `${settings.paperSize} ${settings.orientation}`;
  const margin = `${MARGIN_MM[settings.margins]}mm`;

  const recordBatchPrint = (fileIds: string[]) => {
    fetch("/api/drive/print-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileIds,
        items: items
          .filter((item) => fileIds.includes(item.id))
          .map((item) => ({ id: item.id, name: item.name })),
      }),
    }).catch(() => {});
  };

  const printSingle = (index: number) => {
    const item = items[index];
    if (!item) return;
    recordBatchPrint([item.id]);
    const frame = document.getElementById(`batch-frame-${item.id}`) as HTMLIFrameElement | null;
    if (frame && frame.contentWindow) {
      try {
        frame.contentWindow.print();
        setPrintedCount((c) => c + 1);
        return;
      } catch {}
    }
    window.open(`/print/${item.id}`, "_blank");
  };

  const printAllSequential = async () => {
    recordBatchPrint(items.map((i) => i.id));
    for (let i = 0; i < items.length; i++) {
      setActivePrintIndex(i);
      printSingle(i);
      // Brief pause between documents
      await new Promise((r) => setTimeout(r, 1200));
    }
    setActivePrintIndex(null);
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <style>{`
        @page { size: ${pageSize}; margin: 0mm !important; }
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; break-after: page; }
          body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          a[href]:after { content: none !important; }
        }
      `}</style>

      {/* Sticky Top Bar */}
      <div className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 px-6 py-3.5 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Printer className="size-5 text-accent" />
            <span>{t("batch.printTitle")}</span>
            <span className="rounded-full bg-accent/15 text-accent px-2.5 py-0.5 text-xs font-semibold">
              {items.length} {t("common.files")}
            </span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {settings.paperSize} · {settings.orientation} · {t("print.hint")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              recordBatchPrint(items.map((i) => i.id));
              window.print();
            }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="size-4" />
            <span>{t("batch.printUnified")}</span>
          </button>

          <button
            type="button"
            onClick={printAllSequential}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <span>▶</span>
            <span>{t("batch.printSequential")}</span>
          </button>

          <button
            type="button"
            onClick={() => window.close()}
            className="btn-ghost text-xs py-2 px-2.5 flex items-center gap-1"
          >
            <X className="size-4" />
            <span>{t("common.close")}</span>
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="mx-auto max-w-5xl p-6 space-y-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="print-break rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4"
          >
            {/* Document Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-xs">
                    {index + 1}
                  </span>
                  <h2 className="text-sm font-bold text-foreground truncate">{item.name}</h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  {formatBytes(item.size, locale as Locale)} · {(item.extension || "").toUpperCase()}
                </p>
              </div>

              <div className="no-print flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printSingle(index)}
                  className="chip text-xs hover:bg-accent hover:text-white transition-colors flex items-center gap-1"
                >
                  <Printer className="size-3.5" />
                  <span>{t("common.print")}</span>
                </button>
                <a
                  href={`/print/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="icon-btn size-7 text-muted hover:text-foreground"
                  title="Open dedicated print tab"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            {/* Document Viewer Frame */}
            <div className="overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-900">
              <iframe
                id={`batch-frame-${item.id}`}
                src={`/api/drive/files/${item.id}/content?format=pdf#toolbar=0&navpanes=0`}
                title={item.name}
                className="h-[75vh] w-full print:h-[95vh] print:border-0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

