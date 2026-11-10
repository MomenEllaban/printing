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
  Pencil,
  Save,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button, Spinner } from "./ui";
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
  onSaved?: () => void;
}

interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
  merges?: XLSX.Range[];
}

export function ExcelViewerModal({
  open,
  onClose,
  file,
  buildingName,
  onSaved,
}: ExcelViewerModalProps) {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load workbook content
  useEffect(() => {
    if (!open || !file) {
      setSheets([]);
      setActiveTabIdx(0);
      setIsEditing(false);
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
        const parsed: SheetData[] = [];

        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
            header: 1,
            defval: "",
            raw: false,
            blankrows: true,
          });

          // Ensure non-empty 2D array
          const cleanRows = rows.length > 0 ? rows : [["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room"]];

          parsed.push({
            name,
            rows: cleanRows,
            merges: ws["!merges"] || [],
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

  // Handle cell edit
  const handleCellChange = (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => {
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[sheetIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);

      while (targetRows.length <= rowIdx) {
        targetRows.push([]);
      }
      while (targetRows[rowIdx].length <= colIdx) {
        targetRows[rowIdx].push("");
      }

      targetRows[rowIdx][colIdx] = value;
      targetSheet.rows = targetRows;
      copy[sheetIdx] = targetSheet;
      return copy;
    });
  };

  // Add new row to active tab
  const handleAddRow = () => {
    if (sheets.length === 0) return;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[activeTabIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);

      // Calculate max columns in this sheet
      const maxCols = Math.max(8, ...targetRows.map((r) => r.length));
      const newRowNum = targetRows.length - 2 > 0 ? targetRows.length - 2 : targetRows.length + 1;
      const newRow: (string | number | null)[] = [newRowNum, "", "Proctor", "", "EP", "", "", ":", "", ":"];
      while (newRow.length < maxCols) {
        newRow.push("");
      }

      targetRows.push(newRow);
      targetSheet.rows = targetRows;
      copy[activeTabIdx] = targetSheet;
      return copy;
    });
  };

  // Delete row from active tab
  const handleDeleteRow = (rowIdx: number) => {
    if (sheets.length === 0) return;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[activeTabIdx] };
      const targetRows = targetSheet.rows.filter((_, idx) => idx !== rowIdx);
      targetSheet.rows = targetRows;
      copy[activeTabIdx] = targetSheet;
      return copy;
    });
  };

  // Add new sheet tab
  const handleAddNewTab = () => {
    const tabName = prompt(
      locale === "ar" ? "أدخل اسم التاب / الدور الجديد:" : "Enter new tab/floor name:",
      `Management Floor ${sheets.length + 1}`,
    );
    if (!tabName?.trim()) return;

    const trimmed = tabName.trim().slice(0, 31);
    if (sheets.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(locale === "ar" ? "يوجد تاب بهذا الاسم بالفعل" : "A tab with this name already exists");
      return;
    }

    const defaultHeaders = [
      "No.",
      "Name",
      "Proctor Type",
      "Mobile",
      "IP / EP",
      "Room",
      "Arrival Time",
      "Departure Time",
    ];
    const initialRows: (string | number)[][] = [
      ["Center :", `${buildingName || "Building"} ${trimmed}`, "", "", "", `Date: ${new Date().toLocaleDateString()}`],
      [],
      defaultHeaders,
      [1, "Sample Proctor", "Senior", "01000000000", "IP", trimmed, ":", ":"],
    ];

    setSheets((prev) => [...prev, { name: trimmed, rows: initialRows }]);
    setActiveTabIdx(sheets.length);
  };

  // Save changes back to Google Drive / Server
  const handleSaveChanges = async () => {
    if (!file || sheets.length === 0) return;
    setSaving(true);
    const toastId = toast.loading(
      locale === "ar" ? "جاري حفظ تعديلات شيت المبنى..." : "Saving workbook changes...",
    );

    try {
      // Build a fresh workbook from sheets state
      const wb = XLSX.utils.book_new();

      for (const sh of sheets) {
        const ws = XLSX.utils.aoa_to_sheet(sh.rows);
        if (sh.merges && sh.merges.length > 0) {
          ws["!merges"] = sh.merges;
        }
        XLSX.utils.book_append_sheet(wb, ws, sh.name);
      }

      const outBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Send PUT request to update content
      const res = await fetch(`/api/drive/files/${file.id}/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: blob,
      });

      if (!res.ok) {
        throw new Error(locale === "ar" ? "فشل حفظ الملف على الخادم" : "Failed to save file on server");
      }

      toast.success(
        locale === "ar"
          ? "تم حفظ التعديلات في شيت المبنى بنجاح!"
          : "Workbook changes saved successfully!",
        { id: toastId },
      );

      setIsEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving spreadsheet", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Print sheets
  const handlePrint = (singleTab: boolean = false) => {
    if (!file || sheets.length === 0) return;

    // Record print status in DB
    fetch("/api/drive/print-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: file.id,
        items: [{ id: file.id, name: file.name }],
      }),
    }).catch(() => {});

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
      .map((sh, idx) => {
        // Convert current rows to clean table HTML
        const ws = XLSX.utils.aoa_to_sheet(sh.rows);
        if (sh.merges && sh.merges.length > 0) {
          ws["!merges"] = sh.merges;
        }
        const html = XLSX.utils.sheet_to_html(ws);

        return `
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
              ${html}
            </div>
          </div>
        `;
      })
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
              margin: 8mm 10mm 8mm 10mm;
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
              font-size: 9.5pt;
              line-height: 1.3;
            }
            .sheet-page {
              width: 100%;
              padding: 2px 0;
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
              margin-bottom: 8px;
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
              color: #333;
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
            tr:first-child td, tr:nth-child(3) td, tr th {
              background-color: #f8fafc !important;
              font-weight: bold;
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

    toast.loading(locale === "ar" ? "جاري فتح نافذة الطباعة بالعرض (A4 Landscape)..." : "Opening A4 Landscape print dialog...", {
      duration: 1500,
    });

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
      <div className="relative flex flex-col w-full max-w-7xl max-h-[94vh] bg-surface-elevated border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface shrink-0">
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
                {isEditing && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                    {locale === "ar" ? "وضع التعديل المباشر" : "Edit Mode"}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? `ريجستر تفاصيل المبنى • ${sheets.length} تابات متوفرة`
                  : `Building Register Workbook • ${sheets.length} Sheets Available`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                type="button"
                variant="secondary"
                className="text-xs font-semibold gap-1.5 py-1.5 px-3 border border-border hover:border-amber-500/40 text-foreground hover:bg-amber-500/10"
                onClick={() => setIsEditing(true)}
                disabled={loading || sheets.length === 0}
                title={locale === "ar" ? "تعديل البيانات والخلايا مباشرة داخل الإكسيل" : "Edit sheet data directly"}
              >
                <Pencil className="size-3.5 text-amber-500" />
                <span>{locale === "ar" ? "تعديل الشيت" : "Edit Sheet"}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="primary"
                  className="text-xs font-bold gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  <span>{locale === "ar" ? "حفظ التعديلات" : "Save Changes"}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1.5 px-2.5"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <span>{locale === "ar" ? "إنهاء التعديل" : "Exit Edit"}</span>
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              className="text-xs font-semibold gap-1.5 py-1.5 px-3 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => handlePrint(true)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة التاب المعروض حالياً على ورقة A4 بالعرض" : "Print active tab on A4 Landscape"}
            >
              <Printer className="size-3.5" />
              <span>{locale === "ar" ? "طباعة هذا التاب (A4 بالعرض)" : "Print Tab (A4)"}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              className="text-xs font-bold gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              onClick={() => handlePrint(false)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة كل التابات في صفحات A4 منفصلة بالعرض" : "Print all tabs on separate A4 pages"}
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
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
                      {sheet.rows.length}
                    </span>
                  </button>
                );
              })}

              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddNewTab}
                  className="px-2.5 py-1.5 text-xs rounded-lg font-semibold border border-dashed border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>{locale === "ar" ? "إضافة تاب/دور" : "Add Tab"}</span>
                </button>
              )}
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setViewAll(!viewAll)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors shrink-0 cursor-pointer",
                  viewAll
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-border hover:bg-surface text-muted-foreground",
                )}
              >
                {locale === "ar" ? "عرض الكل معاً" : "View All"}
              </button>
            )}
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
              {(viewAll ? sheets : [currentSheet]).map((sheet, sIdx) => {
                const sheetRealIdx = viewAll ? sIdx : activeTabIdx;

                if (isEditing) {
                  // Interactive Editable Table Grid
                  return (
                    <div
                      key={sheet.name}
                      className="bg-surface-elevated border border-border rounded-xl shadow-xs overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <FileSpreadsheet className="size-3.5" />
                          <span>{sheet.name} (وضع التعديل)</span>
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs font-semibold gap-1 py-1 px-2.5"
                          onClick={handleAddRow}
                        >
                          <Plus className="size-3" />
                          <span>{locale === "ar" ? "+ سطر جديد" : "Add Row"}</span>
                        </Button>
                      </div>

                      <div className="overflow-x-auto p-2">
                        <table className="w-full border-collapse text-xs">
                          <tbody>
                            {sheet.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-surface-soft border-b border-border/60">
                                <td className="w-8 p-1 text-center text-muted-foreground font-mono text-[10px]">
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1 border-e border-border/40 min-w-[90px]">
                                    <input
                                      type="text"
                                      value={String(cell ?? "")}
                                      onChange={(e) =>
                                        handleCellChange(sheetRealIdx, rIdx, cIdx, e.target.value)
                                      }
                                      className="w-full px-2 py-1 bg-transparent hover:bg-surface focus:bg-surface rounded border border-transparent focus:border-emerald-500 outline-none text-xs text-foreground transition-all"
                                    />
                                  </td>
                                ))}
                                <td className="w-8 p-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(rIdx)}
                                    className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title={locale === "ar" ? "حذف هذا السطر" : "Delete row"}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // Clean Beautiful Formatted View
                const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
                if (sheet.merges && sheet.merges.length > 0) {
                  ws["!merges"] = sheet.merges;
                }
                const tableHtml = XLSX.utils.sheet_to_html(ws);

                return (
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
                        {sheet.rows.length} {locale === "ar" ? "صف" : "rows"}
                      </span>
                    </div>

                    <div
                      className="p-3 overflow-x-auto excel-table-styled"
                      dangerouslySetInnerHTML={{ __html: tableHtml }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 border-t border-border bg-surface shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>
              {locale === "ar"
                ? "معاينة منسقة وتعديل مباشر مع طباعة A4 بالعرض (Landscape) وفواصل صفحات لكل تاب."
                : "Formatted preview, live editing, and A4 Landscape printing with page-breaks."}
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
          border: 1px solid var(--border, #cbd5e1);
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
