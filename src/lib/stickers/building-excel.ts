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

  const rawFloors = data.floors && data.floors.length > 0 ? data.floors : ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor"];

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
      "Arrival ",
      "Time",
      "Departure ",
      "Time",
    ];

    const sampleRows: (string | number | null)[][] = [];

    if (isControl) {
      sampleRows.push(
        [1, "Mohamed Nabil", "Head of Control", "01002899038", "IP", "C001", null, ":", null, ":"],
        [2, "Salah El Din El Desouky", "Control Room Assistant", "01014614751", "IP", "Control", null, ":", null, ":"],
        [3, "Ragab Gafar Saeed", "Control Room Assistant", "01221266637", "IP", "Control", null, ":", null, ":"],
        [4, "Rana Shebl Mohamed", "Control Room Assistant", "01022963720", "IP", "Control", null, ":", null, ":"],
        [5, "Dina Ahmed", "Logistics & Exam Delivery", "01155443322", "IP", "Control", null, ":", null, ":"],
      );
    } else {
      sampleRows.push(
        [1, "Safwat Ahmed", "Senior", "01002380523", "IP", floorName, null, ":", null, ":"],
        [2, "Mohamed Hamed Taha", "Roaming", "01018124485", "EP", floorName, null, ":", null, ":"],
        [3, "Abdel Rahman Afifi", "Senior Assistant", "01008467391", "IP", floorName, null, ":", null, ":"],
        [4, "Marwa Saeed Seddeek", "Proctor", "01224651450", "EP", "Room 01", null, ":", null, ":"],
        [5, "Mohamed Gamal Fekry", "Proctor", "01224996864", "EP", "Room 02", null, ":", null, ":"],
      );
    }

    const allData = [titleRow, emptyRow, headerRow, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Column widths
    ws["!cols"] = [
      { wch: 6 },  // No.
      { wch: 32 }, // Name
      { wch: 22 }, // Proctor Type
      { wch: 16 }, // Mobile
      { wch: 10 }, // IP / EP
      { wch: 14 }, // Room
      { wch: 10 }, // Arrival
      { wch: 8 },  // Time
      { wch: 12 }, // Departure
      { wch: 8 },  // Time
    ];

    // Merges for header row: col 1 spans 3 cols (1, 2, 3), col 5 spans 2 cols (5, 6)
    ws["!merges"] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } }, // Center Name
      { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // Date
    ];

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
