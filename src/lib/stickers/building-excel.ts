import * as XLSX from "xlsx";

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
