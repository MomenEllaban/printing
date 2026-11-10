"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Printer,
  X,
  Download,
  Loader2,
  CheckCircle2,
  Pencil,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Spinner } from "./ui";
import { useI18n } from "./locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import * as XLSX from "xlsx";
import type { DriveItem } from "@/lib/types";
import { EST_LOGO_BASE64 } from "@/lib/stickers/est-logo-base64";

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

export interface ParsedProctorRow {
  no: string | number;
  name: string;
  proctorType: string;
  mobile: string;
  ipEp: string;
  room: string;
  arrivalSignature: string;
  arrivalTime: string;
  departureSignature: string;
  departureTime: string;
  rawRowIdx: number;
}

interface ParsedSheetMeta {
  center: string;
  date: string;
  estType: string;
  headerRowIdx: number;
  dataRows: ParsedProctorRow[];
  headName: string;
}

function parseSheetDetails(
  sheet: SheetData,
  fallbackBuilding?: string,
): ParsedSheetMeta {
  const rows = sheet.rows || [];
  let center = "";
  let date = "09 - 10 - 2026";
  let estType = "1";
  let headerRowIdx = -1;
  let headName = "Mohamed Nabil";

  // Scan first 15 rows for metadata and table header
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] ?? "").trim();
      if (!val) continue;

      if (/^Center\s*:/i.test(val)) {
        const nextVal = String(row[c + 1] ?? "").trim();
        center = nextVal || val.replace(/^Center\s*:\s*/i, "");
      } else if (
        !center &&
        /Sheraton|AAST|Abu\s*Qir|Center|مبنى|إدارة|Management/i.test(val) &&
        !/No\.|Name|Date|Type/i.test(val)
      ) {
        center = val;
      }

      if (/Date\s*:/i.test(val)) {
        date = val.replace(/^Date\s*:\s*/i, "").trim() || date;
      } else if (/\b\d{2}\s*-\s*\d{2}\s*-\s*\d{4}\b/.test(val)) {
        const match = val.match(/\b\d{2}\s*-\s*\d{2}\s*-\s*\d{4}\b/);
        if (match) date = match[0];
      }

      if (/EST\s*Type\s*:/i.test(val)) {
        estType = val.replace(/.*EST\s*Type\s*:\s*/i, "").trim() || estType;
      }

      if (/^No\.?$/i.test(val) || /^Name$/i.test(val) || /^Proctor\s*Type$/i.test(val)) {
        if (headerRowIdx === -1) {
          headerRowIdx = r;
        }
      }
    }
  }

  if (!center) {
    center = fallbackBuilding ? `AAST Sheraton ${fallbackBuilding}` : "AAST Sheraton Management & Tech.";
  }

  if (headerRowIdx === -1) {
    headerRowIdx = rows.length > 2 ? 2 : 0;
  }

  // Scan bottom rows for Head name
  for (let r = rows.length - 1; r >= Math.max(0, rows.length - 8); r--) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] ?? "").trim();
      if (/^Head$/i.test(val) && r + 1 < rows.length) {
        const nextRowVal = String(rows[r + 1]?.[c] ?? "").trim();
        if (nextRowVal) headName = nextRowVal;
      } else if (/Mohamed\s*Nabil|رئيس|مسؤول/i.test(val)) {
        headName = val;
      }
    }
  }

  // Extract data rows with the exact 10 columns:
  // 1: No. | 2: Name | 3: Proctor Type | 4: Mobile | 5: IP / EP | 6: Room | 7: Arrival Signature | 8: Time | 9: Departure Signature | 10: Time
  const dataRows: ParsedProctorRow[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const cell0 = String(row[0] ?? "").trim();
    const cell1 = String(row[1] ?? "").trim();
    const cell2 = String(row[2] ?? "").trim();

    // Stop or skip if it's the footer Head row
    if (/^Head$/i.test(cell1) || /Mohamed\s*Nabil/i.test(cell1)) {
      continue;
    }
    // Skip completely blank rows
    if (!cell0 && !cell1 && !cell2) {
      continue;
    }

    const no = cell0 || dataRows.length + 1;
    const name = cell1 || "";
    const proctorType = cell2 || "Proctor";
    const mobile = String(row[3] ?? "").trim();
    const ipEp = String(row[4] ?? "").trim() || "EP";
    const room = String(row[5] ?? "").trim();
    const arrivalSignature = String(row[6] ?? "").trim();
    const arrivalTime = String(row[7] ?? "").trim() || ":";
    const departureSignature = String(row[8] ?? "").trim();
    const departureTime = String(row[9] ?? "").trim() || ":";

    dataRows.push({
      no,
      name,
      proctorType,
      mobile,
      ipEp,
      room,
      arrivalSignature,
      arrivalTime,
      departureSignature,
      departureTime,
      rawRowIdx: r,
    });
  }

  return {
    center,
    date,
    estType,
    headerRowIdx,
    dataRows,
    headName,
  };
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

          // Ensure non-empty 2D array matching the 10 required columns
          const cleanRows =
            rows.length > 0
              ? rows
              : [
                  ["Center :", `AAST Sheraton ${name}`, "", "", "", "Date: 09 - 10 - 2026", "", "EST Type : 1", "", ""],
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
                ];

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

  // Add new row to active tab with sequential numbering
  const handleAddRow = () => {
    if (sheets.length === 0) return;
    setSheets((prev) => {
      const copy = [...prev];
      const targetSheet = { ...copy[activeTabIdx] };
      const targetRows = targetSheet.rows.map((r) => [...r]);

      const maxCols = Math.max(10, ...targetRows.map((r) => r.length));
      const parsed = parseSheetDetails(targetSheet, buildingName);
      // Requirement 2: Automatically generate sequential numbers starting from 1
      const newRowNum = parsed.dataRows.length + 1;
      const newRow: (string | number | null)[] = [
        newRowNum,    // 1. No.
        "",           // 2. Name
        "Proctor",    // 3. Proctor Type
        "",           // 4. Mobile
        "EP",         // 5. IP / EP
        "",           // 6. Room
        "",           // 7. Arrival Signature
        ":",          // 8. Time (Arrival)
        "",           // 9. Departure Signature
        ":",          // 10. Time (Departure)
      ];
      while (newRow.length < maxCols) {
        newRow.push("");
      }

      // Insert before the footer Head row if present
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

  // Add new floor tab
  const handleAddNewTab = () => {
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

        // Calculate vertical merges for shared Room cells (Col 5)
        const merges: XLSX.Range[] = s.merges ? [...s.merges] : [];
        const parsed = parseSheetDetails(s, buildingName);

        if (parsed.dataRows.length > 0) {
          let runStart = -1;
          let currentRoom = "";

          for (let i = 0; i < parsed.dataRows.length; i++) {
            const rowItem = parsed.dataRows[i];
            const roomVal = rowItem.room.trim();
            const actualRowIdx = rowItem.rawRowIdx;

            if (roomVal && roomVal === currentRoom) {
              // Continue run
            } else {
              if (runStart !== -1 && i - 1 > runStart) {
                const startRow = parsed.dataRows[runStart].rawRowIdx;
                const endRow = parsed.dataRows[i - 1].rawRowIdx;
                merges.push({
                  s: { r: startRow, c: 5 },
                  e: { r: endRow, c: 5 },
                });
              }
              if (roomVal) {
                runStart = i;
                currentRoom = roomVal;
              } else {
                runStart = -1;
                currentRoom = "";
              }
            }
          }
          if (runStart !== -1 && parsed.dataRows.length - 1 > runStart) {
            const startRow = parsed.dataRows[runStart].rawRowIdx;
            const endRow = parsed.dataRows[parsed.dataRows.length - 1].rawRowIdx;
            merges.push({
              s: { r: startRow, c: 5 },
              e: { r: endRow, c: 5 },
            });
          }
        }

        if (merges.length > 0) {
          ws["!merges"] = merges;
        }

        // Column widths for the exact 10 columns:
        // 1: No. | 2: Name | 3: Proctor Type | 4: Mobile | 5: IP / EP | 6: Room | 7: Arrival Signature | 8: Time | 9: Departure Signature | 10: Time
        ws["!cols"] = [
          { wch: 6 },  // 1: No.
          { wch: 32 }, // 2: Name
          { wch: 22 }, // 3: Proctor Type
          { wch: 16 }, // 4: Mobile
          { wch: 10 }, // 5: IP / EP
          { wch: 12 }, // 6: Room
          { wch: 20 }, // 7: Arrival Signature
          { wch: 10 }, // 8: Time (Arrival)
          { wch: 20 }, // 9: Departure Signature
          { wch: 10 }, // 10: Time (Departure)
        ];

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

  // Official A4 Landscape Printing with EST Logo & Header
  const handlePrint = (singleSheet: boolean = false) => {
    const sheetsToPrint = singleSheet && sheets[activeTabIdx] ? [sheets[activeTabIdx]] : sheets;
    if (sheetsToPrint.length === 0) return;

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const sheetsHtml = sheetsToPrint
      .map((s, idx) => {
        const parsed = parseSheetDetails(s, buildingName);

        const rowsHtml = parsed.dataRows
          .map((row) => {
            const isSenior = /Senior/i.test(row.proctorType);
            const isHead = /Head/i.test(row.proctorType);
            const isRoaming = /Roaming/i.test(row.proctorType);

            return `
              <tr>
                <td class="col-no">${row.no}</td>
                <td class="col-name">${row.name}</td>
                <td class="col-type"><span class="badge ${row.proctorType.toLowerCase().replace(/\s+/g, "-")}">${row.proctorType}</span></td>
                <td class="col-mobile font-mono">${row.mobile}</td>
                <td class="col-ipep text-center font-bold">${row.ipEp}</td>
                <td class="col-room font-bold">${row.room}</td>
                <td class="col-sig">${row.arrivalSignature ? row.arrivalSignature : '<div class="sig-line"></div>'}</td>
                <td class="col-time text-center">${row.arrivalTime === ":" ? "__ : __" : (row.arrivalTime || "__ : __")}</td>
                <td class="col-sig">${row.departureSignature ? row.departureSignature : '<div class="sig-line"></div>'}</td>
                <td class="col-time text-center">${row.departureTime === ":" ? "__ : __" : (row.departureTime || "__ : __")}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <div class="sheet-page ${idx < sheetsToPrint.length - 1 ? "page-break" : ""}">
            <!-- Official Examination Header with Logo -->
            <div class="official-sheet-header">
              <div class="header-logo">
                <img src="data:image/jpeg;base64,${EST_LOGO_BASE64}" alt="EST Logo" class="est-logo-img" />
              </div>
              <div class="header-center">
                <h1 class="est-title">EGYPTIAN SCHOLASTIC TEST (EST)</h1>
                <h2 class="est-subtitle">PROCTOR ATTENDANCE & ASSIGNMENT REGISTER</h2>
                <div class="center-banner">${parsed.center}</div>
              </div>
              <div class="header-meta">
                <div class="meta-box">
                  <div><strong>Date:</strong> ${parsed.date}</div>
                  <div><strong>EST Type:</strong> ${parsed.estType}</div>
                  <div><strong>Sheet:</strong> <span class="tab-highlight">${s.name}</span></div>
                </div>
              </div>
            </div>

            <!-- Examination Table with 10 Required Columns -->
            <table class="exam-table">
              <thead>
                <tr>
                  <th class="col-no">No.</th>
                  <th class="col-name">Name</th>
                  <th class="col-type">Proctor Type</th>
                  <th class="col-mobile">Mobile</th>
                  <th class="col-ipep">IP / EP</th>
                  <th class="col-room">Room</th>
                  <th class="col-sig">Arrival Signature</th>
                  <th class="col-time">Time</th>
                  <th class="col-sig">Departure Signature</th>
                  <th class="col-time">Time</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Official Footer with Signature -->
            <div class="official-footer">
              <div class="footer-left">
                <strong>Head of Center:</strong> ${parsed.headName}
              </div>
              <div class="footer-center">
                <strong>Signature:</strong> ___________________________________
              </div>
              <div class="footer-right">
                <strong>Date:</strong> ___ / ___ / 2026
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${file?.name || "EST Building Register"}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 7mm 8mm 7mm 8mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #000;
              background: #fff;
              font-size: 8.5pt;
              line-height: 1.25;
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
              align-items: center;
              justify-content: space-between;
              border-bottom: 2.5px solid #0f172a;
              padding-bottom: 5px;
              margin-bottom: 7px;
            }
            .header-logo {
              width: 120px;
              display: flex;
              align-items: center;
            }
            .est-logo-img {
              height: 44px;
              width: auto;
              object-fit: contain;
            }
            .header-center {
              flex: 1;
              text-align: center;
              padding: 0 10px;
            }
            .est-title {
              margin: 0;
              font-size: 13pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .est-subtitle {
              margin: 2px 0 3px;
              font-size: 8.5pt;
              font-weight: 700;
              letter-spacing: 1px;
              color: #475569;
            }
            .center-banner {
              display: inline-block;
              font-size: 9pt;
              font-weight: 800;
              color: #0f172a;
              background: #f1f5f9;
              padding: 2px 10px;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
            }
            .header-meta {
              width: 160px;
              text-align: right;
            }
            .meta-box {
              background: #f8fafc;
              border: 1px solid #94a3b8;
              border-radius: 4px;
              padding: 4px 8px;
              font-size: 8pt;
              line-height: 1.35;
              text-align: left;
            }
            .tab-highlight {
              font-weight: 800;
              color: #047857;
            }
            .exam-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 8px;
            }
            .exam-table th,
            .exam-table td {
              border: 1px solid #0f172a !important;
              padding: 5px 4px;
              vertical-align: middle;
              min-height: 28px;
            }
            .exam-table th {
              background-color: #f1f5f9 !important;
              color: #0f172a;
              font-size: 8pt;
              font-weight: 800;
              text-transform: uppercase;
              text-align: start;
              letter-spacing: 0.3px;
            }
            .exam-table tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .col-no { width: 4%; text-align: center !important; font-weight: bold; }
            .col-name { width: 25%; font-weight: 600; font-size: 8.5pt; }
            .col-type { width: 12%; font-size: 8pt; }
            .col-mobile { width: 12%; font-size: 8pt; letter-spacing: 0.3px; }
            .col-ipep { width: 5.5%; text-align: center; }
            .col-room { width: 7.5%; text-align: center; font-size: 9pt; }
            .col-sig { width: 14%; text-align: center; min-width: 90px; }
            .col-time { width: 5%; text-align: center; font-family: monospace; font-size: 7.5pt; color: #1e293b; }

            .sig-line {
              border-bottom: 1px dashed #94a3b8;
              height: 16px;
              margin: 2px 6px;
            }

            .badge {
              display: inline-block;
              padding: 1px 5px;
              font-size: 7.5pt;
              font-weight: 700;
              border-radius: 3px;
              border: 1px solid #94a3b8;
            }
            .senior { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
            .roaming { background: #e0f2fe; color: #0369a1; border-color: #38bdf8; }
            .proctor { background: #ecfdf5; color: #047857; border-color: #10b981; }
            .head { background: #f3e8ff; color: #6b21a8; border-color: #a855f7; }

            .official-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 6px;
              padding-top: 5px;
              border-top: 1.5px solid #0f172a;
              font-size: 8pt;
            }
            .footer-left { width: 30%; }
            .footer-center { width: 45%; }
            .footer-right { width: 25%; text-align: right; }
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
      locale === "ar"
        ? "جاري فتح نافذة الطباعة بالعرض (A4 Landscape)..."
        : "Opening A4 Landscape print dialog...",
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
                {locale === "ar"
                  ? `ريجستر تفاصيل المبنى الرسمي • ${sheets.length} تابات متوفرة • 10 أعمدة معتمدة`
                  : `Official Building Register Workbook • ${sheets.length} Sheets Available • 10 Standard Columns`}
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
              className="text-xs font-semibold gap-1.5 py-1.5 px-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20"
              onClick={() => handlePrint(false)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة جميع التابات بتنسيق رسمي A4 بالعرض" : "Print all tabs formatted A4 Landscape"}
            >
              <Printer className="size-3.5 text-indigo-600" />
              <span>{locale === "ar" ? "طباعة الكل (A4 بالعرض)" : "Print All (Landscape)"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="text-xs gap-1.5 py-1.5 px-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => handlePrint(true)}
              disabled={loading || sheets.length === 0}
              title={locale === "ar" ? "طباعة التاب الحالي فقط" : "Print current tab only"}
            >
              <Printer className="size-3.5" />
              <span>{locale === "ar" ? "طباعة هذا التاب" : "Print Tab"}</span>
            </Button>

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

        {/* Tab Navigator */}
        {sheets.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-surface-soft/40 gap-3 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {sheets.map((sheet, idx) => {
                const isActive = activeTabIdx === idx;
                return (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => {
                      setActiveTabIdx(idx);
                      setViewAll(false);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 cursor-pointer",
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-surface-elevated text-muted-foreground hover:text-foreground border border-border hover:border-emerald-500/40",
                    )}
                  >
                    <span>{sheet.name}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-surface-soft text-muted-foreground",
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
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-surface/30" ref={printAreaRef}>
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
                const parsed = parseSheetDetails(sheet, buildingName);

                if (isEditing) {
                  // Interactive Editable Table Grid with the 10 Required Columns
                  return (
                    <div
                      key={sheet.name}
                      className="bg-surface-elevated border border-border rounded-xl shadow-xs overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <FileSpreadsheet className="size-3.5" />
                          <span>{sheet.name} ({locale === "ar" ? "وضع التعديل المباشر" : "Edit Mode"})</span>
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs font-semibold gap-1 py-1 px-2.5"
                          onClick={handleAddRow}
                        >
                          <Plus className="size-3" />
                          <span>{locale === "ar" ? "+ إضافة مراقب/سطر" : "Add Row"}</span>
                        </Button>
                      </div>

                      <div className="overflow-x-auto p-2">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface border-b border-border text-[11px] text-muted-foreground font-semibold">
                              <th className="w-8 p-1.5 text-center">#</th>
                              <th className="w-12 p-1.5 text-center">1. No.</th>
                              <th className="p-1.5 text-start min-w-[140px]">2. Name</th>
                              <th className="w-28 p-1.5 text-start">3. Proctor Type</th>
                              <th className="w-24 p-1.5 text-start">4. Mobile</th>
                              <th className="w-14 p-1.5 text-center">5. IP/EP</th>
                              <th className="w-16 p-1.5 text-center">6. Room</th>
                              <th className="w-28 p-1.5 text-center">7. Arrival Signature</th>
                              <th className="w-16 p-1.5 text-center">8. Time (Arr)</th>
                              <th className="w-28 p-1.5 text-center">9. Departure Signature</th>
                              <th className="w-16 p-1.5 text-center">10. Time (Dep)</th>
                              <th className="w-8 p-1.5 text-center"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.rows.map((row, rIdx) => {
                              return (
                                <tr key={rIdx} className="hover:bg-surface-soft border-b border-border/50">
                                  <td className="w-8 p-1 text-center text-muted-foreground font-mono text-[10px]">
                                    {rIdx + 1}
                                  </td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-1 border-e border-border/30 min-w-[70px]">
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // Official High-Fidelity Formatted View with EST Logo, Header & 10 Columns
                return (
                  <div
                    key={sheet.name}
                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl shadow-md overflow-hidden text-slate-900 dark:text-slate-100"
                  >
                    {/* Top Examination Banner with Official Logo */}
                    <div className="p-5 border-b-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                          <img
                            src={`data:image/jpeg;base64,${EST_LOGO_BASE64}`}
                            alt="EST Official Logo"
                            className="h-14 w-auto object-contain rounded drop-shadow-xs"
                          />
                          <div>
                            <h3 className="text-sm font-black tracking-wide text-slate-900 dark:text-white uppercase">
                              Egyptian Scholastic Test (EST)
                            </h3>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                              Proctor Attendance & Assignment Register
                            </p>
                          </div>
                        </div>

                        {/* Center & Building Badge */}
                        <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                          <div className="text-xs font-black">{parsed.center}</div>
                          <div className="text-[11px] font-semibold opacity-90">{sheet.name}</div>
                        </div>

                        {/* Meta Box */}
                        <div className="flex items-center gap-4 text-xs font-semibold bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Date:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{parsed.date}</span>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">EST Type:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{parsed.estType}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table of Proctors & Rooms - 10 Columns */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-extrabold text-[11px] uppercase tracking-wide">
                            <th className="w-10 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">No.</th>
                            <th className="py-2.5 px-3 text-start border-e border-slate-300 dark:border-slate-700">Name</th>
                            <th className="w-32 py-2.5 px-3 text-start border-e border-slate-300 dark:border-slate-700">Proctor Type</th>
                            <th className="w-28 py-2.5 px-2 text-start border-e border-slate-300 dark:border-slate-700">Mobile</th>
                            <th className="w-16 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">IP / EP</th>
                            <th className="w-20 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Room</th>
                            <th className="w-32 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Arrival Signature</th>
                            <th className="w-16 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Time</th>
                            <th className="w-32 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Departure Signature</th>
                            <th className="w-16 py-2.5 px-2 text-center">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                          {parsed.dataRows.map((r, rowIdx) => {
                            const isSenior = /Senior/i.test(r.proctorType);
                            const isRoaming = /Roaming/i.test(r.proctorType);
                            const isHead = /Head/i.test(r.proctorType);

                            // Check if current room is shared with previous row
                            const prevRow = rowIdx > 0 ? parsed.dataRows[rowIdx - 1] : null;
                            const isSharedRoom = prevRow && prevRow.room && prevRow.room === r.room;

                            return (
                              <tr
                                key={rowIdx}
                                className={cn(
                                  "hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors",
                                  isSenior && "bg-amber-50/40 dark:bg-amber-950/20 font-bold",
                                  isRoaming && "bg-sky-50/30 dark:bg-sky-950/15",
                                )}
                              >
                                <td className="py-2.5 px-2 text-center font-bold text-slate-500 border-e border-slate-200 dark:border-slate-800">
                                  {r.no}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 border-e border-slate-200 dark:border-slate-800">
                                  {r.name}
                                </td>
                                <td className="py-2.5 px-3 border-e border-slate-200 dark:border-slate-800">
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                                      isSenior
                                        ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300"
                                        : isRoaming
                                        ? "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300"
                                        : isHead
                                        ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300"
                                        : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300",
                                    )}
                                  >
                                    {r.proctorType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800">
                                  {r.mobile}
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
                                  <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {r.ipEp || "EP"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
                                  {r.room ? (
                                    <span
                                      className={cn(
                                        "font-extrabold text-xs px-2 py-0.5 rounded",
                                        isSharedRoom
                                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                          : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
                                      )}
                                      title={isSharedRoom ? "Shared room with previous proctor" : undefined}
                                    >
                                      {r.room}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                                  {r.arrivalSignature ? (
                                    <span className="font-mono text-xs">{r.arrivalSignature}</span>
                                  ) : (
                                    <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800">
                                  {r.arrivalTime === ":" ? "__ : __" : (r.arrivalTime || "__ : __")}
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                                  {r.departureSignature ? (
                                    <span className="font-mono text-xs">{r.departureSignature}</span>
                                  ) : (
                                    <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  {r.departureTime === ":" ? "__ : __" : (r.departureTime || "__ : __")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Official Signature Footer Bar */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-300 gap-4">
                      <div>
                        <span className="font-bold text-slate-500">{locale === "ar" ? "رئيس السنتر:" : "Head of Center:"} </span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{parsed.headName}</span>
                      </div>
                      <div className="font-medium text-slate-500">
                        <span>{locale === "ar" ? "التوقيع:" : "Signature:"} </span>
                        <span className="font-mono">___________________________________</span>
                      </div>
                      <div className="font-medium text-slate-500">
                        <span>{locale === "ar" ? "التاريخ:" : "Date:"} </span>
                        <span className="font-mono">___ / ___ / 2026</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Note */}
        <div className="px-5 py-2.5 border-t border-border bg-surface shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>
              {locale === "ar"
                ? "جدول بيانات المراقبين بالـ 10 أعمدة المعتمدة مع خانات توقيع الحضور والانصراف المستقلة، وطباعة A4 بالعرض (Landscape)."
                : "Proctor Data Table with the 10 required columns, separate Arrival and Departure signatures and times, formatted for A4 Landscape."}
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
