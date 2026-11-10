"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Printer,
  X,
  Download,
  Loader2,
  Layers,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Modal, Button, Spinner } from "./ui";
import { useI18n } from "./locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import * as XLSX from "xlsx";
import type { DriveItem } from "@/lib/types";

interface ExcelViewerModalProps {
  open: boolean;
  onClose: () => void;
  file: DriveItem | null;
  buildingName?: string;
}

interface ParsedSheet {
  name: string;
  html: string;
  rowsCount: number;
}

export function ExcelViewerModal({
  open,
  onClose,
  file,
  buildingName,
}: ExcelViewerModalProps) {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const [viewAll, setViewAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !file) {
      setSheets([]);
      setActiveTabIdx(0);
      setViewAll(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    async function loadWorkbook() {
      if (!file) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/drive/files/${file.id}/content?format=xlsx`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(
            locale === "ar" ? "فشل تحميل شيت الإكسيل" : "Failed to load Excel file",
          );
        }

        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const parsed: ParsedSheet[] = [];

        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          // Generate clean table HTML respecting merges and widths
          const tableHtml = XLSX.utils.sheet_to_html(ws, {
            id: `tab-sheet-${name.replace(/[^a-zA-Z0-9]/g, "_")}`,
          });
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
          parsed.push({
            name,
            html: tableHtml,
            rowsCount: json.length,
          });
        }

        if (!isCancelled) {
          setSheets(parsed);
          setActiveTabIdx(0);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Error reading spreadsheet");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkbook();

    return () => {
      isCancelled = true;
    };
  }, [open, file, locale]);

  const handlePrint = (singleTab: boolean = false) => {
    if (!file || sheets.length === 0) return;

    // Record print status in database
    fetch("/api/drive/print-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: file.id,
        items: [{ id: file.id, name: file.name }],
      }),
    }).catch(() => {});

    // Create an isolated printable iframe with clean A4 landscape CSS formatting
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const sheetsToPrint = singleTab ? [sheets[activeTabIdx]] : sheets;

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const sheetsHtml = sheetsToPrint
      .map(
        (sh, idx) => `
        <div class="sheet-page ${idx < sheetsToPrint.length - 1 ? "page-break" : ""}">
          <div class="official-sheet-header">
            <div class="header-left">
              <span class="est-badge">EST OFFICIAL EXAMINATION</span>
              <span class="building-title">${buildingName || file.name}</span>
            </div>
            <div class="header-right">
              <span class="tab-badge">${sh.name}</span>
            </div>
          </div>
          <div class="table-container">
            ${sh.html}
          </div>
        </div>
      `,
      )
      .join("\n");

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${file.name} - ${singleTab ? sheets[activeTabIdx]?.name : "All Tabs"}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 12mm 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, "Segoe UI", Tahoma, sans-serif;
              color: #111;
              background: #fff;
              font-size: 10pt;
              line-height: 1.3;
            }
            .sheet-page {
              width: 100%;
              padding: 4px 0;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .official-sheet-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 10px;
            }
            .est-badge {
              font-size: 11pt;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #000;
              display: block;
            }
            .building-title {
              font-size: 9.5pt;
              font-weight: 600;
              color: #444;
            }
            .tab-badge {
              background: #f1f5f9;
              border: 1.5px solid #000;
              padding: 3px 10px;
              font-size: 9.5pt;
              font-weight: 700;
              border-radius: 4px;
            }
            .table-container {
              width: 100%;
              overflow: visible;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 0 auto;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #1e293b !important;
              padding: 5px 8px !important;
              font-size: 9.5pt !important;
              text-align: start;
              vertical-align: middle;
            }
            /* Highlight header rows */
            tr:nth-child(1) td, tr:nth-child(3) td, tr th {
              background-color: #f8fafc !important;
              font-weight: bold;
            }
            td[colspan] {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(fullHtml);
    frameDoc.close();

    toast.loading(
      locale === "ar" ? "جاري فتح نافذة الطباعة..." : "Opening printer dialog...",
      { duration: 1500 },
    );

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }
    }, 500);
  };

  if (!open || !file) return null;

  const currentSheet = sheets[activeTabIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-surface-elevated border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <FileSpreadsheet className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate flex items-center gap-2">
                <span>{file.name}</span>
                {buildingName && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-muted-foreground font-normal">
                    {buildingName}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? `شيت المبنى المعتمد • ${sheets.length} تابات/أوراق متوفرة`
                  : `Official Building Workbook • ${sheets.length} Sheets Available`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs font-semibold gap-1.5 py-1.5 px-3 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => handlePrint(true)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة التاب المعروض حالياً فقط" : "Print active tab only"}
            >
              <Printer className="size-3.5" />
              <span>{locale === "ar" ? "طباعة هذا التاب" : "Print This Tab"}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              className="text-xs font-bold gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              onClick={() => handlePrint(false)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة كل التابات في صفحات منفصلة" : "Print all tabs on separate pages"}
            >
              <Layers className="size-3.5" />
              <span>{locale === "ar" ? "طباعة كل التابات" : "Print All Tabs"}</span>
            </Button>

            <a
              href={`/api/drive/files/${file.id}/content?format=xlsx`}
              download={file.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-surface text-muted-foreground hover:text-foreground transition-all"
              title={locale === "ar" ? "تحميل ملف الإكسيل الأصلي" : "Download original Excel file"}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{locale === "ar" ? "تحميل" : "Download"}</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        {sheets.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-5 py-2 border-b border-border bg-surface-muted/50 overflow-x-auto shrink-0 select-none">
            <div className="flex items-center gap-1.5 min-w-max">
              <span className="text-[11px] font-bold text-muted-foreground uppercase me-1">
                {locale === "ar" ? "التابات:" : "Sheets:"}
              </span>
              {sheets.map((sheet, idx) => {
                const isActive = activeTabIdx === idx && !viewAll;
                return (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => {
                      setActiveTabIdx(idx);
                      setViewAll(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 border",
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-surface border-border hover:bg-surface-elevated text-foreground",
                    )}
                  >
                    <span>{sheet.name}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1 py-0.2 rounded-full",
                        isActive ? "bg-emerald-700 text-emerald-100" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {sheet.rowsCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setViewAll(!viewAll)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors shrink-0",
                viewAll
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-border hover:bg-surface text-muted-foreground",
              )}
            >
              {locale === "ar" ? "عرض الكل معاً" : "View All"}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-surface/40" ref={printAreaRef}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Spinner className="size-8 text-emerald-600" />
              <p className="text-sm font-medium">
                {locale === "ar" ? "جاري قراءة وتنسيق تابات الإكسيل..." : "Loading and parsing workbook tabs..."}
              </p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {!loading && !error && sheets.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {locale === "ar" ? "لا توجد صفحات أو بيانات في ملف الإكسيل" : "No sheets found in this workbook"}
            </div>
          )}

          {!loading && !error && sheets.length > 0 && (
            <div className="space-y-6">
              {(viewAll ? sheets : [currentSheet]).map((sheet) => (
                <div
                  key={sheet.name}
                  className="bg-surface-elevated border border-border rounded-xl shadow-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="size-3.5" />
                      {sheet.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {sheet.rowsCount} {locale === "ar" ? "صف" : "rows"}
                    </span>
                  </div>

                  <div
                    className="p-3 overflow-x-auto excel-table-styled"
                    dangerouslySetInnerHTML={{ __html: sheet.html }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 border-t border-border bg-surface shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>
              {locale === "ar"
                ? "يتم تنسيق الطباعة تلقائياً على مقاس A4 بالعرض (Landscape) مع فواصل صفحات لكل تاب."
                : "Printout is auto-formatted for A4 Landscape with page-breaks between tabs."}
            </span>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs py-1 px-3">
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .excel-table-styled table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          line-height: 1.4;
        }
        .excel-table-styled td,
        .excel-table-styled th {
          border: 1px solid var(--border, #e2e8f0);
          padding: 6px 10px;
          text-align: start;
          vertical-align: middle;
        }
        .excel-table-styled tr:hover {
          background-color: rgba(16, 185, 129, 0.04);
        }
        .excel-table-styled tr:first-child td,
        .excel-table-styled tr:nth-child(3) td {
          font-weight: 600;
          background-color: var(--surface-muted, #f8fafc);
        }
      `}</style>
    </div>
  );
}
