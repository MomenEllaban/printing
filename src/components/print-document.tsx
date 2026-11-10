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

  return (
    <div className="print-shell min-h-dvh bg-white text-black">
      <style>{`
        @page {
          size: ${pageSize};
          margin: 0mm !important;
        }
        @media print {
          .no-print { display: none !important; }
          .break-after-page { page-break-after: always; break-after: page; }
          .print-shell { padding: 8mm 10mm 6mm 10mm !important; margin: 0 !important; }
          body {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9.5pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          a[href]:after { content: none !important; }
        }
        .sheet-page { width: 100%; box-sizing: border-box; }
        .official-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }
        .header-logo { width: 130px; display: flex; align-items: center; }
        .est-logo-img { height: 48px; width: auto; object-fit: contain; }
        .header-center { flex: 1; text-align: center; padding: 0 10px; }
        .est-register-title {
          margin: 0 0 4px;
          font-size: 14.5pt;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0f172a;
          text-transform: uppercase;
        }
        .center-banner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10pt;
          color: #0f172a;
          background: #f8fafc;
          padding: 3px 14px;
          border-radius: 4px;
          border: 1.5px solid #0f172a;
        }
        .center-label { font-weight: 900; color: #0f172a; }
        .center-val { font-weight: 700; color: #0f172a; }
        .header-meta { width: 185px; text-align: right; }
        .meta-box {
          background: #f8fafc;
          border: 1.5px solid #0f172a;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 8.5pt;
          line-height: 1.35;
          text-align: left;
        }
        .meta-lbl { font-weight: 800; color: #0f172a; display: inline-block; min-width: 62px; }
        .meta-val { font-weight: 600; color: #334155; }
        .tab-highlight { font-weight: 800; color: #047857; }
        .exam-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 8px; }
        .exam-table th, .exam-table td {
          border: 1px solid #0f172a !important;
          padding: 5px 4px;
          vertical-align: middle;
          min-height: 30px;
        }
        .exam-table th {
          background-color: #f1f5f9 !important;
          color: #0f172a;
          font-size: 8.5pt;
          font-weight: 800;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.2px;
        }
        .exam-table th.col-name { text-align: start; padding-inline-start: 8px; }
        .exam-table tr:nth-child(even) td { background-color: #fafafa; }
        .col-no { width: 3.5%; text-align: center !important; font-weight: bold; font-size: 9pt; }
        .col-name { width: 23.5%; font-weight: 700; font-size: 9.5pt; padding-inline-start: 8px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .col-type { width: 8.5%; text-align: center !important; font-size: 8pt; }
        .col-mobile { width: 10.5%; text-align: center !important; font-size: 8.5pt; letter-spacing: 0.2px; font-family: monospace; }
        .col-ipep { width: 4.5%; text-align: center !important; font-weight: bold; font-size: 9pt; }
        .col-room { width: 6.5%; text-align: center !important; font-size: 10pt; font-weight: 900; vertical-align: middle !important; background: #fff !important; }
        .col-sig { width: 14.5%; text-align: center; }
        .col-time { width: 6.5%; text-align: center !important; font-family: monospace; font-size: 8.5pt; color: #1e293b; white-space: nowrap !important; letter-spacing: 0.5px; }
        .sig-line { border-bottom: 1px dashed #94a3b8; height: 16px; margin: 1px 4px; }
        .badge {
          display: inline-block;
          padding: 1.5px 5px;
          font-size: 7.5pt;
          font-weight: 700;
          border-radius: 3px;
          border: 1px solid #94a3b8;
          white-space: nowrap;
        }
        .senior { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
        .roaming { background: #e0f2fe; color: #0369a1; border-color: #38bdf8; }
        .proctor { background: #ecfdf5; color: #047857; border-color: #10b981; }
        .head { background: #f3e8ff; color: #6b21a8; border-color: #a855f7; }
        .official-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1.5px solid #0f172a;
          font-size: 8.5pt;
        }
        .footer-left { width: 30%; }
        .footer-center { width: 45%; }
        .footer-right { width: 25%; text-align: right; }
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
          <div className="docx-content border border-slate-200" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {kind === "excel" &&
          visibleSheets.map((sheet, sIdx) => {
            const parsed = parseSheetDetails(sheet);
            const { spanMap, resolvedRoomMap } = computeRoomSpans(parsed.dataRows);
            const centerClean = parsed.center.replace(/^Center\s*:\s*/i, "").trim();

            return (
              <section
                key={sheet.name}
                className={`sheet-page mb-8 ${sIdx < visibleSheets.length - 1 ? "break-after-page" : ""}`}
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
                      <span className="center-val">{centerClean}</span>
                    </div>
                  </div>
                  <div className="header-meta">
                    <div className="meta-box">
                      <div><span className="meta-lbl">Date:</span> <span className="meta-val">{parsed.date}</span></div>
                      <div><span className="meta-lbl">EST Type:</span> <span className="meta-val">{parsed.estType}</span></div>
                      <div><span className="meta-lbl">Sheet:</span> <span className="tab-highlight">{sheet.name}</span></div>
                    </div>
                  </div>
                </div>

                {/* Examination Table with 10 Required Columns */}
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
                    {parsed.dataRows.map((row, rIdx) => {
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

                {/* Official Footer with Signature */}
                <div className="official-footer">
                  <div className="footer-left">
                    <strong>Head of Center:</strong> {parsed.headName}
                  </div>
                  <div className="footer-center">
                    <strong>Signature:</strong> ___________________________________
                  </div>
                  <div className="footer-right">
                    <strong>Date:</strong> ___ / ___ / 2026
                  </div>
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
