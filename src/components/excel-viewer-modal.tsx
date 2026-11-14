"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  X,
  Download,
  Loader2,
  CheckCircle2,
  Pencil,
  Save,
} from "lucide-react";
import { Button, Spinner } from "./ui";
import { useI18n } from "./locale-provider";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { DriveItem } from "@/lib/types";
import { ExcelRegisterWorkspace } from "./excel-register-workspace";
import { GenericExcelView } from "./preview/generic-excel-view";
import {
  applyRegisterSheetNormalization,
  detectExcelWorkbookKind,
} from "@/lib/excel-workbook-kind";
import {
  computeRoomSpans,
  parseSheetDetails,
  printEstSheetsWithIframe,
  type SheetData,
  type ParsedProctorRow,
  type RoomSpanResult,
} from "@/lib/stickers/building-excel";

export type { SheetData, ParsedProctorRow, RoomSpanResult };
export { parseSheetDetails };

interface ExcelViewerModalProps {
  open: boolean;
  onClose: () => void;
  file: DriveItem | null;
  buildingName?: string;
  onSaved?: () => void;
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
  const registerMode = useMemo(
    () => detectExcelWorkbookKind(sheets, file?.name) === "register",
    [sheets, file?.name],
  );

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

          parsed.push({
            name,
            rows: rows.length > 0 ? rows : [[]],
            merges: ws["!merges"] || [],
          });
        }

        if (detectExcelWorkbookKind(parsed, file.name) === "register") {
          for (const s of parsed) applyRegisterSheetNormalization(s);
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

  // Add new row to active tab with sequential numbering
  const handleAddRow = () => {
    if (!registerMode || sheets.length === 0) return;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[activeTabIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);

      const maxCols = Math.max(10, ...targetRows.map((r) => r.length));
      const parsed = parseSheetDetails(targetSheet, buildingName);
      const newRowNum = parsed.dataRows.length + 1;
      const newRow: (string | number | null)[] = [
        newRowNum,
        "",
        "Proctor",
        "",
        "EP",
        "",
        "",
        ":",
        "",
        ":",
      ];
      while (newRow.length < maxCols) {
        newRow.push("");
      }

      let insertIdx = targetRows.length;
      for (let r = targetRows.length - 1; r >= 0; r--) {
        const val = String(targetRows[r]?.[1] ?? "").trim();
        if (/^Head$/i.test(val) || /Mohamed\s*Nabil/i.test(val)) {
          insertIdx = r;
          break;
        }
      }

      targetRows.splice(insertIdx, 0, newRow);
      targetSheet.rows = targetRows;
      copy[activeTabIdx] = targetSheet;
      return copy;
    });
    toast.success(locale === "ar" ? "تمت إضافة مراقب جديد للجدول" : "Added new proctor row");
  };

  // Delete row with sequential re-numbering
  const handleDeleteRow = (rowIdx: number, sheetIdx?: number) => {
    if (!registerMode || sheets.length === 0) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        locale === "ar"
          ? "هل أنت متأكد من رغبتك في حذف هذا المراقب من الجدول؟"
          : "Are you sure you want to delete this proctor row?",
      );
      if (!ok) return;
    }
    const targetIdx = sheetIdx !== undefined ? sheetIdx : activeTabIdx;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[targetIdx] };
      if (!targetSheet) return prev;
      const targetRows = targetSheet.rows.filter((_, idx) => idx !== rowIdx);

      let headerIdx = -1;
      for (let r = 0; r < Math.min(10, targetRows.length); r++) {
        if (/^No\.?$/i.test(String(targetRows[r]?.[0] ?? "").trim())) {
          headerIdx = r;
          break;
        }
      }
      if (headerIdx !== -1) {
        let count = 1;
        for (let r = headerIdx + 1; r < targetRows.length; r++) {
          const row = targetRows[r];
          if (!row) continue;
          const val1 = String(row[1] ?? "").trim();
          if (/^Head$/i.test(val1) || /Mohamed\s*Nabil/i.test(val1)) break;
          if (!row[0] && !row[1] && !row[2]) continue;
          row[0] = count++;
        }
      }

      targetSheet.rows = targetRows;
      copy[targetIdx] = targetSheet;
      return copy;
    });
    toast.success(
      locale === "ar"
        ? "تم حذف المراقب من الجدول بنجاح. لا تنسَ الضغط على 'حفظ التعديلات' بالأعلى."
        : "Proctor row removed successfully. Click 'Save Changes' to update file.",
    );
  };

  // Delete last proctor row
  const handleDeleteLastRow = (sheetIdx?: number) => {
    if (!registerMode || sheets.length === 0) return;
    const targetIdx = sheetIdx !== undefined ? sheetIdx : activeTabIdx;
    const targetSheet = sheets[targetIdx];
    if (!targetSheet) return;
    const parsed = parseSheetDetails(targetSheet, buildingName);
    if (parsed.dataRows.length === 0) {
      toast.error(locale === "ar" ? "لا يوجد مراقبين لحذفهم" : "No proctors to delete");
      return;
    }
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        locale === "ar"
          ? "هل أنت متأكد من رغبتك في حذف آخر مراقب تمت إضافته؟"
          : "Are you sure you want to delete the last added proctor row?",
      );
      if (!ok) return;
    }
    const lastRow = parsed.dataRows[parsed.dataRows.length - 1];
    handleDeleteRow(lastRow.rawRowIdx, targetIdx);
  };

  // Add new floor tab
  const handleAddNewTab = () => {
    if (!registerMode) return;
    const floorNum = sheets.length;
    const newTabName = `${locale === "ar" ? "الدور" : "Floor"} ${floorNum}`;
    const newRows: (string | number | null)[][] = [
      ["Center :", `AAST Sheraton Management ${newTabName}`, null, null, null, "Date: 09 - 10 - 2026", null, "EST Type : 1", null, null],
      [],
      [
        "No.",
        "Name",
        "Proctor Type",
        "Mobile",
        "IP / EP",
        "Room",
        "Arrival Signature",
        "Time",
        "Departure Signature",
        "Time",
      ],
      [1, "Senior Name", "Senior", "01000000000", "IP", newTabName, null, ":", null, ":"],
      [2, "Proctor Name 1", "Proctor", "01100000000", "EP", "Room 01", null, ":", null, ":"],
      [3, "Proctor Name 2", "Proctor", "01200000000", "EP", "Room 02", null, ":", null, ":"],
      [],
      [null, "Head", null, null, null, null, null, null, null, null],
      [null, "Mohamed Nabil", null, null, null, null, null, null, null, null],
    ];

    setSheets((prev) => [
      ...prev,
      {
        name: newTabName,
        rows: newRows,
      },
    ]);
    setActiveTabIdx(sheets.length);
    toast.success(
      locale === "ar"
        ? `تم إضافة تاب جديد باسم "${newTabName}"`
        : `Added new tab "${newTabName}"`,
    );
  };

  // Save changes back to Google Drive / Server with proper column widths and room merges
  const handleSaveChanges = async () => {
    if (!file || sheets.length === 0) return;
    setSaving(true);

    try {
      const wb = XLSX.utils.book_new();

      for (const s of sheets) {
        const ws = XLSX.utils.aoa_to_sheet(s.rows);

        if (registerMode) {
          const otherMerges = (s.merges || []).filter((m) => m.s.c !== 5 || m.e.c !== 5);
          const roomMerges: XLSX.Range[] = [];
          const parsed = parseSheetDetails(s, buildingName);
          const { spanMap } = computeRoomSpans(parsed.dataRows);

          for (const [startIdx, span] of spanMap.entries()) {
            if (span > 1 && startIdx + span - 1 < parsed.dataRows.length) {
              const startRow = parsed.dataRows[startIdx].rawRowIdx;
              const endRow = parsed.dataRows[startIdx + span - 1].rawRowIdx;
              roomMerges.push({
                s: { r: startRow, c: 5 },
                e: { r: endRow, c: 5 },
              });
            }
          }

          const allMerges = [...otherMerges, ...roomMerges];
          if (allMerges.length > 0) {
            ws["!merges"] = allMerges;
          }

          ws["!cols"] = [
            { wch: 6 },
            { wch: 32 },
            { wch: 14 },
            { wch: 15 },
            { wch: 9 },
            { wch: 10 },
            { wch: 20 },
            { wch: 10 },
            { wch: 20 },
            { wch: 10 },
          ];
        } else if (s.merges && s.merges.length > 0) {
          ws["!merges"] = s.merges;
        }

        XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
      }

      const wbArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const res = await fetch(`/api/drive/files/${file.id}/content`, {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: wbArray,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.message || (locale === "ar" ? "فشل حفظ الملف" : "Failed to save file"),
        );
      }

      toast.success(
        locale === "ar"
          ? "تم حفظ كافة التعديلات في ملف الإكسيل بنجاح!"
          : "Spreadsheet updated and saved successfully!",
      );
      setIsEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Download raw XLSX
  const handleDownloadXlsx = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = `/api/drive/files/${file.id}/content?format=xlsx`;
    a.download = file.name || "Building_Register.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Clean Landscape Printing
  const handlePrint = (singleSheet: boolean = false) => {
    if (!registerMode) return;
    const sheetsToPrint = singleSheet && sheets[activeTabIdx] ? [sheets[activeTabIdx]] : sheets;
    if (sheetsToPrint.length === 0) return;

    toast.loading(
      locale === "ar"
        ? "جاري فتح نافذة الطباعة بالعرض (A4 Landscape)..."
        : "Opening A4 Landscape print dialog...",
      { duration: 1500 },
    );

    printEstSheetsWithIframe(sheetsToPrint, {
      buildingName,
      title: file?.name || "EST Building Register",
    });
  };

  if (!open || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="relative flex flex-col w-full max-w-7xl max-h-[94vh] bg-surface-elevated border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground">
        {/* Top Header Bar */}
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
                {registerMode
                  ? locale === "ar"
                    ? `ريجستر تفاصيل المبنى الرسمي • ${sheets.length} تابات متوفرة • 10 أعمدة معتمدة`
                    : `Official Building Register Workbook • ${sheets.length} Sheets Available • 10 Standard Columns`
                  : locale === "ar"
                    ? `عرض الشيت الأصلي كما تم رفعه • ${sheets.length} شيت`
                    : `Original uploaded workbook • ${sheets.length} sheets`}
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

            {registerMode && (
            <Button
              type="button"
              variant="secondary"
              className="text-xs font-semibold gap-1.5 py-1.5 px-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20"
              onClick={() => handlePrint(false)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة جميع التابات بتنسيق رسمي A4 بالعرض" : "Print all tabs formatted A4 Landscape"}
            >
              <Printer className="size-3.5 text-indigo-600" />
              <span>{locale === "ar" ? "طباعة الكل (A4)" : "Print All"}</span>
            </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              onClick={handleDownloadXlsx}
              title={locale === "ar" ? "تحميل ملف Excel الأصلي" : "Download raw Excel file"}
            >
              <Download className="size-4" />
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Workspace Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-surface/30">
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

          {!loading && !error && registerMode && (
            <ExcelRegisterWorkspace
              sheets={sheets}
              activeTabIdx={activeTabIdx}
              setActiveTabIdx={setActiveTabIdx}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              viewAll={viewAll}
              setViewAll={setViewAll}
              buildingName={buildingName}
              onCellChange={handleCellChange}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onDeleteLastRow={handleDeleteLastRow}
              onAddTab={handleAddNewTab}
              onSave={handleSaveChanges}
              saving={saving}
              onPrint={handlePrint}
              isModal={true}
            />
          )}

          {!loading && !error && !registerMode && (
            <GenericExcelView
              sheets={sheets}
              activeTabIdx={activeTabIdx}
              setActiveTabIdx={setActiveTabIdx}
              isEditing={isEditing}
              onCellChange={handleCellChange}
              locale={locale}
            />
          )}
        </div>

        {/* Modal Bottom Footer Note */}
        <div className="px-5 py-2.5 border-t border-border bg-surface shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>
              {registerMode
                ? locale === "ar"
                  ? "جدول بيانات المراقبين بالـ 10 أعمدة المعتمدة مع خانات توقيع الحضور والانصراف المستقلة، وطباعة A4 بالعرض (Landscape)."
                  : "Proctor Data Table with the 10 required columns, separate Arrival and Departure signatures and times, formatted for A4 Landscape."
                : locale === "ar"
                  ? "عرض وتعديل الشيت كما تم رفعه، بدون إضافة أعمدة Departure Signature أو Time."
                  : "View and edit the sheet as uploaded, without adding Departure Signature or Time columns."}
            </span>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs py-1 px-3">
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
