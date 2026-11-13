"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import type { DriveItem } from "@/lib/types";
import { EST_LOGO_BASE64 } from "@/lib/stickers/est-logo-base64";
import {
  computeRoomSpans,
  parseSheetDetails,
  type SheetData,
  type ParsedProctorRow,
} from "@/lib/stickers/building-excel";

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
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("all");
  const [loading, setLoading] = useState(kind !== "unsupported" && kind !== "image");
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const printed = useRef(false);

  // If it's an Excel sheet, always default to A4 landscape for optimal proctor table layout
  const effectiveOrientation = kind === "excel" ? "landscape" : settings.orientation;
  const pageSize = `${settings.paperSize} ${effectiveOrientation}`;
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
          const output: SheetData[] = workbook.SheetNames.map((name) => {
            const ws = workbook.Sheets[name];
            return {
              name,
              rows: XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
                header: 1,
                defval: "",
                raw: false,
                blankrows: true,
              }),
              merges: ws["!merges"] || [],
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

  const ROWS_PER_PAGE = 15;
  const printablePages: {
    sheetName: string;
    centerClean: string;
    date: string;
    estType: string;
    headName: string;
    pageIndex: number;
    totalPages: number;
    rows: ParsedProctorRow[];
  }[] = [];

  if (kind === "excel") {
    for (const sheet of visibleSheets) {
      const parsed = parseSheetDetails(sheet);
      const centerClean = parsed.center.replace(/^Center\s*:\s*/i, "").trim();
      const dataRows = parsed.dataRows;

      if (dataRows.length === 0) {
        printablePages.push({
          sheetName: sheet.name,
          centerClean,
          date: parsed.date,
          estType: parsed.estType,
          headName: parsed.headName,
          pageIndex: 0,
          totalPages: 1,
          rows: [],
        });
      } else {
        const totalPages = Math.ceil(dataRows.length / ROWS_PER_PAGE);
        for (let p = 0; p < totalPages; p++) {
          printablePages.push({
            sheetName: sheet.name,
            centerClean,
            date: parsed.date,
            estType: parsed.estType,
            headName: parsed.headName,
            pageIndex: p,
            totalPages,
            rows: dataRows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE),
          });
        }
      }
    }
  }

  return (
    <div className="print-shell min-h-dvh bg-white text-black" dir="ltr" style={{ direction: "ltr" }}>
      <style>{`
        @page {
          size: ${pageSize};
          margin: 0mm !important;
        }
        @media print {
          .no-print { display: none !important; }
          .break-after-page { page-break-after: always !important; break-after: page !important; }
          .print-shell, .print-shell > div {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10pt !important;
            direction: ltr !important;
            unicode-bidi: isolate !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-shell,
          .sheet-page,
          .exam-table,
          .official-sheet-header,
          .official-footer {
            direction: ltr !important;
            unicode-bidi: isolate !important;
          }
          .sheet-page {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 4mm 7mm 8mm 7mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sheet-page.sheet-page-last,
          .sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .exam-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          a[href]:after { content: none !important; }
        }
        .sheet-page {
          width: 100%;
          box-sizing: border-box;
          padding: 4mm 7mm 8mm 7mm;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .sheet-page.sheet-page-last,
        .sheet-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .official-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #000;
          padding-top: 0;
          padding-bottom: 4px;
          margin-top: 0;
          margin-bottom: 6px;
        }
        .header-logo { width: 320px; display: flex; align-items: center; }
        .est-logo-img { height: 140px; width: auto; object-fit: contain; display: block; }
        .header-center { flex: 1; text-align: center; padding: 0 10px; }
        .est-register-title {
          margin: 0 0 3px;
          font-size: 15.5pt;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #000;
          text-transform: uppercase;
        }
        .center-banner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5pt;
          color: #000;
          background: #f1f5f9;
          padding: 2.5px 14px;
          border-radius: 4px;
          border: 1.5px solid #000;
        }
        .center-label { font-weight: 900; color: #000; }
        .center-val { font-weight: 700; color: #000; }
        .header-meta { width: 195px; text-align: right; }
        .meta-box {
          background: #f8fafc;
          border: 1.5px solid #000;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 8.5pt;
          line-height: 1.35;
          text-align: left;
          color: #000;
        }
        .meta-lbl { font-weight: 800; color: #000; display: inline-block; min-width: 60px; }
        .meta-val { font-weight: 600; color: #1e293b; }
        .tab-highlight { font-weight: 800; color: #000; }
        .page-badge { font-weight: 700; color: #475569; font-size: 8pt; margin-inline-start: 3px; }
        .exam-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 6px; }
        .exam-table th, .exam-table td {
          border: 1.2px solid #000 !important;
          padding: 4px 5px;
          vertical-align: middle;
          color: #000 !important;
        }
        .exam-table th {
          background-color: #e2e8f0 !important;
          color: #000 !important;
          font-size: 9.5pt;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.2px;
          height: 33px;
        }
        .exam-table th.col-name { text-align: start; padding-inline-start: 8px; }
        .exam-table td { height: 37px; }
        .exam-table tr:nth-child(even) td { background-color: #fafafa; }
        .col-no { width: 3.5%; text-align: center !important; font-weight: bold; font-size: 10.5pt; }
        .col-name { width: 24%; font-weight: 700; font-size: 10.5pt; padding-inline-start: 8px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .col-type { width: 8.5%; text-align: center !important; font-size: 9pt; }
        .col-mobile { width: 10.5%; text-align: center !important; font-size: 10pt; letter-spacing: 0.2px; font-family: monospace; font-weight: 600; }
        .col-ipep { width: 4.5%; text-align: center !important; font-weight: bold; font-size: 10.5pt; }
        .col-room { width: 7%; text-align: center !important; font-size: 11.5pt; font-weight: 900; vertical-align: middle !important; background: #fff !important; }
        .col-sig { width: 14.5%; text-align: center; }
        .col-time { width: 6.5%; text-align: center !important; font-family: monospace; font-size: 9.5pt; font-weight: 700; color: #000; white-space: nowrap !important; letter-spacing: 0.5px; }
        .sig-line { border-bottom: 1.5px dashed #475569; height: 20px; margin: 1px 4px; }

        /* Grayscale & Black-and-White Optimized Badges */
        .badge {
          display: inline-block;
          padding: 2px 7px;
          font-size: 8.5pt;
          font-weight: 700;
          border-radius: 4px;
          white-space: nowrap;
          color: #000 !important;
          letter-spacing: 0.2px;
        }
        .senior { background: #e2e8f0 !important; color: #000 !important; border: 1.5px solid #000 !important; font-weight: 800 !important; }
        .roaming { background: #f1f5f9 !important; color: #000 !important; border: 1.2px dashed #000 !important; font-weight: 700 !important; }
        .proctor { background: #ffffff !important; color: #000 !important; border: 1px solid #475569 !important; font-weight: 600 !important; }
        .head { background: #1e293b !important; color: #ffffff !important; border: 1.5px solid #000 !important; font-weight: 800 !important; }

        .official-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 2px solid #000;
          font-size: 10pt;
          color: #000;
        }
        .footer-head { white-space: nowrap; }
        .footer-head strong { font-weight: 800; }
        .footer-page { text-align: right; font-weight: 800; white-space: nowrap; }
      `}</style>

      {/* Interactive Toolbar for Screen view */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <p className="text-[11px] text-slate-500">
            {t("print.hint")} · {settings.paperSize} · {effectiveOrientation === "portrait" ? t("settings.portrait") : t("settings.landscape")}
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
                      ? "bg-emerald-600 text-white"
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Printer className="size-4" />
            {t("print.now")}
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <X className="size-4" />
            {t("print.close")}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1250px] p-4 print:p-0" style={{ zoom: settings.scale / 100 }}>
        {loading && (
          <div className="no-print flex flex-col items-center justify-center gap-3 py-24 text-sm text-slate-500">
            <Spinner className="size-6 text-emerald-600" />
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
          <div
            className="docx-content border border-slate-200"
            dir="ltr"
            style={{ direction: "ltr", textAlign: "left" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {kind === "excel" &&
          printablePages.map((pageObj, pageGlobalIdx) => {
            const { spanMap, resolvedRoomMap } = computeRoomSpans(pageObj.rows);
            const isLastGlobalPage = pageGlobalIdx === printablePages.length - 1;
            const pageIndicator =
              pageObj.totalPages > 1 ? ` (Page ${pageObj.pageIndex + 1} of ${pageObj.totalPages})` : "";

            return (
              <section
                key={`${pageObj.sheetName}-p${pageObj.pageIndex}`}
                dir="ltr"
                style={{ direction: "ltr" }}
                className={`sheet-page mb-6 ${isLastGlobalPage ? "sheet-page-last" : "break-after-page"}`}
              >
                {/* Official Examination Header with Logo */}
                <div className="official-sheet-header">
                  <div className="header-logo">
                    <img src={`data:image/jpeg;base64,${EST_LOGO_BASE64}`} alt="EST Logo" className="est-logo-img" />
                  </div>
                  <div className="header-center">
                    <div className="est-register-title">PROCTOR ATTENDANCE & ASSIGNMENT REGISTER</div>
                    <div className="center-banner">
                      <span className="center-label">Center :</span>
                      <span className="center-val">{pageObj.centerClean}</span>
                    </div>
                  </div>
                  <div className="header-meta">
                    <div className="meta-box">
                      <div><span className="meta-lbl">Date:</span> <span className="meta-val">{pageObj.date}</span></div>
                      <div><span className="meta-lbl">EST Type:</span> <span className="meta-val">{pageObj.estType}</span></div>
                      <div>
                        <span className="meta-lbl">Sheet:</span>
                        <span className="tab-highlight">{pageObj.sheetName}</span>
                        {pageIndicator ? <span className="page-badge">{pageIndicator}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Examination Table with 10 Required Columns (Strict max 15 rows per page) */}
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th className="col-no">No.</th>
                      <th className="col-name">Name</th>
                      <th className="col-type">Proctor Type</th>
                      <th className="col-mobile">Mobile</th>
                      <th className="col-ipep">IP / EP</th>
                      <th className="col-room">Room</th>
                      <th className="col-sig">Arrival Signature</th>
                      <th className="col-time">Time</th>
                      <th className="col-sig">Departure Signature</th>
                      <th className="col-time">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageObj.rows.map((row, rIdx) => {
                      const roomSpan = spanMap.get(rIdx);
                      const shouldRenderRoomCell = roomSpan !== undefined;
                      const roomDisplay = resolvedRoomMap.get(rIdx) || row.room || "";

                      return (
                        <tr key={rIdx}>
                          <td className="col-no">{row.no}</td>
                          <td className="col-name">{row.name}</td>
                          <td className="col-type">
                            <span className={`badge ${row.proctorType.toLowerCase().replace(/\s+/g, "-")}`}>
                              {row.proctorType}
                            </span>
                          </td>
                          <td className="col-mobile font-mono">{row.mobile}</td>
                          <td className="col-ipep text-center font-bold">{row.ipEp}</td>
                          {shouldRenderRoomCell && (
                            <td rowSpan={roomSpan} className="col-room">
                              {roomDisplay}
                            </td>
                          )}
                          <td className="col-sig">
                            {row.arrivalSignature ? row.arrivalSignature : <div className="sig-line" />}
                          </td>
                          <td className="col-time text-center">
                            {row.arrivalTime === ":" ? "__ : __" : (row.arrivalTime || "__ : __")}
                          </td>
                          <td className="col-sig">
                            {row.departureSignature ? row.departureSignature : <div className="sig-line" />}
                          </td>
                          <td className="col-time text-center">
                            {row.departureTime === ":" ? "__ : __" : (row.departureTime || "__ : __")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Official Footer with Building Head & Page Indicator */}
                <div className="official-footer">
                  <div className="footer-head">
                    <strong>Head of Building:</strong> {pageObj.headName}
                  </div>
                  <div className="footer-page">
                    <strong>Page:</strong> {pageObj.pageIndex + 1} of {pageObj.totalPages}
                  </div>
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
