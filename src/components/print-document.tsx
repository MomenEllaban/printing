"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import type { DriveItem } from "@/lib/types";

type PrintKind = "pdf" | "excel" | "word" | "image" | "unsupported";

interface PrintSettings {
  paperSize: "A4" | "A3" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  scale: number;
  margins: "default" | "none" | "minimum";
}

const MARGIN_MM: Record<PrintSettings["margins"], number> = { default: 12, minimum: 6, none: 0 };

export function PrintDocument({
  item,
  kind,
  settings,
}: {
  item: DriveItem;
  kind: PrintKind;
  settings: PrintSettings;
}) {
  const { t } = useI18n();
  const [html, setHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; html: string; rows: (string | number | boolean | null)[][] }[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("all");
  const [loading, setLoading] = useState(kind !== "unsupported" && kind !== "image");
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const printed = useRef(false);

  const pageSize = `${settings.paperSize} ${settings.orientation}`;
  const margin = `${MARGIN_MM[settings.margins]}mm`;

  useEffect(() => {
    if (kind === "pdf" || kind === "image" || kind === "unsupported") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (kind === "word") {
          const response = await fetch(`/api/preview/docx/${item.id}`, { cache: "no-store" });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || t("print.failed"));
          if (!cancelled) setHtml(typeof data.html === "string" ? data.html : "");
        } else if (kind === "excel") {
          const response = await fetch(`/api/drive/files/${item.id}/content?format=xlsx`, { cache: "no-store" });
          if (!response.ok) throw new Error(t("print.failed"));
          const contentType = response.headers.get("content-type") ?? "";
          const extension = (item.extension ?? "").toLowerCase();
          const source =
            contentType.includes("text/csv") || extension === "csv" ? await response.text() : await response.arrayBuffer();
          const XLSX = await import("xlsx");
          const workbook =
            typeof source === "string"
              ? XLSX.read(source, { type: "string" })
              : XLSX.read(new Uint8Array(source), { type: "array" });
          const output = workbook.SheetNames.map((name) => {
            const ws = workbook.Sheets[name];
            return {
              name,
              html: XLSX.utils.sheet_to_html(ws),
              rows: XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
                header: 1,
                defval: "",
                raw: false,
                blankrows: false,
              }),
            };
          });
          if (!cancelled) setSheets(output);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t("print.failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.extension, kind, t]);

  const ready =
    kind === "pdf"
      ? iframeReady
      : kind === "image" || kind === "unsupported"
        ? true
        : !loading && !error;

  const recordPrint = () => {
    fetch("/api/drive/print-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: item.id, items: [{ id: item.id, name: item.name }] }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!ready || printed.current || kind === "unsupported") return;
    const handle = window.setTimeout(() => {
      printed.current = true;
      recordPrint();
      if (kind === "pdf") {
        const frame = document.getElementById("print-pdf-frame") as HTMLIFrameElement | null;
        try {
          frame?.contentWindow?.print();
          return;
        } catch {
          // fall through to window.print
        }
      }
      window.print();
    }, 900);
    return () => window.clearTimeout(handle);
  }, [kind, ready]);

  const visibleSheets = selectedSheet === "all" ? sheets : sheets.filter((s) => s.name === selectedSheet);

  return (
    <div className="print-shell min-h-dvh bg-white text-black">
      <style>{`
        @page { size: ${pageSize}; margin: 0mm !important; }
        @media print {
          .no-print { display: none !important; }
          .break-after-page { page-break-after: always; break-after: page; }
          .print-shell { padding: ${margin || "8mm"} !important; margin: 0 !important; }
          body { margin: 0 !important; padding: 0 !important; }
          a[href]:after { content: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; margin: 0 auto !important; }
          tr { page-break-inside: avoid !important; }
          th, td { border: 1px solid #000 !important; padding: 5px 8px !important; font-size: 9.5pt !important; }
          tr:first-child td, tr:nth-child(3) td, tr th { background-color: #f1f5f9 !important; font-weight: bold !important; }
        }
        .excel-table-container table { width: 100%; border-collapse: collapse; }
        .excel-table-container th, .excel-table-container td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: start; }
        .excel-table-container tr:first-child td, .excel-table-container tr:nth-child(3) td { background-color: #f8fafc; font-weight: 600; }
      `}</style>
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <p className="text-[11px] text-slate-500">
            {t("print.hint")} · {settings.paperSize} · {settings.orientation === "portrait" ? t("settings.portrait") : t("settings.landscape")} · {settings.scale}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          {kind === "excel" && sheets.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pe-2 border-e border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSheet("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedSheet === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Tabs ({sheets.length})
              </button>
              {sheets.map((sh) => (
                <button
                  key={sh.name}
                  type="button"
                  onClick={() => setSelectedSheet(sh.name)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedSheet === sh.name
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {sh.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              recordPrint();
              window.print();
            }}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Printer className="size-4" />
            {t("print.now")}
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="size-4" />
            {t("print.close")}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] p-4 print:p-0" style={{ zoom: settings.scale / 100 }}>
        {loading && (
          <div className="no-print flex flex-col items-center justify-center gap-3 py-24 text-sm text-slate-500">
            <Spinner className="size-6 text-teal-600" />
            {t("print.preparingFile")}
          </div>
        )}
        {error && <p className="no-print py-16 text-center text-sm font-semibold text-red-600">{error}</p>}
        {kind === "unsupported" && <p className="py-16 text-center text-sm text-slate-600">{t("print.notAvailable")}</p>}

        {kind === "pdf" && (
          <iframe
            id="print-pdf-frame"
            src={`/api/drive/files/${item.id}/content?format=pdf#toolbar=0&navpanes=0`}
            title={item.name}
            onLoad={() => setIframeReady(true)}
            className="h-[calc(100dvh-90px)] w-full rounded-lg border border-slate-200 print:h-[100vh] print:border-0"
          />
        )}

        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/drive/files/${item.id}/content`} alt={item.name} className="mx-auto max-h-[90vh] max-w-full object-contain" />
        )}

        {kind === "word" && html !== null && (
          <div className="docx-content border border-slate-200" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {kind === "excel" &&
          visibleSheets.map((sheet, sIdx) => (
            <section
              key={sheet.name}
              className={`mb-8 ${sIdx < visibleSheets.length - 1 ? "break-after-page" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between border-b-2 border-slate-900 pb-1.5 font-bold text-slate-800">
                <span className="text-base font-extrabold">{sheet.name}</span>
                <span className="text-xs text-slate-500 font-normal">{item.name}</span>
              </div>
              {sheet.html ? (
                <div
                  className="excel-table-container overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: sheet.html }}
                />
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    {sheet.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) =>
                          rowIndex === 0 ? (
                            <th key={cellIndex} className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-start font-semibold">
                              {String(cell ?? "")}
                            </th>
                          ) : (
                            <td key={cellIndex} className="border border-slate-300 px-1.5 py-1 text-start">
                              {String(cell ?? "")}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
      </div>
    </div>
  );
}
