"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ExcelRegisterWorkspace } from "@/components/excel-register-workspace";
import { GenericExcelView } from "@/components/preview/generic-excel-view";
import {
  applyRegisterSheetNormalization,
  detectExcelWorkbookKind,
} from "@/lib/excel-workbook-kind";
import {
  computeRoomSpans,
  parseSheetDetails,
  printEstSheetsWithIframe,
  type SheetData,
} from "@/lib/stickers/building-excel";

export interface ExcelViewerProps {
  fileId: string;
  extension: string | null;
  density?: "compact" | "normal" | "comfortable";
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  buildingName?: string;
  fileName?: string;
}

export function ExcelViewer({
  fileId,
  extension,
  isEditing: externalEditing,
  onEditingChange,
  saveRef,
  buildingName,
  fileName,
}: ExcelViewerProps) {
  const { locale, t } = useI18n();
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const [internalEditing, setInternalEditing] = useState<boolean>(false);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = externalEditing !== undefined ? externalEditing : internalEditing;
  const setIsEditing = (val: boolean) => {
    setInternalEditing(val);
    onEditingChange?.(val);
  };

  const registerMode = useMemo(
    () => detectExcelWorkbookKind(sheets, fileName) === "register",
    [sheets, fileName],
  );

  const loadWorkbook = async (cancelled = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/drive/files/${fileId}/content?format=xlsx`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || t("preview.loadFailed"));
      }

      const contentType = response.headers.get("content-type") ?? "";
      let source: ArrayBuffer | string;
      if (contentType.includes("text/csv") || extension === "csv") {
        source = await response.text();
      } else {
        source = await response.arrayBuffer();
      }

      const wb =
        typeof source === "string"
          ? XLSX.read(source, { type: "string" })
          : XLSX.read(new Uint8Array(source), { type: "array" });

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

      if (cancelled) return;

      if (detectExcelWorkbookKind(parsed, fileName) === "register") {
        for (const s of parsed) {
          applyRegisterSheetNormalization(s);
        }
      }

      setSheets(parsed);
      setActiveTabIdx(0);
    } catch (cause) {
      if (!cancelled) setError(cause instanceof Error ? cause.message : t("preview.loadFailed"));
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void loadWorkbook(cancelled);
    return () => {
      cancelled = true;
    };
  }, [extension, fileId, fileName]);

  const handleCellChange = (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => {
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[sheetIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);

      while (targetRows.length <= rowIdx) targetRows.push([]);
      while (targetRows[rowIdx].length <= colIdx) targetRows[rowIdx].push("");

      targetRows[rowIdx][colIdx] = value;
      targetSheet.rows = targetRows;
      copy[sheetIdx] = targetSheet;
      return copy;
    });
  };

  const handleAddRow = () => {
    if (!registerMode || sheets.length === 0) return;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[activeTabIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);
      const maxCols = Math.max(10, ...targetRows.map((r) => r.length));
      const parsed = parseSheetDetails(targetSheet, buildingName);
      const newRowNum = parsed.dataRows.length + 1;
      const newRow: (string | number | null)[] = [newRowNum, "", "Proctor", "", "EP", "", "", ":", "", ":"];
      while (newRow.length < maxCols) newRow.push("");
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

  const handleDeleteRow = (rowIdx: number, sheetIdx?: number) => {
    if (!registerMode || sheets.length === 0) return;
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
        ? "تم حذف المراقب من الجدول بنجاح. اضغط 'حفظ التعديلات' بالأعلى."
        : "Proctor row removed successfully. Click 'Save Changes' to update file.",
    );
  };

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
    const lastRow = parsed.dataRows[parsed.dataRows.length - 1];
    handleDeleteRow(lastRow.rawRowIdx, targetIdx);
  };

  const handleAddTab = () => {
    if (!registerMode) return;
    const floorNum = sheets.length;
    const newTabName = `${locale === "ar" ? "الدور" : "Floor"} ${floorNum}`;
    const newRows: (string | number | null)[][] = [
      ["Center :", `AAST Sheraton Management ${newTabName}`, null, null, null, "Date: 09 - 10 - 2026", null, "EST Type : 1", null, null],
      [],
      ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time", "Departure Signature", "Time"],
      [1, "Senior Name", "Senior", "01000000000", "IP", newTabName, null, ":", null, ":"],
      [2, "Proctor Name 1", "Proctor", "01100000000", "EP", "Room 01", null, ":", null, ":"],
      [3, "Proctor Name 2", "Proctor", "01200000000", "EP", "Room 02", null, ":", null, ":"],
      [],
      [null, "Head", null, null, null, null, null, null, null, null],
      [null, "Mohamed Nabil", null, null, null, null, null, null, null, null],
    ];
    setSheets((prev) => [...prev, { name: newTabName, rows: newRows }]);
    setActiveTabIdx(sheets.length);
    toast.success(
      locale === "ar" ? `تم إضافة تاب جديد باسم "${newTabName}"` : `Added new tab "${newTabName}"`,
    );
  };

  const handleSaveChanges = async () => {
    if (sheets.length === 0) return;
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
              roomMerges.push({ s: { r: startRow, c: 5 }, e: { r: endRow, c: 5 } });
            }
          }
          const allMerges = [...otherMerges, ...roomMerges];
          if (allMerges.length > 0) ws["!merges"] = allMerges;
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

        XLSX.utils.book_append_sheet(wb, ws, (s.name || "Sheet").slice(0, 31));
      }

      const isCsv = (extension || "").toLowerCase() === "csv" && sheets.length === 1;
      const body = isCsv
        ? XLSX.write(wb, { bookType: "csv", type: "array", sheet: sheets[0]?.name })
        : XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const contentType = isCsv
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const res = await fetch(`/api/drive/files/${fileId}/content`, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || (locale === "ar" ? "فشل حفظ الملف" : "Failed to save file"));
      }

      toast.success(locale === "ar" ? "تم حفظ الملف بنجاح" : "File saved successfully");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saveRef) saveRef.current = handleSaveChanges;
    return () => {
      if (saveRef) saveRef.current = null;
    };
  }, [sheets, fileId, buildingName, registerMode, extension]);

  const handlePrint = (singleSheet: boolean = false) => {
    if (!registerMode) return;
    const sheetsToPrint = singleSheet && sheets[activeTabIdx] ? [sheets[activeTabIdx]] : sheets;
    if (sheetsToPrint.length === 0) return;
    printEstSheetsWithIframe(sheetsToPrint, { buildingName, title: fileName || "EST Building Register" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Spinner className="size-8 text-emerald-600" />
        <p className="text-sm font-medium">
          {locale === "ar" ? "جاري قراءة وتنسيق تابات الإكسيل..." : "Loading and parsing workbook tabs..."}
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</div>;
  }

  if (!registerMode) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border bg-surface/70 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {locale === "ar" ? "نفس الشيت الأصلي" : "Original Sheet"}
            </span>
            <div className="text-xs text-muted truncate">
              {locale === "ar"
                ? "عرض/تعديل ملف Excel كما تم رفعه بدون أعمدة Departure Signature أو Time"
                : "View/edit the uploaded Excel as-is, without Departure Signature or Time columns"}
            </div>
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {locale === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </button>
          )}
        </div>
        <GenericExcelView
          sheets={sheets}
          activeTabIdx={activeTabIdx}
          setActiveTabIdx={setActiveTabIdx}
          isEditing={isEditing}
          onCellChange={handleCellChange}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
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
        onAddTab={handleAddTab}
        onSave={handleSaveChanges}
        saving={saving}
        onPrint={handlePrint}
        isModal={false}
      />
    </div>
  );
}
