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
import { computeRoomSpans, type RoomSpanResult } from "@/lib/stickers/building-excel";

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

export type { RoomSpanResult };

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

          // Auto-fill inherited room values for each proctor row from vertical merges
          let headerIdx = -1;
          for (let r = 0; r < Math.min(15, cleanRows.length); r++) {
            const cell0 = String(cleanRows[r]?.[0] ?? "").trim();
            const cell1 = String(cleanRows[r]?.[1] ?? "").trim();
            if (/^No\.?$/i.test(cell0) || /^Name$/i.test(cell1)) {
              headerIdx = r;
              break;
            }
          }
          if (headerIdx !== -1) {
            let activeRoom = "";
            for (let r = headerIdx + 1; r < cleanRows.length; r++) {
              const row = cleanRows[r] || [];
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

        // Column widths for the exact 10 columns:
        // 1: No. | 2: Name | 3: Proctor Type | 4: Mobile | 5: IP / EP | 6: Room | 7: Arrival Signature | 8: Time | 9: Departure Signature | 10: Time
        ws["!cols"] = [
          { wch: 6 },  // 1: No.
          { wch: 32 }, // 2: Name
          { wch: 14 }, // 3: Proctor Type (reduced)
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

  // Official A4 Landscape Printing with EST Logo, Proctor Header, & Merged Room Cells
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
        const { spanMap, resolvedRoomMap } = computeRoomSpans(parsed.dataRows);
        const centerClean = parsed.center.replace(/^Center\s*:\s*/i, "").trim();

        const rowsHtml = parsed.dataRows
          .map((row, rIdx) => {
            const roomSpan = spanMap.get(rIdx);
            const shouldRenderRoomCell = roomSpan !== undefined;
            const roomDisplay = resolvedRoomMap.get(rIdx) || row.room || "";

            const roomCellHtml = shouldRenderRoomCell
              ? `<td rowspan="${roomSpan}" class="col-room">${roomDisplay}</td>`
              : "";

            return `
              <tr>
                <td class="col-no">${row.no}</td>
                <td class="col-name">${row.name}</td>
                <td class="col-type"><span class="badge ${row.proctorType.toLowerCase().replace(/\s+/g, "-")}">${row.proctorType}</span></td>
                <td class="col-mobile font-mono">${row.mobile}</td>
                <td class="col-ipep text-center font-bold">${row.ipEp}</td>
                ${roomCellHtml}
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
                <div class="est-register-title">PROCTOR ATTENDANCE & ASSIGNMENT REGISTER</div>
                <div class="center-banner">
                  <span class="center-label">Center :</span>
                  <span class="center-val">${centerClean}</span>
                </div>
              </div>
              <div class="header-meta">
                <div class="meta-box">
                  <div><span class="meta-lbl">Date:</span> <span class="meta-val">${parsed.date}</span></div>
                  <div><span class="meta-lbl">EST Type:</span> <span class="meta-val">${parsed.estType}</span></div>
                  <div><span class="meta-lbl">Sheet:</span> <span class="tab-highlight">${s.name}</span></div>
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
              margin: 0mm !important;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
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
              font-size: 8pt;
              line-height: 1.25;
            }
            .sheet-page {
              width: 100%;
              box-sizing: border-box;
              padding: 8mm 10mm 6mm 10mm;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .official-sheet-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 5px;
              margin-bottom: 7px;
            }
            .header-logo {
              width: 125px;
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
            .est-register-title {
              margin: 0 0 3px;
              font-size: 13pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              color: #0f172a;
              text-transform: uppercase;
            }
            .center-banner {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 9pt;
              color: #0f172a;
              background: #f8fafc;
              padding: 2.5px 12px;
              border-radius: 4px;
              border: 1.5px solid #0f172a;
            }
            .center-label {
              font-weight: 900;
              color: #0f172a;
            }
            .center-val {
              font-weight: 700;
              color: #0f172a;
            }
            .header-meta {
              width: 175px;
              text-align: right;
            }
            .meta-box {
              background: #f8fafc;
              border: 1.5px solid #0f172a;
              border-radius: 4px;
              padding: 3px 8px;
              font-size: 7.5pt;
              line-height: 1.35;
              text-align: left;
            }
            .meta-lbl {
              font-weight: 800;
              color: #0f172a;
              display: inline-block;
              min-width: 58px;
            }
            .meta-val {
              font-weight: 600;
              color: #334155;
            }
            .tab-highlight {
              font-weight: 800;
              color: #047857;
            }
            .exam-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin: 0 0 6px;
            }
            .exam-table th,
            .exam-table td {
              border: 1px solid #0f172a !important;
              padding: 4px 3px;
              vertical-align: middle;
              min-height: 27px;
            }
            .exam-table th {
              background-color: #f1f5f9 !important;
              color: #0f172a;
              font-size: 7.5pt;
              font-weight: 800;
              text-transform: uppercase;
              text-align: center;
              letter-spacing: 0.2px;
            }
            .exam-table th.col-name {
              text-align: start;
              padding-inline-start: 6px;
            }
            .exam-table tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .col-no { width: 3.5%; text-align: center !important; font-weight: bold; }
            .col-name { width: 23.5%; font-weight: 600; font-size: 8pt; padding-inline-start: 6px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .col-type { width: 8%; text-align: center !important; font-size: 7pt; }
            .col-mobile { width: 10.5%; text-align: center !important; font-size: 7.5pt; letter-spacing: 0.2px; font-family: monospace; }
            .col-ipep { width: 4.5%; text-align: center !important; font-weight: bold; }
            .col-room { width: 6.5%; text-align: center !important; font-size: 8.5pt; font-weight: 800; vertical-align: middle !important; background: #fff !important; }
            .col-sig { width: 15%; text-align: center; }
            .col-time { width: 6.5%; text-align: center !important; font-family: monospace; font-size: 7.5pt; color: #1e293b; white-space: nowrap !important; letter-spacing: 0.5px; }

            .sig-line {
              border-bottom: 1px dashed #94a3b8;
              height: 14px;
              margin: 1px 4px;
            }

            .badge {
              display: inline-block;
              padding: 1px 4px;
              font-size: 6.5pt;
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
              margin-top: 6px;
              padding-top: 4px;
              border-top: 1.5px solid #0f172a;
              font-size: 7.5pt;
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
                  // Beautiful, Clean & Ergonomic Edit Mode Focused Exclusively on Proctors & Rooms
                  return (
                    <div
                      key={sheet.name}
                      className="bg-surface-elevated border border-border rounded-2xl shadow-sm overflow-hidden"
                    >
                      {/* Edit Mode Header Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-amber-500/10 border-b border-amber-500/20">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Pencil className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span>{sheet.name}</span>
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
                                {locale === "ar" ? "تعديل بيانات المراقبين واللجان" : "Editing Proctors & Rooms"}
                              </span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {locale === "ar"
                                ? "يظهر رقم الروم أمام كل مراقب بوضوح. كرر رقم الروم للمراقبين في نفس اللجنة لدمجهم تلقائياً."
                                : "Room numbers are clearly visible on every row. Proctors with the same room will be merged automatically."}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs font-bold gap-1.5 py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          onClick={handleAddRow}
                        >
                          <Plus className="size-3.5" />
                          <span>{locale === "ar" ? "+ إضافة مراقب جديد" : "+ Add Proctor"}</span>
                        </Button>
                      </div>

                      {/* Clean Sheet Metadata Settings Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-surface-soft/40 border-b border-border">
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            {locale === "ar" ? "اسم السنتر والمبنى (Center):" : "Center / Building:"}
                          </label>
                          <input
                            type="text"
                            value={parsed.center}
                            onChange={(e) => handleCellChange(sheetRealIdx, 0, 1, e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            {locale === "ar" ? "التاريخ (Date):" : "Date:"}
                          </label>
                          <input
                            type="text"
                            value={parsed.date}
                            onChange={(e) => handleCellChange(sheetRealIdx, 0, 5, `Date: ${e.target.value}`)}
                            className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            {locale === "ar" ? "نوع الامتحان (EST Type):" : "EST Type:"}
                          </label>
                          <input
                            type="text"
                            value={parsed.estType}
                            onChange={(e) => handleCellChange(sheetRealIdx, 0, 7, `EST Type : ${e.target.value}`)}
                            className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            {locale === "ar" ? "رئيس السنتر (Head of Center):" : "Head of Center:"}
                          </label>
                          <input
                            type="text"
                            value={parsed.headName}
                            onChange={(e) => {
                              for (let r = sheet.rows.length - 1; r >= 0; r--) {
                                const val = String(sheet.rows[r]?.[1] ?? "").trim();
                                if (/Mohamed\s*Nabil|Head/i.test(val)) {
                                  handleCellChange(sheetRealIdx, r + 1 < sheet.rows.length ? r + 1 : r, 1, e.target.value);
                                  break;
                                }
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Focused, Comfortable Proctors Table */}
                      <div className="overflow-x-auto p-3">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-soft border-b border-border text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                              <th className="w-10 p-2 text-center">#</th>
                              <th className="w-16 p-2 text-center">1. No.</th>
                              <th className="p-2 text-start min-w-[200px]">2. Name (اسم المراقب)</th>
                              <th className="w-32 p-2 text-start">3. Proctor Type</th>
                              <th className="w-32 p-2 text-start">4. Mobile</th>
                              <th className="w-16 p-2 text-center">5. IP/EP</th>
                              <th className="w-24 p-2 text-center bg-sky-500/10 text-sky-700 dark:text-sky-300 font-extrabold">
                                6. Room (اللجنة)
                              </th>
                              <th className="w-28 p-2 text-center">7. Arrival Sig</th>
                              <th className="w-20 p-2 text-center">8. Time (حضور)</th>
                              <th className="w-28 p-2 text-center">9. Departure Sig</th>
                              <th className="w-20 p-2 text-center">10. Time (انصراف)</th>
                              <th className="w-12 p-2 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {parsed.dataRows.map((r, dIdx) => {
                              return (
                                <tr key={dIdx} className="hover:bg-surface-soft/60 transition-colors">
                                  <td className="p-2 text-center text-muted-foreground font-mono text-[11px]">
                                    {dIdx + 1}
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[0] ?? r.no)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 0, e.target.value)}
                                      className="w-full px-2 py-1 text-center font-bold bg-surface rounded border border-border focus:border-emerald-500 outline-none text-xs"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[1] ?? r.name)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 1, e.target.value)}
                                      className="w-full px-2.5 py-1 font-semibold bg-surface rounded border border-border focus:border-emerald-500 outline-none text-xs"
                                      placeholder="Full name..."
                                    />
                                  </td>
                                  <td className="p-1">
                                    <select
                                      value={String(sheet.rows[r.rawRowIdx]?.[2] ?? r.proctorType)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 2, e.target.value)}
                                      className="w-full px-2 py-1 bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none font-semibold cursor-pointer"
                                    >
                                      <option value="Proctor">Proctor</option>
                                      <option value="Senior">Senior</option>
                                      <option value="Roaming">Roaming</option>
                                      <option value="Control Room Assistant">Control Room Assistant</option>
                                      <option value="Head">Head</option>
                                    </select>
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[3] ?? r.mobile)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 3, e.target.value)}
                                      className="w-full px-2 py-1 font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <select
                                      value={String((sheet.rows[r.rawRowIdx]?.[4] ?? r.ipEp) || "EP")}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 4, e.target.value)}
                                      className="w-full px-1 py-1 text-center font-bold bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none cursor-pointer"
                                    >
                                      <option value="EP">EP</option>
                                      <option value="IP">IP</option>
                                    </select>
                                  </td>
                                  <td className="p-1 bg-sky-500/5">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[5] ?? r.room)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 5, e.target.value)}
                                      className="w-full px-2 py-1 text-center font-extrabold bg-surface rounded border border-sky-400 dark:border-sky-700 text-sky-900 dark:text-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-xs shadow-2xs"
                                      placeholder="e.g. 401"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[6] ?? r.arrivalSignature)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 6, e.target.value)}
                                      className="w-full px-2 py-1 text-center bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none"
                                      placeholder="Signature..."
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[7] ?? r.arrivalTime)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 7, e.target.value)}
                                      className="w-full px-1.5 py-1 text-center font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                                      placeholder="__ : __"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[8] ?? r.departureSignature)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 8, e.target.value)}
                                      className="w-full px-2 py-1 text-center bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none"
                                      placeholder="Signature..."
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={String(sheet.rows[r.rawRowIdx]?.[9] ?? r.departureTime)}
                                      onChange={(e) => handleCellChange(sheetRealIdx, r.rawRowIdx, 9, e.target.value)}
                                      className="w-full px-1.5 py-1 text-center font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                                      placeholder="__ : __"
                                    />
                                  </td>
                                  <td className="p-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(r.rawRowIdx)}
                                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                      title={locale === "ar" ? "حذف هذا المراقب" : "Delete proctor"}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="mt-3.5 flex justify-center pb-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs font-bold gap-1.5 py-2 px-5 border-dashed border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            onClick={handleAddRow}
                          >
                            <Plus className="size-3.5" />
                            <span>{locale === "ar" ? "+ إضافة مراقب جديد في نهاية الجدول" : "+ Add Proctor"}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Official High-Fidelity Formatted View with EST Logo, Header & 10 Columns
                const centerClean = parsed.center.replace(/^Center\s*:\s*/i, "").trim();
                const { spanMap, resolvedRoomMap } = computeRoomSpans(parsed.dataRows);

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
                            <h3 className="text-sm sm:text-base font-black tracking-wider text-slate-900 dark:text-white uppercase">
                              Proctor Attendance & Assignment Register
                            </h3>
                            <div className="mt-1 flex items-center gap-1.5 text-xs">
                              <span className="font-extrabold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px]">
                                Center :
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {centerClean}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sheet Tab Badge */}
                        <div className="text-center px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                          <div className="text-xs font-black">{sheet.name}</div>
                          <div className="text-[10px] font-semibold opacity-90">
                            {locale === "ar" ? "تاب معتمد" : "Official Sheet"}
                          </div>
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
                            <th className="w-28 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Proctor Type</th>
                            <th className="w-28 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Mobile</th>
                            <th className="w-14 py-2.5 px-1 text-center border-e border-slate-300 dark:border-slate-700">IP / EP</th>
                            <th className="w-20 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700 font-extrabold">Room</th>
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

                            const roomSpan = spanMap.get(rowIdx);
                            const shouldRenderRoomCell = roomSpan !== undefined;
                            const roomDisplay = resolvedRoomMap.get(rowIdx) || r.room || "";

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
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
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
                                <td className="py-2.5 px-2 font-mono text-[11px] text-center text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800">
                                  {r.mobile}
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
                                  <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {r.ipEp || "EP"}
                                  </span>
                                </td>

                                {/* Merged Room Cell: One large cell with room name centered, matching Excel */}
                                {shouldRenderRoomCell && (
                                  <td
                                    rowSpan={roomSpan}
                                    className="py-3 px-3 text-center align-middle font-bold border-e border-slate-300 dark:border-slate-700 bg-sky-50/50 dark:bg-sky-950/20 text-slate-900 dark:text-slate-100"
                                  >
                                    <div className="font-extrabold text-xs sm:text-sm tracking-wide text-slate-900 dark:text-slate-100">
                                      {roomDisplay}
                                    </div>
                                  </td>
                                )}

                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                                  {r.arrivalSignature ? (
                                    <span className="font-mono text-xs">{r.arrivalSignature}</span>
                                  ) : (
                                    <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800 whitespace-nowrap">
                                  {r.arrivalTime === ":" ? "__ : __" : (r.arrivalTime || "__ : __")}
                                </td>
                                <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                                  {r.departureSignature ? (
                                    <span className="font-mono text-xs">{r.departureSignature}</span>
                                  ) : (
                                    <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
