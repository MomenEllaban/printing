"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid3X3,
  Loader2,
  Search,
  Pencil,
  Save,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Button, Input, Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { EST_LOGO_BASE64 } from "@/lib/stickers/est-logo-base64";

type Cell = string | number | boolean | null;

interface SheetMerge {
  s: { c: number; r: number };
  e: { c: number; r: number };
}

interface SheetData {
  name: string;
  rows: Cell[][];
  merges: SheetMerge[];
  range: { s: { c: number; r: number }; e: { c: number; r: number } };
}

interface WorkbookData {
  sheets: string[];
  sheetMap: Record<string, SheetData>;
}

const ROW_LIMIT = 500;

export interface ExcelViewerProps {
  fileId: string;
  extension: string | null;
  density: "compact" | "normal" | "comfortable";
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function ExcelViewer({
  fileId,
  extension,
  density,
  isEditing = false,
  onEditingChange,
  saveRef,
}: ExcelViewerProps) {
  const { t, locale, dir } = useI18n();
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [search, setSearch] = useState("");
  const [visibleRows, setVisibleRows] = useState(ROW_LIMIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workbook from server
  const loadWorkbook = async (cancelled = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/drive/files/${fileId}/content?format=xlsx`, { cache: "no-store" });
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

      const XLSX = await import("xlsx");
      const parsed =
        typeof source === "string"
          ? XLSX.read(source, { type: "string" })
          : XLSX.read(new Uint8Array(source), { type: "array" });

      const sheetMap: Record<string, SheetData> = {};
      for (const name of parsed.SheetNames) {
        const ws = parsed.Sheets[name];
        const ref = ws["!ref"] || "A1";
        const range = XLSX.utils.decode_range(ref);
        const merges = (ws["!merges"] || []) as SheetMerge[];
        const rows = XLSX.utils.sheet_to_json<Cell[]>(ws, {
          header: 1,
          defval: "",
          raw: false,
          blankrows: true,
        });

        sheetMap[name] = {
          name,
          rows,
          merges,
          range,
        };
      }

      if (cancelled) return;
      setWorkbook({ sheets: parsed.SheetNames, sheetMap });
      if (!sheet || !parsed.SheetNames.includes(sheet)) {
        setSheet(parsed.SheetNames[0] ?? "");
      }
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

  const currentSheet = useMemo(() => {
    if (!workbook || !sheet) return null;
    return workbook.sheetMap[sheet] ?? null;
  }, [workbook, sheet]);

  const currentRows = useMemo(() => currentSheet?.rows ?? [], [currentSheet]);

  // Compute column count
  const columns = useMemo(
    () => currentRows.reduce((max, row) => Math.max(max, row ? row.length : 0), 0),
    [currentRows],
  );

  // Compute merges, covered coordinates, and resolved values
  const { starts, covered, resolvedValues, roomColIdx, headerRowIdx } = useMemo(() => {
    const coveredSet = new Set<string>();
    const startsMap = new Map<string, { rowSpan: number; colSpan: number; val: Cell }>();
    const resolvedMap = new Map<string, Cell>();

    if (!currentSheet) {
      return { starts: startsMap, covered: coveredSet, resolvedValues: resolvedMap, roomColIdx: 5, headerRowIdx: 2 };
    }

    const { rows, merges, range } = currentSheet;

    // Detect header row and room column
    let detectedHeaderRow = -1;
    let detectedRoomCol = -1;
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? "").trim();
        if (/^Room$/i.test(val)) {
          detectedHeaderRow = r;
          detectedRoomCol = c;
          break;
        }
      }
      if (detectedHeaderRow !== -1) break;
    }
    const finalRoomCol = detectedRoomCol !== -1 ? detectedRoomCol : 5;
    const finalHeaderRow = detectedHeaderRow !== -1 ? detectedHeaderRow : 2;

    // 1. Process explicit Excel merges from ws['!merges']
    for (const m of merges) {
      const sR = m.s.r - range.s.r;
      const eR = m.e.r - range.s.r;
      const sC = m.s.c - range.s.c;
      const eC = m.e.c - range.s.c;
      if (sR < 0 || sR >= rows.length || sC < 0) continue;
      const val = rows[sR]?.[sC];

      startsMap.set(`${sR},${sC}`, {
        rowSpan: Math.max(1, eR - sR + 1),
        colSpan: Math.max(1, eC - sC + 1),
        val,
      });

      for (let r = sR; r <= eR; r++) {
        for (let c = sC; c <= eC; c++) {
          resolvedMap.set(`${r},${c}`, val);
          if (r !== sR || c !== sC) {
            coveredSet.add(`${r},${c}`);
          }
        }
      }
    }

    // 2. Room column auto-grouping fallback if merges were not explicitly set for column 5
    if (finalHeaderRow !== -1 && finalRoomCol !== -1) {
      let grpStart = -1;
      let grpVal: Cell = "";
      for (let r = finalHeaderRow + 1; r < rows.length; r++) {
        const coord = `${r},${finalRoomCol}`;
        if (startsMap.has(coord) || coveredSet.has(coord)) {
          if (grpStart !== -1 && r - grpStart > 1) {
            startsMap.set(`${grpStart},${finalRoomCol}`, { rowSpan: r - grpStart, colSpan: 1, val: grpVal });
            for (let k = grpStart; k < r; k++) {
              resolvedMap.set(`${k},${finalRoomCol}`, grpVal);
              if (k !== grpStart) coveredSet.add(`${k},${finalRoomCol}`);
            }
          }
          grpStart = -1;
          grpVal = "";
          continue;
        }

        const rawVal = rows[r]?.[finalRoomCol];
        const strVal = String(rawVal ?? "").trim();
        const hasProctor = Boolean(String(rows[r]?.[1] ?? "").trim());

        if (strVal !== "") {
          if (grpStart !== -1 && r - grpStart > 1) {
            startsMap.set(`${grpStart},${finalRoomCol}`, { rowSpan: r - grpStart, colSpan: 1, val: grpVal });
            for (let k = grpStart; k < r; k++) {
              resolvedMap.set(`${k},${finalRoomCol}`, grpVal);
              if (k !== grpStart) coveredSet.add(`${k},${finalRoomCol}`);
            }
          }
          grpStart = r;
          grpVal = rawVal;
          resolvedMap.set(`${r},${finalRoomCol}`, rawVal);
        } else if (grpStart !== -1 && hasProctor) {
          resolvedMap.set(`${r},${finalRoomCol}`, grpVal);
        } else {
          if (grpStart !== -1 && r - grpStart > 1) {
            startsMap.set(`${grpStart},${finalRoomCol}`, { rowSpan: r - grpStart, colSpan: 1, val: grpVal });
            for (let k = grpStart; k < r; k++) {
              resolvedMap.set(`${k},${finalRoomCol}`, grpVal);
              if (k !== grpStart) coveredSet.add(`${k},${finalRoomCol}`);
            }
          }
          grpStart = -1;
          grpVal = "";
        }
      }

      if (grpStart !== -1 && rows.length - grpStart > 1) {
        startsMap.set(`${grpStart},${finalRoomCol}`, { rowSpan: rows.length - grpStart, colSpan: 1, val: grpVal });
        for (let k = grpStart; k < rows.length; k++) {
          resolvedMap.set(`${k},${finalRoomCol}`, grpVal);
          if (k !== grpStart) coveredSet.add(`${k},${finalRoomCol}`);
        }
      }
    }

    return {
      starts: startsMap,
      covered: coveredSet,
      resolvedValues: resolvedMap,
      roomColIdx: finalRoomCol,
      headerRowIdx: finalHeaderRow,
    };
  }, [currentSheet]);

  // Save changes back to Google Drive / Server
  const handleSaveSpreadsheet = async () => {
    if (!workbook || workbook.sheets.length === 0) return;
    setSaving(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      for (const name of workbook.sheets) {
        const s = workbook.sheetMap[name];
        if (!s) continue;

        // Ensure rows are cloned
        const rowsCopy = s.rows.map((r) => [...r]);

        // Find header row and room col
        let hRow = -1;
        let rCol = 5;
        for (let r = 0; r < Math.min(10, rowsCopy.length); r++) {
          const row = rowsCopy[r] || [];
          for (let c = 0; c < row.length; c++) {
            if (/^Room$/i.test(String(row[c] ?? "").trim())) {
              hRow = r;
              rCol = c;
              break;
            }
          }
          if (hRow !== -1) break;
        }
        if (hRow === -1) hRow = 2;

        const ws = XLSX.utils.aoa_to_sheet(rowsCopy);

        // Keep non-room merges (like Center and Date headers on row 0)
        const nonRoomMerges = (s.merges || []).filter((m) => {
          const isRoomMerge = m.s.c === (s.range.s.c + rCol) && m.e.c === (s.range.s.c + rCol) && m.s.r !== m.e.r;
          return !isRoomMerge;
        });

        // Compute new Room column vertical merges
        const newRoomMerges: SheetMerge[] = [];
        let grpStart = -1;
        let grpRoom = "";

        for (let r = hRow + 1; r < rowsCopy.length; r++) {
          const row = rowsCopy[r] || [];
          const nameVal = String(row[1] ?? "").trim();
          if (/^Head$/i.test(nameVal) || /Mohamed\s*Nabil/i.test(nameVal)) {
            break;
          }
          if (!row[0] && !row[1] && !row[2]) continue;

          const rVal = String(row[rCol] ?? "").trim();

          if (grpStart === -1) {
            grpStart = r;
            grpRoom = rVal;
          } else if (rVal === grpRoom && rVal !== "") {
            // continue same room
          } else {
            if (r - grpStart > 1) {
              newRoomMerges.push({
                s: { r: s.range.s.r + grpStart, c: s.range.s.c + rCol },
                e: { r: s.range.s.r + r - 1, c: s.range.s.c + rCol },
              });
            }
            grpStart = r;
            grpRoom = rVal;
          }
        }

        if (grpStart !== -1 && rowsCopy.length - grpStart > 1) {
          newRoomMerges.push({
            s: { r: s.range.s.r + grpStart, c: s.range.s.c + rCol },
            e: { r: s.range.s.r + rowsCopy.length - 1, c: s.range.s.c + rCol },
          });
        }

        const allMerges = [...nonRoomMerges, ...newRoomMerges];
        if (allMerges.length > 0) {
          ws["!merges"] = allMerges;
        }

        // Set balanced column widths matching the 10 EST columns
        ws["!cols"] = [
          { wch: 6 },  // 1: No.
          { wch: 32 }, // 2: Name
          { wch: 14 }, // 3: Proctor Type
          { wch: 15 }, // 4: Mobile
          { wch: 9 },  // 5: IP / EP
          { wch: 10 }, // 6: Room
          { wch: 20 }, // 7: Arrival Signature
          { wch: 10 }, // 8: Time (Arrival)
          { wch: 20 }, // 9: Departure Signature
          { wch: 10 }, // 10: Time (Departure)
        ];

        XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
      }

      const wbArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const res = await fetch(`/api/drive/files/${fileId}/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: wbArray,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || (locale === "ar" ? "فشل حفظ الملف" : "Failed to save file"));
      }

      toast.success(
        locale === "ar"
          ? "تم حفظ كافة التعديلات في ملف الإكسيل بنجاح!"
          : "Spreadsheet updated and saved successfully!",
      );
      if (onEditingChange) onEditingChange(false);
      await loadWorkbook();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving spreadsheet");
    } finally {
      setSaving(false);
    }
  };

  // Wire saveRef to parent (PreviewShell)
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSaveSpreadsheet;
    }
    return () => {
      if (saveRef) {
        saveRef.current = null;
      }
    };
  });

  // Handle cell edit
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!workbook || !sheet) return;
    setWorkbook((prev) => {
      if (!prev) return prev;
      const targetSheet = prev.sheetMap[sheet];
      if (!targetSheet) return prev;

      const newRows = targetSheet.rows.map((r) => [...r]);
      while (newRows.length <= rowIndex) newRows.push([]);
      while (newRows[rowIndex].length <= colIndex) newRows[rowIndex].push("");

      newRows[rowIndex][colIndex] = value;

      return {
        ...prev,
        sheetMap: {
          ...prev.sheetMap,
          [sheet]: {
            ...targetSheet,
            rows: newRows,
          },
        },
      };
    });
  };

  // Add new proctor row
  const handleAddRow = () => {
    if (!workbook || !sheet) return;
    const targetSheet = workbook.sheetMap[sheet];
    if (!targetSheet) return;

    const rows = targetSheet.rows;
    // Count existing proctor rows to compute next sequential number
    let maxNo = 0;
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const num = parseInt(String(rows[r]?.[0] ?? "").trim(), 10);
      if (!isNaN(num) && num > maxNo) maxNo = num;
    }
    const newNo = maxNo > 0 ? maxNo + 1 : rows.length - headerRowIdx;

    // Pick active room from previous row
    const prevRoom = String(resolvedValues.get(`${rows.length - 1},${roomColIdx}`) || rows[rows.length - 1]?.[roomColIdx] || "");

    const newRow: Cell[] = [
      newNo,
      "",
      "Proctor",
      "",
      "EP",
      prevRoom || "",
      "",
      ":",
      "",
      ":",
    ];

    // Insert before footer Head row if present
    let insertIdx = rows.length;
    for (let r = rows.length - 1; r >= 0; r--) {
      const val = String(rows[r]?.[1] ?? "").trim();
      if (/^Head$/i.test(val) || /Mohamed\s*Nabil/i.test(val)) {
        insertIdx = r;
        break;
      }
    }

    setWorkbook((prev) => {
      if (!prev) return prev;
      const s = prev.sheetMap[sheet];
      if (!s) return prev;
      const newRows = [...s.rows.map((r) => [...r])];
      newRows.splice(insertIdx, 0, newRow);
      return {
        ...prev,
        sheetMap: {
          ...prev.sheetMap,
          [sheet]: { ...s, rows: newRows },
        },
      };
    });
    toast.success(locale === "ar" ? "تم إضافة سطر مراقب جديد" : "Added new proctor row");
  };

  // Delete row
  const handleDeleteRow = (rowIndex: number) => {
    if (!workbook || !sheet) return;
    setWorkbook((prev) => {
      if (!prev) return prev;
      const s = prev.sheetMap[sheet];
      if (!s) return prev;
      const newRows = s.rows.filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        sheetMap: {
          ...prev.sheetMap,
          [sheet]: { ...s, rows: newRows },
        },
      };
    });
  };

  // Add new floor sheet tab
  const handleAddFloorTab = () => {
    if (!workbook) return;
    const count = workbook.sheets.length;
    const newTabName = `${locale === "ar" ? "الدور" : "Floor"} ${count}`;
    const newRows: Cell[][] = [
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
      [],
      [null, "Head", null, null, null, null, null, null, null, null],
      [null, "Mohamed Nabil", null, null, null, null, null, null, null, null],
    ];

    setWorkbook((prev) => {
      if (!prev) return prev;
      return {
        sheets: [...prev.sheets, newTabName],
        sheetMap: {
          ...prev.sheetMap,
          [newTabName]: {
            name: newTabName,
            rows: newRows,
            merges: [],
            range: { s: { c: 0, r: 0 }, e: { c: 9, r: newRows.length - 1 } },
          },
        },
      };
    });
    setSheet(newTabName);
    toast.success(locale === "ar" ? `تم إضافة تاب جديد باسم "${newTabName}"` : `Added sheet "${newTabName}"`);
  };

  // Direct clean A4 Landscape print
  const handlePrintA4Landscape = () => {
    if (!currentSheet) return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (!doc) return;

    // Build print HTML
    const printRowsHtml = currentRows
      .filter((r) => r && r.some((c) => String(c ?? "").trim() !== ""))
      .map((row, rIdx) => {
        const isHeader = rIdx === headerRowIdx;
        const isMeta = rIdx < headerRowIdx;

        let cellsHtml = "";
        for (let c = 0; c < columns; c++) {
          const coord = `${rIdx},${c}`;
          if (covered.has(coord)) continue;

          const merge = starts.get(coord);
          const rSpan = merge?.rowSpan ?? 1;
          const cSpan = merge?.colSpan ?? 1;
          const raw = row[c];
          const val = raw !== null && raw !== undefined ? String(raw) : "";

          const isRoom = c === roomColIdx;
          const isMerged = isRoom && rSpan > 1;

          if (isHeader) {
            cellsHtml += `<th style="border: 1.5px solid #000; padding: 5px 4px; background: #e2e8f0; font-weight: bold; font-size: 11px; text-align: center;">${val}</th>`;
          } else if (isMeta) {
            cellsHtml += `<td colspan="${cSpan}" style="border: none; padding: 4px 6px; font-weight: bold; font-size: 13px;">${val}</td>`;
          } else {
            const align = isRoom || c === 0 || c === 4 || c === 7 || c === 9 ? "center" : "left";
            const bg = isMerged ? "background: #f8fafc;" : "";
            const extraStyle = isMerged ? "font-weight: bold; font-size: 13px;" : "font-size: 11px;";
            cellsHtml += `<td rowspan="${rSpan > 1 ? rSpan : 1}" colspan="${cSpan > 1 ? cSpan : 1}" style="border: 1.2px solid #000; padding: 4px 6px; text-align: ${align}; ${bg} ${extraStyle} vertical-align: middle;">${val}</td>`;
          }
        }
        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${sheet} - Print</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 6mm !important;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .header-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
          }
          .logo {
            height: 48px;
            object-fit: contain;
          }
          .title-area {
            text-align: center;
            flex: 1;
          }
          .title-area h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .title-area p {
            margin: 2px 0 0 0;
            font-size: 12px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <img src="${EST_LOGO_BASE64}" class="logo" alt="EST Logo" />
          <div class="title-area">
            <h2>PROCTOR ATTENDANCE & ASSIGNMENT REGISTER</h2>
            <p>${sheet}</p>
          </div>
          <div style="width: 80px; text-align: right; font-size: 11px; font-weight: bold;">
            A4 Landscape
          </div>
        </div>
        <table>
          <tbody>
            ${printRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(frame);
      }, 1000);
    }, 500);
  };

  const isSearching = Boolean(search.trim());
  const filteredRows = useMemo(() => {
    if (!isSearching) return currentRows;
    const term = search.trim().toLowerCase();
    return currentRows.filter((row, idx) => {
      if (idx <= headerRowIdx) return true; // Keep headers visible
      return row.some((cell, colIdx) => {
        const val = resolvedValues.get(`${idx},${colIdx}`) ?? cell;
        return String(val ?? "").toLowerCase().includes(term);
      });
    });
  }, [currentRows, search, isSearching, headerRowIdx, resolvedValues]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="size-6 text-accent" />
        {t("common.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <a href={`/api/drive/files/${fileId}/content?download=1`} className="btn-secondary">
          {t("common.download")}
        </a>
      </div>
    );
  }

  if (!workbook || workbook.sheets.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">{t("common.noFiles")}</p>;
  }

  const padding = density === "compact" ? "px-2 py-1" : density === "comfortable" ? "px-4 py-3" : "px-3 py-2";

  return (
    <div className="space-y-3">
      {/* Top Sheet Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        {/* Floor Tabs */}
        <div className="scrollbar-thin flex max-w-full flex-1 gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
          {workbook.sheets.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSheet(name);
                setVisibleRows(ROW_LIMIT);
              }}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                sheet === name
                  ? "bg-accent-soft text-accent-strong shadow-xs font-bold"
                  : "text-muted hover:bg-surface-soft hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
          {isEditing && (
            <button
              type="button"
              onClick={handleAddFloorTab}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-accent hover:bg-accent-soft transition-colors cursor-pointer"
              title={locale === "ar" ? "إضافة دور جديد" : "Add floor tab"}
            >
              <Plus className="size-3.5" />
              {locale === "ar" ? "دور جديد" : "Add Floor"}
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing && (
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("preview.searchInSheet")}
                className="h-9 ps-9 text-xs"
              />
            </div>
          )}

          {/* Inline Edit/View Toggle */}
          <Button
            variant={isEditing ? "primary" : "secondary"}
            onClick={() => onEditingChange?.(!isEditing)}
            className="h-9 gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Pencil className="size-3.5" />
            {isEditing ? (locale === "ar" ? "معاينة" : "View") : (locale === "ar" ? "تعديل" : "Edit")}
          </Button>

          {/* Inline Save Button */}
          {isEditing && (
            <Button
              variant="primary"
              onClick={() => void handleSaveSpreadsheet()}
              loading={saving}
              className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <Save className="size-3.5" />
              {locale === "ar" ? "حفظ التعديلات" : "Save"}
            </Button>
          )}

          {/* Clean Landscape Print */}
          {!isEditing && (
            <Button
              variant="secondary"
              onClick={handlePrintA4Landscape}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
              title={locale === "ar" ? "طباعة الورقة الحالية A4 بالعرض بدون هوامش متصفح" : "Print sheet A4 landscape"}
            >
              <Printer className="size-3.5" />
              {locale === "ar" ? "طباعة A4 بالعرض" : "Print A4"}
            </Button>
          )}
        </div>
      </div>

      {/* Editing Alert Banner */}
      {isEditing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              {locale === "ar"
                ? "وضع التعديل نشط: يمكنك تعديل أسماء المراقبين وأرقام الرومات والهواتف ومواعيد الحضور والانصراف، ثم الضغط على زر حفظ التعديلات بالأعلى."
                : "Edit Mode Active: You can edit proctors, room assignments, phone numbers and times directly, then click Save."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleAddRow}
              className="h-7 text-[11px] gap-1 font-bold px-2.5"
            >
              <Plus className="size-3" />
              {locale === "ar" ? "إضافة مراقب" : "Add Proctor"}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSaveSpreadsheet()}
              loading={saving}
              className="h-7 text-[11px] gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
            >
              <Save className="size-3" />
              {locale === "ar" ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className="scrollbar-thin max-h-[72vh] overflow-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="sheet-table w-full border-collapse">
          <thead>
            <tr>
              <th className={cn("sticky start-0 z-20 bg-surface-strong text-muted border-b border-border text-center text-xs w-12", padding)}>
                #
              </th>
              {Array.from({ length: columns }).map((_, index) => (
                <th
                  key={index}
                  className={cn(
                    padding,
                    "bg-surface-strong text-foreground border-b border-r border-border/80 text-center font-bold text-xs uppercase tracking-wide",
                  )}
                >
                  {columnName(index)}
                </th>
              ))}
              {isEditing && (
                <th className={cn(padding, "bg-surface-strong text-center text-xs font-bold w-12 border-b border-border")}>
                  {locale === "ar" ? "حذف" : "Del"}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, visibleRows).map((row, rowIndex) => {
              const isHeaderRow = rowIndex === headerRowIdx;
              const isMetaRow = rowIndex < headerRowIdx;

              return (
                <tr
                  key={rowIndex}
                  className={cn(
                    "hover:bg-surface-soft/40 transition-colors",
                    isHeaderRow && "bg-surface-strong/80 font-bold border-y-2 border-border",
                  )}
                >
                  {/* Sticky row index column */}
                  <td
                    className={cn(
                      "sticky start-0 z-10 bg-surface text-center text-[11px] font-mono text-muted border-b border-r border-border select-none",
                      padding,
                    )}
                  >
                    {rowIndex + 1}
                  </td>

                  {/* Render row cells */}
                  {Array.from({ length: columns }).map((_, columnIndex) => {
                    const coord = `${rowIndex},${columnIndex}`;

                    // If not searching, skip cells that are covered by an active rowspan/colspan
                    if (!isSearching && !isEditing && covered.has(coord)) {
                      return null;
                    }

                    const merge = !isSearching && !isEditing ? starts.get(coord) : undefined;
                    const rowSpan = merge?.rowSpan ?? 1;
                    const colSpan = merge?.colSpan ?? 1;

                    // Effective cell value (resolving inherited room value when covered)
                    const rawVal = row[columnIndex];
                    const effectiveVal =
                      rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== ""
                        ? rawVal
                        : resolvedValues.get(coord) ?? "";

                    const isRoom = columnIndex === roomColIdx;
                    const isMergedRoom = !isEditing && isRoom && rowSpan > 1;

                    // Edit Mode cell rendering
                    if (isEditing) {
                      const isDataRow = rowIndex > headerRowIdx;
                      return (
                        <td
                          key={columnIndex}
                          className={cn(padding, "border-b border-r border-border/60 p-1")}
                        >
                          {isDataRow ? (
                            columnIndex === 0 ? (
                              <input
                                type="text"
                                value={String(rawVal ?? "")}
                                onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                className="w-full h-8 text-center font-mono text-xs font-bold rounded border border-border bg-surface-soft/50 px-1"
                              />
                            ) : columnIndex === 2 ? (
                              <select
                                value={String(rawVal || "Proctor")}
                                onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                className="w-full h-8 rounded border border-border bg-surface px-1 text-xs font-semibold cursor-pointer"
                              >
                                <option value="Proctor">Proctor</option>
                                <option value="Senior">Senior</option>
                                <option value="Roaming">Roaming</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Head">Head</option>
                              </select>
                            ) : columnIndex === 4 ? (
                              <select
                                value={String(rawVal || "EP")}
                                onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                className="w-full h-8 rounded border border-border bg-surface px-1 text-xs font-bold cursor-pointer text-center"
                              >
                                <option value="EP">EP</option>
                                <option value="IP">IP</option>
                              </select>
                            ) : columnIndex === 5 ? (
                              // Room column in Edit Mode: populated with inherited room so every proctor has their room clearly editable!
                              <input
                                type="text"
                                value={String(rawVal || effectiveVal || "")}
                                onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                placeholder={locale === "ar" ? "رقم الروم" : "Room"}
                                className="w-full h-8 text-center font-bold text-xs rounded border-2 border-accent/40 bg-accent-soft/20 px-1 focus:border-accent"
                              />
                            ) : (
                              <input
                                type="text"
                                value={String(rawVal ?? "")}
                                onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                className={cn(
                                  "w-full h-8 rounded border border-border bg-surface px-2 text-xs",
                                  columnIndex === 1 && "font-semibold",
                                  (columnIndex === 7 || columnIndex === 9) && "text-center font-mono",
                                )}
                              />
                            )
                          ) : (
                            <input
                              type="text"
                              value={String(rawVal ?? "")}
                              onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                              className="w-full h-8 rounded border border-border bg-surface px-2 text-xs font-medium"
                            />
                          )}
                        </td>
                      );
                    }

                    // View Mode cell rendering
                    return (
                      <td
                        key={columnIndex}
                        rowSpan={rowSpan > 1 ? rowSpan : undefined}
                        colSpan={colSpan > 1 ? colSpan : undefined}
                        className={cn(
                          padding,
                          "border-b border-r border-border/70 text-start transition-colors",
                          isHeaderRow && "text-center font-bold text-xs bg-surface-strong text-foreground",
                          isMetaRow && colSpan > 1 && "font-bold text-sm bg-surface-soft/40",
                          // Merged Room cell: centered vertically and horizontally, clean bold text with subtle background, ZERO dashes!
                          isMergedRoom &&
                            "align-middle text-center font-black text-sm text-foreground bg-accent/5 border-2 border-accent/30 shadow-2xs min-w-[70px]",
                          !isMergedRoom && isRoom && "text-center font-bold text-xs",
                        )}
                      >
                        {renderFormattedCell(
                          isSearching ? effectiveVal : rawVal,
                          columnIndex,
                          rowIndex,
                          headerRowIdx,
                          isMergedRoom,
                        )}
                      </td>
                    );
                  })}

                  {/* Edit mode delete row action */}
                  {isEditing && (
                    <td className={cn(padding, "border-b border-border text-center p-1")}>
                      {rowIndex > headerRowIdx && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="p-1.5 text-danger/80 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                          title={locale === "ar" ? "حذف هذا السطر" : "Delete row"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer statistics and Load more */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-1.5 font-medium">
          <Grid3X3 className="size-3.5" />
          {formatNumber(filteredRows.length, locale)} {t("preview.rows")} · {formatNumber(columns, locale)}{" "}
          {t("preview.columns")}
        </span>
        {filteredRows.length > visibleRows && (
          <Button variant="secondary" onClick={() => setVisibleRows((value) => value + ROW_LIMIT)}>
            <Loader2 className="size-4" />
            {t("common.loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}

// Convert 0-indexed column number to Excel column name (A, B, C... AA, AB)
function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

// Helper to format cell contents in View Mode
function renderFormattedCell(
  cell: Cell | undefined,
  colIdx: number,
  rowIdx: number,
  headerRowIdx: number,
  isMergedRoom: boolean,
) {
  if (cell === null || cell === undefined) return "";
  const str = String(cell).trim();
  if (!str) return "";

  // Column 2: Proctor Type badges
  if (rowIdx > headerRowIdx && colIdx === 2) {
    if (/Senior/i.test(str)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Senior
        </span>
      );
    }
    if (/Roaming/i.test(str)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
          Roaming
        </span>
      );
    }
    if (/Proctor/i.test(str)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          Proctor
        </span>
      );
    }
    if (/Head/i.test(str)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          Head
        </span>
      );
    }
  }

  // Column 4: IP / EP
  if (rowIdx > headerRowIdx && colIdx === 4) {
    if (str === "IP") {
      return <span className="font-bold text-slate-800 dark:text-slate-100">IP</span>;
    }
    return <span className="font-semibold text-muted">EP</span>;
  }

  // Column 5: Room (Merged or single)
  if (colIdx === 5 && isMergedRoom) {
    return (
      <div className="flex items-center justify-center h-full w-full py-1 text-center font-black text-sm text-foreground">
        {str}
      </div>
    );
  }

  // Signature columns: subtle placeholder if empty
  if (rowIdx > headerRowIdx && (colIdx === 6 || colIdx === 8) && (!str || str === ":")) {
    return <span className="border-b border-dashed border-border/80 block w-full min-w-[60px] h-3.5 my-1" />;
  }

  // Time columns: formatted colon
  if (rowIdx > headerRowIdx && (colIdx === 7 || colIdx === 9)) {
    return <span className="font-mono text-xs text-muted block text-center">{str || "_ _ : _ _"}</span>;
  }

  return str;
}
