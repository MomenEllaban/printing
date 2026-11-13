"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ExcelRegisterWorkspace } from "@/components/excel-register-workspace";
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
}

function isRegisterSheet(sheet: SheetData): boolean {
  const scanRows = sheet.rows.slice(0, 20);
  let hasDeparture = false;
  let hasArrival = false;
  let hasProctorType = false;
  let hasName = false;
  for (const row of scanRows) {
    for (const cell of row || []) {
      const v = String(cell ?? "").trim().toLowerCase();
      if (v.includes("departure signature")) hasDeparture = true;
      if (v.includes("arrival signature")) hasArrival = true;
      if (v === "proctor type" || v.includes("proctor type")) hasProctorType = true;
      if (v === "name" || v === "student name") hasName = true;
    }
  }
  return hasDeparture && hasArrival && hasProctorType && hasName;
}

function colLabel(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function GenericExcelView({
  sheets,
  activeTabIdx,
  setActiveTabIdx,
  isEditing,
  onCellChange,
  locale,
}: {
  sheets: SheetData[];
  activeTabIdx: number;
  setActiveTabIdx: (idx: number) => void;
  isEditing: boolean;
  onCellChange: (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => void;
  locale: string;
}) {
  const active = sheets[activeTabIdx];
  const colCount = useMemo(() => {
    if (!active) return 0;
    return Math.max(1, ...active.rows.map((r) => r?.length || 0));
  }, [active]);

  return (
    <div className="w-full space-y-3">
      {sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/70 p-2">
          <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            {locale === "ar" ? "Ø§Ù„Ø´ÙŠØªØ§Øª" : "Sheets"}
          </span>
          {sheets.map((s, idx) => (
            <button
              key={`${s.name}-${idx}`}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                idx === activeTabIdx
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
                  : "border-border bg-surface text-foreground hover:bg-surface-soft hover:border-emerald-500/30"
              }`}
            >
              {s.name || `${locale === "ar" ? "Ø´ÙŠØª" : "Sheet"} ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-500/10 via-surface to-sky-500/10 px-4 py-2.5">
          <div className="text-xs font-bold text-foreground">
            {active?.name || (locale === "ar" ? "Ø´ÙŠØª" : "Sheet")}
          </div>
          <div className="text-[11px] text-muted">
            {(active?.rows?.length || 0).toLocaleString()} {locale === "ar" ? "ØµÙ" : "rows"} Ã— {colCount.toLocaleString()} {locale === "ar" ? "Ø¹Ù…ÙˆØ¯" : "cols"}
          </div>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full border-separate border-spacing-0 text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky start-0 z-20 border-b border-e border-border bg-surface-soft/95 backdrop-blur px-2 py-2 text-center text-[11px] font-bold text-muted w-12 min-w-12">#</th>
                {Array.from({ length: colCount }).map((_, cIdx) => (
                  <th key={cIdx} className="border-b border-e border-border bg-surface-soft/95 backdrop-blur px-3 py-2 text-center text-[11px] font-bold text-muted min-w-[140px] last:border-e-0">
                    {colLabel(cIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(active?.rows || []).map((row, rIdx) => (
                <tr key={rIdx} className="group">
                  <td className="sticky start-0 z-[5] border-b border-e border-border bg-surface-soft/80 px-2 py-2 text-center text-[11px] font-semibold text-muted">
                    {rIdx + 1}
                  </td>
                  {Array.from({ length: colCount }).map((_, cIdx) => {
                    const value = row?.[cIdx] ?? "";
                    const text = value === null || value === undefined ? "" : String(value);
                    return (
                      <td
                        key={cIdx}
                        className={`border-b border-e border-border/70 p-0 align-top min-w-[140px] max-w-[460px] last:border-e-0 ${rIdx % 2 === 0 ? "bg-surface" : "bg-surface-soft/20"} group-hover:bg-emerald-500/[0.03]`}
                      >
                        {isEditing ? (
                          <input
                            value={text}
                            onChange={(e) => onCellChange(activeTabIdx, rIdx, cIdx, e.target.value)}
                            className="h-full w-full min-w-[140px] bg-transparent px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-inset focus:ring-emerald-500/40"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap break-words px-3 py-2 leading-relaxed text-foreground">
                            {text || <span className="text-muted/40"> </span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {(!active || active.rows.length === 0) && (
                <tr>
                  <td colSpan={colCount + 1} className="px-4 py-10 text-center text-sm text-muted">
                    {locale === "ar" ? "Ø§Ù„Ø´ÙŠØª ÙØ§Ø±Øº" : "Empty sheet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ExcelViewer({
  fileId,
  extension,
  isEditing: externalEditing,
  onEditingChange,
  saveRef,
  buildingName,
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

  const registerMode = useMemo(() => sheets.length > 0 && sheets.every(isRegisterSheet), [sheets]);

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

      // Apply register-specific normalization only for register workbooks
      const detectedRegister = parsed.length > 0 && parsed.every(isRegisterSheet);
      if (detectedRegister) {
        for (const s of parsed) {
          if (s.rows.length === 0) {
            s.rows = [
              ["Center :", `AAST Sheraton ${s.name}`, "", "", "", "Date: 09 - 10 - 2026", "", "EST Type : 1", "", ""],
              [],
              ["No.", "Name", "Proctor Type", "Mobile", "IP / EP", "Room", "Arrival Signature", "Time", "Departure Signature", "Time"],
            ];
          }

          let headerIdx = -1;
          for (let r = 0; r < Math.min(15, s.rows.length); r++) {
            const cell0 = String(s.rows[r]?.[0] ?? "").trim();
            const cell1 = String(s.rows[r]?.[1] ?? "").trim();
            if (/^No\.?$/i.test(cell0) || /^Name$/i.test(cell1)) {
              headerIdx = r;
              break;
            }
          }
          if (headerIdx !== -1) {
            let activeRoom = "";
            for (let r = headerIdx + 1; r < s.rows.length; r++) {
              const row = s.rows[r] || [];
              const cell1 = String(row[1] ?? "").trim();
              if (/^Head$/i.test(cell1) || /Mohamed\s*Nabil/i.test(cell1)) break;
              if (!row[0] && !row[1] && !row[2]) continue;

              const currentRoom = String(row[5] ?? "").trim();
              if (currentRoom) {
                activeRoom = currentRoom;
              } else if (activeRoom) {
                while (row.length <= 5) row.push("");
                row[5] = activeRoom;
              }
            }
          }
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
  }, [extension, fileId]);

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

  // --- Register-only actions ---
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
        if (/^No\.?$/i.test(String(targetRows[r]?.[0] ?? "").trim())) { headerIdx = r; break; }
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
  };

  const handleDeleteLastRow = (sheetIdx?: number) => {
    if (!registerMode || sheets.length === 0) return;
    const targetIdx = sheetIdx !== undefined ? sheetIdx : activeTabIdx;
    const targetSheet = sheets[targetIdx];
    if (!targetSheet) return;
    const parsed = parseSheetDetails(targetSheet, buildingName);
    if (parsed.dataRows.length === 0) return;
    const lastRow = parsed.dataRows[parsed.dataRows.length - 1];
    handleDeleteRow(lastRow.rawRowIdx, targetIdx);
  };

  const handleAddTab = () => {
    if (!registerMode) return;
    const floorNum = sheets.length;
    const newTabName = `${locale === "ar" ? "Ø§Ù„Ø¯ÙˆØ±" : "Floor"} ${floorNum}`;
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
            { wch: 6 }, { wch: 32 }, { wch: 14 }, { wch: 15 }, { wch: 9 },
            { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
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
        throw new Error(errData.message || (locale === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ù…Ù„Ù" : "Failed to save file"));
      }

      toast.success(locale === "ar" ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…Ù„Ù Ø¨Ù†Ø¬Ø§Ø­" : "File saved successfully");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saveRef) saveRef.current = handleSaveChanges;
    return () => { if (saveRef) saveRef.current = null; };
  }, [sheets, fileId, buildingName, registerMode, extension]);

  const handlePrint = (singleSheet: boolean = false) => {
    if (!registerMode) return;
    const sheetsToPrint = singleSheet && sheets[activeTabIdx] ? [sheets[activeTabIdx]] : sheets;
    if (sheetsToPrint.length === 0) return;
    printEstSheetsWithIframe(sheetsToPrint, { buildingName, title: "EST Building Register" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Spinner className="size-8 text-emerald-600" />
        <p className="text-sm font-medium">{locale === "ar" ? "Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù„Ù..." : "Loading spreadsheet..."}</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</div>;
  }

  if (!registerMode) {
    return (
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
                ? "عرض/تعديل ملف Excel كما تم رفعه بدون أي أعمدة إضافية"
                : "View/edit the Excel file exactly as uploaded, with no extra columns"}
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
