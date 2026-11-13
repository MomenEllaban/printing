import type { SheetData } from "@/lib/stickers/building-excel";

export type ExcelWorkbookKind = "register" | "generic";

function sheetText(sheet: SheetData): string {
  return (sheet.rows || [])
    .slice(0, 25)
    .map((row) =>
      (row || [])
        .map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" "),
    )
    .join(" \n ")
    .toLowerCase();
}

function isCertificateSheet(sheet: SheetData): boolean {
  const text = sheetText(sheet);
  if (!text.trim()) return false;

  const hasRegisterShape =
    /proctor\s*type/.test(text) ||
    /arrival\s*signature/.test(text) ||
    /ip\s*\/\s*ep/.test(text);

  if (hasRegisterShape) return false;

  const certSignals = [
    /student\s*name/,
    /candidate/,
    /national\s*id/,
    /school\s*name/,
    /request\s*id/,
    /est-rep/,
    /certificate/,
    /total\s*reports?/,
    /report\s*list/,
    /name\s*en/,
    /name\s*ar/,
    /اسم الطالب/,
    /الرقم القومي/,
  ];

  return certSignals.some((re) => re.test(text));
}

function isRegisterSheet(sheet: SheetData): boolean {
  if (isCertificateSheet(sheet)) return false;
  const text = sheetText(sheet);
  if (!text.trim()) return false;

  const hasProctorType = /proctor\s*type/.test(text);
  const hasArrival = /arrival\s*(signature|sig)?/.test(text);
  const hasIpep = /ip\s*\/\s*ep/.test(text);
  const hasRoom = /\broom\b/.test(text);
  const hasCenter = /\bcenter\s*:/.test(text);
  const hasNo = /\bno\.?\b/.test(text);

  return (
    (hasProctorType && (hasArrival || hasIpep || hasRoom)) ||
    (hasCenter && hasNo && hasProctorType)
  );
}

export function detectExcelWorkbookKind(
  sheets: SheetData[],
  fileName?: string | null,
): ExcelWorkbookKind {
  const name = String(fileName || "").toLowerCase();
  if (/building\s*register/.test(name) || /سجل\s*المبنى/.test(name) || /سجل المبنى/.test(name)) {
    return "register";
  }

  if (!sheets.length) return "generic";

  const certificateCount = sheets.filter(isCertificateSheet).length;
  const registerCount = sheets.filter(isRegisterSheet).length;

  if (certificateCount > 0 && registerCount === 0) return "generic";
  if (registerCount > 0) return "register";
  return "generic";
}

export function applyRegisterSheetNormalization(sheet: SheetData): void {
  if (!sheet.rows || sheet.rows.length === 0) {
    sheet.rows = [
      ["Center :", `AAST Sheraton ${sheet.name}`, "", "", "", "Date: 09 - 10 - 2026", "", "EST Type : 1", "", ""],
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
  }

  let headerIdx = -1;
  for (let r = 0; r < Math.min(15, sheet.rows.length); r++) {
    const cell0 = String(sheet.rows[r]?.[0] ?? "").trim();
    const cell1 = String(sheet.rows[r]?.[1] ?? "").trim();
    if (/^No\.?$/i.test(cell0) || /^Name$/i.test(cell1)) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx === -1) return;

  let activeRoom = "";
  for (let r = headerIdx + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
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
