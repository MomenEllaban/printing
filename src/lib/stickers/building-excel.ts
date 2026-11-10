import * as XLSX from "xlsx";
import { EST_LOGO_BASE64 } from "./est-logo-base64";

export interface BuildingExcelData {
  buildingName: string;
  examName?: string;
  governorate?: string;
  center?: string;
  date?: string;
  floors?: string[];
  rooms?: string[];
}

export interface SheetTabInfo {
  name: string;
  html: string;
  rows: (string | number | boolean | null)[][];
}

export interface SheetData {
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

export interface ParsedSheetMeta {
  center: string;
  date: string;
  estType: string;
  headerRowIdx: number;
  dataRows: ParsedProctorRow[];
  headName: string;
}

export interface ProctorRowItem {
  room: string;
  rawRowIdx?: number;
  proctorType?: string;
}

export interface RoomSpanResult {
  spanMap: Map<number, number>; // index in dataRows -> rowspan (>0 means render cell, undefined means skip)
  resolvedRoomMap: Map<number, string>; // index in dataRows -> resolved room value
}

/**
 * Computes vertical cell merging (rowspan) for the Room column.
 * Seamlessly groups consecutive proctors assigned to the same room or floor.
 */
export function computeRoomSpans(
  dataRows: ProctorRowItem[],
  _merges?: XLSX.Range[],
): RoomSpanResult {
  const spanMap = new Map<number, number>();
  const resolvedRoomMap = new Map<number, string>();

  if (!dataRows || dataRows.length === 0) {
    return { spanMap, resolvedRoomMap };
  }

  let currentStart = 0;
  let currentRoom = dataRows[0]?.room ? String(dataRows[0].room).trim() : "";

  for (let i = 0; i < dataRows.length; i++) {
    const rawVal = dataRows[i]?.room;
    const roomVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";

    if (i === 0) {
      currentStart = 0;
      currentRoom = roomVal;
      continue;
    }

    // A new group starts when roomVal is non-empty AND differs from currentRoom (if currentRoom is not empty)
    // or when currentRoom was empty and roomVal is non-empty
    const isNewGroup = roomVal !== "" && (currentRoom === "" || roomVal !== currentRoom);

    if (isNewGroup) {
      const span = i - currentStart;
      spanMap.set(currentStart, span);
      for (let k = currentStart; k < i; k++) {
        resolvedRoomMap.set(k, currentRoom);
      }
      currentStart = i;
      currentRoom = roomVal;
    }
  }

  // Finalize the last group
  const lastSpan = dataRows.length - currentStart;
  spanMap.set(currentStart, lastSpan);
  for (let k = currentStart; k < dataRows.length; k++) {
    resolvedRoomMap.set(k, currentRoom);
  }

  return { spanMap, resolvedRoomMap };
}

/**
 * Parses sheet rows into structured metadata, header row, and 10-column proctor data.
 */
export function parseSheetDetails(
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

/**
 * Generates official high-fidelity A4 landscape HTML matching the EST Proctor Attendance Register.
 * Features enlarged readable fonts, official EST logo, Center banner, 10 columns, and zero-margin printing.
 */
export function generateEstPrintHtml(
  sheets: SheetData[],
  options?: { buildingName?: string; title?: string },
): string {
  const sheetsToPrint = sheets || [];
  const buildingName = options?.buildingName;
  const pageTitle = options?.title || "EST Building Register";

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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${pageTitle}</title>
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
            font-size: 9.5pt;
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
            margin-bottom: 8px;
          }
          .header-logo {
            width: 130px;
            display: flex;
            align-items: center;
          }
          .est-logo-img {
            height: 48px;
            width: auto;
            object-fit: contain;
          }
          .header-center {
            flex: 1;
            text-align: center;
            padding: 0 10px;
          }
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
          .center-label {
            font-weight: 900;
            color: #0f172a;
          }
          .center-val {
            font-weight: 700;
            color: #0f172a;
          }
          .header-meta {
            width: 185px;
            text-align: right;
          }
          .meta-box {
            background: #f8fafc;
            border: 1.5px solid #0f172a;
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 8.5pt;
            line-height: 1.35;
            text-align: left;
          }
          .meta-lbl {
            font-weight: 800;
            color: #0f172a;
            display: inline-block;
            min-width: 62px;
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
            margin: 0 0 8px;
          }
          .exam-table th,
          .exam-table td {
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
          .exam-table th.col-name {
            text-align: start;
            padding-inline-start: 8px;
          }
          .exam-table tr:nth-child(even) td {
            background-color: #fafafa;
          }
          .col-no { width: 3.5%; text-align: center !important; font-weight: bold; font-size: 9pt; }
          .col-name { width: 23.5%; font-weight: 700; font-size: 9.5pt; padding-inline-start: 8px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .col-type { width: 8.5%; text-align: center !important; font-size: 8pt; }
          .col-mobile { width: 10.5%; text-align: center !important; font-size: 8.5pt; letter-spacing: 0.2px; font-family: monospace; }
          .col-ipep { width: 4.5%; text-align: center !important; font-weight: bold; font-size: 9pt; }
          .col-room { width: 6.5%; text-align: center !important; font-size: 10pt; font-weight: 900; vertical-align: middle !important; background: #fff !important; }
          .col-sig { width: 14.5%; text-align: center; }
          .col-time { width: 6.5%; text-align: center !important; font-family: monospace; font-size: 8.5pt; color: #1e293b; white-space: nowrap !important; letter-spacing: 0.5px; }

          .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 16px;
            margin: 1px 4px;
          }

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
        </style>
      </head>
      <body>
        ${sheetsHtml}
      </body>
    </html>
  `;
}

/**
 * Triggers clean A4 landscape printing via an invisible iframe without browser headers/footers.
 */
export function printEstSheetsWithIframe(
  sheets: SheetData[],
  options?: { buildingName?: string; title?: string; onComplete?: () => void },
): void {
  if (!sheets || sheets.length === 0) return;

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

  const fullHtml = generateEstPrintHtml(sheets, options);

  frameDoc.open();
  frameDoc.write(fullHtml);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      options?.onComplete?.();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 3000);
    }
  }, 500);
}

/**
 * Generates an official, pre-formatted EST Building Excel Workbook (.xlsx)
 * matching the real EST Examination workbook structure:
 * Each floor gets its own tab, plus a dedicated "Control Room" tab.
 * Column structure: No., Name, Proctor Type, Mobile, IP / EP, Room, Arrival Time, Departure Time.
 */
export function generateBuildingExcelWorkbook(data: BuildingExcelData): Uint8Array {
  const wb = XLSX.utils.book_new();

  const examDate = data.date || "09 - 10 - 2026";
  const estType = data.examName?.includes("2") ? "2" : "1";
  const centerName = data.center || "AAST Sheraton";
  const buildingName = data.buildingName || "Management & Tech.";

  const rawFloors =
    data.floors && data.floors.length > 0
      ? data.floors
      : ["Ground", "1st Floor", "3rd Floor", "4th Floor", "5th Floor"];

  // Helper to create a formatted floor / control sheet
  function createFloorSheet(floorName: string, isControl: boolean = false) {
    const titleRow = [
      "Center :",
      `${centerName} ${buildingName} ${floorName}`,
      null,
      null,
      null,
      `Date: ${examDate}`,
      null,
      `EST Type : ${estType}`,
      null,
      null,
    ];
    const emptyRow: (string | null)[] = [];
    const headerRow = [
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
    ];

    const sampleRows: (string | number | null)[][] = [];

    if (isControl) {
      sampleRows.push(
        [1, "Mohamed Nabil", "Head", "01002899038", "IP", "C001", null, ":", null, ":"],
        [2, "Salah El Din El Desouky", "Control Room Assistant", "01014614751", "IP", "", null, ":", null, ":"],
        [3, "Ragab Gafar Saeed", "Control Room Assistant", "01221266637", "IP", "", null, ":", null, ":"],
        [4, "Rana Shebl Mohamed", "Control Room Assistant", "01022963720", "IP", "", null, ":", null, ":"],
      );
    } else {
      sampleRows.push(
        [1, "Safwat Ahmed", "Senior", "201002380523", "IP", floorName, null, ":", null, ":"],
        [2, "Mohamed Hamed Taha", "Roaming ", "1018124485", "EP", "", null, ":", null, ":"],
        [3, "Abdel Rahman Afifi", "Senior", "201008467391", "IP", "", null, ":", null, ":"],
        [4, "Mahmoud Abdelaal Hassan", "Proctor", "01026354999", "EP", "01", null, ":", null, ":"],
        [5, "Shaimaa Farouk Ibrahim", "Proctor", "1030101941", "EP", "", null, ":", null, ":"],
        [6, "Reham Mohammed Shawky", "Proctor", "1001722291", "EP", "", null, ":", null, ":"],
      );
    }

    const footerRows: (string | null)[][] = [
      [],
      [null, "Head", null, null, null, null, null, null, null, null],
      [null, "Mohamed Nabil", null, null, null, null, null, null, null, null],
    ];

    const allData = [titleRow, emptyRow, headerRow, ...sampleRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Column widths tailored for A4 landscape printing and handwritten signatures
    ws["!cols"] = [
      { wch: 6 },  // 1. No.
      { wch: 32 }, // 2. Name
      { wch: 14 }, // 3. Proctor Type (compact)
      { wch: 15 }, // 4. Mobile
      { wch: 9 },  // 5. IP / EP
      { wch: 10 }, // 6. Room
      { wch: 20 }, // 7. Arrival Signature (sufficient space for handwriting)
      { wch: 10 }, // 8. Time (Arrival)
      { wch: 20 }, // 9. Departure Signature (sufficient space for handwriting)
      { wch: 10 }, // 10. Time (Departure)
    ];

    // Merges: Header title spans + Room column vertical merges
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } }, // Center Name
      { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // Date
    ];

    if (isControl) {
      // Row 3 to 6: Room C001
      merges.push({ s: { r: 3, c: 5 }, e: { r: 6, c: 5 } });
    } else {
      // Row 3 to 5: Floor supervisor room
      merges.push({ s: { r: 3, c: 5 }, e: { r: 5, c: 5 } });
      // Row 6 to 8: Room 01 for the 3 proctors
      merges.push({ s: { r: 6, c: 5 }, e: { r: 8, c: 5 } });
    }

    ws["!merges"] = merges;

    return ws;
  }

  // Add a sheet for each floor
  for (const fl of rawFloors) {
    const cleanName = fl.replace(/^Management\s+/i, "");
    const tabName = `Management ${cleanName}`;
    const ws = createFloorSheet(cleanName, false);
    XLSX.utils.book_append_sheet(wb, ws, tabName.slice(0, 31));
  }

  // Add Control Room tab
  const wsControl = createFloorSheet("Control Room", true);
  XLSX.utils.book_append_sheet(wb, wsControl, "Control Room");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(wbout);
}

/**
 * Extracts and formats tabs from an Excel workbook buffer into clean HTML and rows.
 */
export function parseWorkbookTabs(buffer: ArrayBuffer | Uint8Array | string): SheetTabInfo[] {
  const wb =
    typeof buffer === "string"
      ? XLSX.read(buffer, { type: "string" })
      : XLSX.read(new Uint8Array(buffer), { type: "array" });

  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const html = XLSX.utils.sheet_to_html(ws, { id: `tab-${name.replace(/\s+/g, "_")}` });
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });
    return { name, html, rows };
  });
}
