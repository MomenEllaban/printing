import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";
import { EST_REFERENCE_DATA } from "./est-reference-data";

export interface RoomDetail {
  room: string;
  studentCount?: number;
  subjectsText?: string;
}

export interface FloorRoomsData {
  floor: string;
  rooms: (string | RoomDetail)[];
  totalStudents?: number;
}

export interface LogisticsStickerOptions {
  examName?: string;          // e.g. "EST 1" or "EST 2" (or "EST I" / "EST II")
  governorate?: string;       // e.g. "Alexandria"
  center?: string;            // e.g. "Abu Qir" or "Momen Center"
  building?: string;          // e.g. "Pharmacy" or "Momen Building"
  date?: string;              // e.g. "December 2026"
  totalRooms?: number;
  totalStudents?: number;
  roomNames?: string[];       // e.g. ["M101", "M102", "M103", ...]
  floors?: FloorRoomsData[];   // Grouped floors with their rooms & student counts
  boxNumber?: number;         // e.g. 1
  totalBoxes?: number;        // e.g. 1
  securitySeal?: string;
  notes?: string;
}

// Color Palette matching EST official branding
const COLOR_CHARCOAL = rgb(0.12, 0.12, 0.12);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_GOLD = rgb(0.85, 0.70, 0.08); // EST yellow/gold accent
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97);
const COLOR_BORDER = rgb(0.82, 0.82, 0.82);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_EMERGENCY_RED = rgb(0.78, 0.12, 0.12);
const COLOR_EMERGENCY_LIGHT = rgb(0.99, 0.94, 0.94);

// Static decoded logo bytes in memory - zero filesystem dependency
const LOGO_JPEG_BYTES: Uint8Array = new Uint8Array(Buffer.from(EST_LOGO_BASE64, "base64"));

async function loadLogoImage(pdfDoc: PDFDocument): Promise<any> {
  try {
    return await pdfDoc.embedJpg(LOGO_JPEG_BYTES);
  } catch {
    return null;
  }
}

async function loadStickerFont(pdfDoc: PDFDocument): Promise<any> {
  const fontPaths = [
    path.join(process.cwd(), "src", "assets", "fonts", "Arial-Bold.ttf"),
    path.join(process.cwd(), "public", "fonts", "Arial-Bold.ttf"),
  ];

  for (const fp of fontPaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ fp)) {
      try {
        const fontBytes = fs.readFileSync(/*turbopackIgnore: true*/ fp);
        return await pdfDoc.embedFont(fontBytes, { subset: true });
      } catch {}
    }
  }

  return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
}

export interface NormalizedFloor {
  floor: string;
  rooms: { room: string; studentCount?: number; subjectsText?: string }[];
  totalStudents: number;
}

/**
 * Normalizes floors and rooms data for building stickers.
 * Prioritizes explicit floors from Drive / options, then reference data, then room patterns.
 */
export function normalizeFloorsData(options: LogisticsStickerOptions): NormalizedFloor[] {
  // 1. If explicit floors are provided, normalize and return them
  if (options.floors && options.floors.length > 0) {
    return options.floors.map((f) => {
      const normalizedRooms = f.rooms.map((r) => {
        if (typeof r === "string") return { room: r };
        return r;
      });
      const sumStudents =
        f.totalStudents ??
        normalizedRooms.reduce((sum, r) => sum + (r.studentCount || 25), 0);
      return {
        floor: f.floor,
        rooms: normalizedRooms,
        totalStudents: sumStudents,
      };
    });
  }

  // 2. If building matches EST_REFERENCE_DATA, group by floor from reference rows
  if (options.building) {
    const cleanB = options.building.trim().toLowerCase();
    const refRows = EST_REFERENCE_DATA.filter((r) => {
      const b = r.building.trim().toLowerCase();
      return b === cleanB || cleanB.includes(b) || b.includes(cleanB);
    });
    if (refRows.length > 0) {
      const floorMap = new Map<string, { rooms: { room: string; studentCount: number }[]; totalStudents: number }>();
      for (const row of refRows) {
        const fl = row.floor || "General Floor";
        const entry = floorMap.get(fl) || { rooms: [], totalStudents: 0 };
        if (row.room && !entry.rooms.some((rm) => rm.room === row.room)) {
          entry.rooms.push({ room: row.room, studentCount: row.studentsEst1 || 25 });
          entry.totalStudents += (row.studentsEst1 || 25);
        }
        floorMap.set(fl, entry);
      }
      return Array.from(floorMap.entries()).map(([floor, data]) => ({
        floor,
        rooms: data.rooms,
        totalStudents: data.totalStudents,
      }));
    }
  }

  // 3. If roomNames provided, infer floors
  if (options.roomNames && options.roomNames.length > 0) {
    const floorMap = new Map<string, { rooms: { room: string }[]; totalStudents: number }>();
    for (const rName of options.roomNames) {
      const clean = rName.trim();
      let fl = "General Floor";
      const explicitFloor = clean.match(/(?:floor|دور|طابق)\s*([^\s\-_]+)/i);
      if (explicitFloor) {
        fl = `Floor ${explicitFloor[1]}`;
      } else {
        const numMatch = clean.match(/\b([1-9])\d{2,3}[A-Za-z]?\b/);
        if (numMatch) {
          const digit = numMatch[1];
          const suffix = digit === "1" ? "1st" : digit === "2" ? "2nd" : digit === "3" ? "3rd" : `${digit}th`;
          fl = `${suffix} Floor`;
        }
      }
      const entry = floorMap.get(fl) || { rooms: [], totalStudents: 0 };
      if (!entry.rooms.some((rm) => rm.room === clean)) {
        entry.rooms.push({ room: clean });
        entry.totalStudents += 25;
      }
      floorMap.set(fl, entry);
    }
    return Array.from(floorMap.entries()).map(([floor, data]) => ({
      floor,
      rooms: data.rooms,
      totalStudents: data.totalStudents,
    }));
  }

  // 4. Default fallback: 2 floors
  return [
    {
      floor: "2nd Floor",
      rooms: [{ room: "201" }, { room: "202" }, { room: "203" }],
      totalStudents: 75,
    },
    {
      floor: "3rd Floor",
      rooms: [{ room: "301" }, { room: "302" }, { room: "303" }],
      totalStudents: 75,
    },
  ];
}

/**
 * 1. Building Master Carton Sticker (A4 Landscape)
 * Affixed to the outside of the large carton box containing all room packets for that building.
 * Displays all Floors in the building, and for each floor, lists its constituent rooms with checkboxes.
 */
export async function generateBuildingCartonStickerPdf(
  options: LogisticsStickerOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  // A4 Landscape: 841.89 x 595.28 pt
  const width = 841.89;
  const height = 595.28;
  const page = pdfDoc.addPage([width, height]);

  const margin = 22;
  const cardX = margin;
  const cardY = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Normalized Floors and Rooms data
  const floors = normalizeFloorsData(options);
  const totalFloorsCount = floors.length;
  const totalRoomsCount = floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalStudentsCount = options.totalStudents || floors.reduce((sum, f) => sum + f.totalStudents, 0);

  // Outer framing card
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2.2,
  });

  // Inner Gold Accent border
  page.drawRectangle({
    x: cardX + 4,
    y: cardY + 4,
    width: cardW - 8,
    height: cardH - 8,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });

  // Header Bar
  const headerH = 60;
  const headerY = cardY + cardH - headerH - 8;
  const logoH = 42;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = cardX + 16;
  const logoY = headerY + (headerH - logoH) / 2;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 16 : cardX + 16;
  const rawExam = options.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam);
  const examLabel = isEst2 ? "EST II" : "EST I";
  const sessionText = options.date || "OFFICIAL EXAMINATION SESSION";

  page.drawText(`${examLabel} — OFFICIAL EXAMINATION LOGISTICS`, {
    x: textStartX,
    y: headerY + 34,
    size: 14.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText(`BUILDING MASTER CARTON — ${sessionText.toUpperCase()}`, {
    x: textStartX,
    y: headerY + 16,
    size: 10,
    font,
    color: COLOR_MUTED,
  });

  // Right Badge: Box # / Carton count
  const boxBadgeText = `CARTON BOX ${options.boxNumber || 1} OF ${options.totalBoxes || 1}`;
  const badgeW = 160;
  const badgeH = 32;
  const badgeX = cardX + cardW - badgeW - 16;
  const badgeY = headerY + (headerH - badgeH) / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: COLOR_CHARCOAL,
  });

  const boxW = font.widthOfTextAtSize(boxBadgeText, 9.5);
  page.drawText(boxBadgeText, {
    x: badgeX + (badgeW - boxW) / 2,
    y: badgeY + 11,
    size: 9.5,
    font,
    color: COLOR_GOLD,
  });

  // Divider Line
  page.drawLine({
    start: { x: cardX + 10, y: headerY },
    end: { x: cardX + cardW - 10, y: headerY },
    thickness: 1.5,
    color: COLOR_GOLD,
  });

  // Location Highlight Ribbon (Governorate - Center - Building)
  const locRibbonY = headerY - 50;
  const locRibbonH = 44;

  page.drawRectangle({
    x: cardX + 12,
    y: locRibbonY,
    width: cardW - 24,
    height: locRibbonH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  const locColW = (cardW - 24) / 3;

  // 1. Governorate
  page.drawText("GOVERNORATE", {
    x: cardX + 22,
    y: locRibbonY + locRibbonH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.governorate || "All Governorates", {
    x: cardX + 22,
    y: locRibbonY + 9,
    size: 13,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. Test Center
  page.drawText("TEST CENTER", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + locRibbonH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.center || "Main Center", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + 9,
    size: 13,
    font,
    color: COLOR_CHARCOAL,
  });

  // 3. Building
  page.drawText("BUILDING", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + locRibbonH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.building || "Building HQ", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + 9,
    size: 14.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body Layout
  const bodyTop = locRibbonY - 10;
  const bodyBottom = cardY + 12;
  const bodyH = bodyTop - bodyBottom;
  const leftW = 205;
  const rightW = cardW - 24 - leftW - 10;
  const leftX = cardX + 12;
  const rightX = leftX + leftW + 10;

  // ----------------------------------------------------
  // LEFT COLUMN: Overview & Key Statistics
  // ----------------------------------------------------
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Title for Left
  page.drawRectangle({
    x: leftX + 1,
    y: bodyBottom + bodyH - 24,
    width: leftW - 2,
    height: 23,
    color: COLOR_CHARCOAL,
  });
  page.drawText("CARTON SPECIFICATIONS", {
    x: leftX + 12,
    y: bodyBottom + bodyH - 16,
    size: 8,
    font,
    color: COLOR_GOLD,
  });

  // Stat Card 1: Total Floors
  const statBoxH = 54;
  const stat1Y = bodyBottom + bodyH - 24 - statBoxH - 8;
  page.drawRectangle({
    x: leftX + 8,
    y: stat1Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("TOTAL BUILDING FLOORS:", {
    x: leftX + 14,
    y: stat1Y + statBoxH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`${totalFloorsCount} FLOORS`, {
    x: leftX + 14,
    y: stat1Y + 13,
    size: 18,
    font,
    color: COLOR_CHARCOAL,
  });

  // Stat Card 2: Total Rooms
  const stat2Y = stat1Y - statBoxH - 6;
  page.drawRectangle({
    x: leftX + 8,
    y: stat2Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("TOTAL ENCLOSED ROOMS:", {
    x: leftX + 14,
    y: stat2Y + statBoxH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`${totalRoomsCount} ROOMS`, {
    x: leftX + 14,
    y: stat2Y + 13,
    size: 18,
    font,
    color: COLOR_CHARCOAL,
  });

  // Stat Card 3: Total Candidates
  const stat3Y = stat2Y - statBoxH - 6;
  page.drawRectangle({
    x: leftX + 8,
    y: stat3Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("ASSIGNED CANDIDATES:", {
    x: leftX + 14,
    y: stat3Y + statBoxH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`${totalStudentsCount} CANDIDATES`, {
    x: leftX + 14,
    y: stat3Y + 13,
    size: 17,
    font,
    color: COLOR_CHARCOAL,
  });

  // Packing Checklist Card
  const checkCardY = bodyBottom + 8;
  const checkCardH = stat3Y - checkCardY - 8;
  page.drawRectangle({
    x: leftX + 8,
    y: checkCardY,
    width: leftW - 16,
    height: checkCardH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  page.drawText("CARTON PACKING CHECKLIST", {
    x: leftX + 14,
    y: checkCardY + checkCardH - 16,
    size: 7.5,
    font,
    color: COLOR_CHARCOAL,
  });

  const checkItems = [
    "Floor dossiers verified",
    "Room packets counted",
    "Exam questions sealed",
    "Emergency packet enclosed",
  ];

  const itemGap = Math.min(22, (checkCardH - 26) / checkItems.length);
  for (let ci = 0; ci < checkItems.length; ci++) {
    const cy = checkCardY + checkCardH - 26 - (ci + 1) * itemGap;
    // Checkbox square
    page.drawRectangle({
      x: leftX + 14,
      y: cy + 1,
      width: 10,
      height: 10,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 0.8,
    });
    page.drawText(checkItems[ci], {
      x: leftX + 30,
      y: cy + 2.5,
      size: 7.5,
      font,
      color: COLOR_MUTED,
    });
  }

  // ----------------------------------------------------
  // RIGHT COLUMN: Floors & Rooms Directory
  // ----------------------------------------------------
  page.drawRectangle({
    x: rightX,
    y: bodyBottom,
    width: rightW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Top header for Right
  page.drawRectangle({
    x: rightX + 1,
    y: bodyBottom + bodyH - 24,
    width: rightW - 2,
    height: 23,
    color: COLOR_CHARCOAL,
  });
  page.drawText("BUILDING FLOORS & ENCLOSED ROOMS DIRECTORY", {
    x: rightX + 14,
    y: bodyBottom + bodyH - 16,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  const dirSubtitle = "[ CHECK OFF [✓] EACH ROOM PACKET UPON PACKING ]";
  const dirSubW = font.widthOfTextAtSize(dirSubtitle, 7);
  page.drawText(dirSubtitle, {
    x: rightX + rightW - dirSubW - 14,
    y: bodyBottom + bodyH - 16,
    size: 7,
    font,
    color: COLOR_GOLD,
  });

  // Layout floors dynamically
  const contentTop = bodyBottom + bodyH - 24 - 8;
  const contentBottom = bodyBottom + 8;
  const contentH = contentTop - contentBottom;
  const contentW = rightW - 16;

  const numFloors = floors.length;
  const floorCols = numFloors <= 3 ? 1 : 2;
  const floorRows = Math.ceil(numFloors / floorCols);
  const gapX = 8;
  const gapY = 8;
  const fCardW = (contentW - (floorCols - 1) * gapX) / floorCols;
  const fCardH = (contentH - (floorRows - 1) * gapY) / floorRows;

  for (let fi = 0; fi < numFloors; fi++) {
    const fl = floors[fi];
    const col = fi % floorCols;
    const row = Math.floor(fi / floorCols);
    const fx = rightX + 8 + col * (fCardW + gapX);
    const fy = contentTop - (row + 1) * fCardH - row * gapY;

    // Floor Card Outer Box
    page.drawRectangle({
      x: fx,
      y: fy,
      width: fCardW,
      height: fCardH,
      color: COLOR_WHITE,
      borderColor: COLOR_BORDER,
      borderWidth: 1,
    });

    // Floor Header Ribbon
    const fHeaderH = 20;
    const fHeaderY = fy + fCardH - fHeaderH;
    page.drawRectangle({
      x: fx + 0.5,
      y: fHeaderY,
      width: fCardW - 1,
      height: fHeaderH,
      color: COLOR_LIGHT_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 0.5,
    });

    // Floor Title (left)
    const floorLabel = fl.floor.toUpperCase();
    page.drawText(floorLabel, {
      x: fx + 8,
      y: fHeaderY + 6,
      size: 8.5,
      font,
      color: COLOR_CHARCOAL,
    });

    // Floor Badge (right): "3 Rooms • 80 Candidates"
    const badgeText = `${fl.rooms.length} Rooms  •  ${fl.totalStudents} Candidates`;
    const badgeW = font.widthOfTextAtSize(badgeText, 7.5);
    page.drawText(badgeText, {
      x: fx + fCardW - badgeW - 8,
      y: fHeaderY + 6,
      size: 7.5,
      font,
      color: COLOR_MUTED,
    });

    // Rooms Grid inside Floor Card
    const rAreaTop = fHeaderY - 4;
    const rAreaBottom = fy + 4;
    const rAreaH = rAreaTop - rAreaBottom;
    const rAreaW = fCardW - 12;

    const rCount = fl.rooms.length;
    const rCols = floorCols === 1
      ? (rCount > 6 ? 4 : rCount > 3 ? 3 : rCount)
      : (rCount > 6 ? 3 : rCount > 2 ? 2 : rCount);
    const rRows = Math.max(1, Math.ceil(rCount / Math.max(1, rCols)));
    const rGapX = 5;
    const rGapY = 4;
    const rCellW = (rAreaW - (rCols - 1) * rGapX) / rCols;
    const rCellH = Math.min(26, (rAreaH - (rRows - 1) * rGapY) / rRows);

    for (let ri = 0; ri < rCount; ri++) {
      const rm = fl.rooms[ri];
      const rCol = ri % rCols;
      const rRow = Math.floor(ri / rCols);
      const rcx = fx + 6 + rCol * (rCellW + rGapX);
      const rcy = rAreaTop - (rRow + 1) * rCellH - rRow * rGapY;

      // Room Chip Background
      page.drawRectangle({
        x: rcx,
        y: rcy,
        width: rCellW,
        height: rCellH,
        color: COLOR_LIGHT_BG,
        borderColor: COLOR_BORDER,
        borderWidth: 0.6,
      });

      // Checkbox square (10x10)
      page.drawRectangle({
        x: rcx + 5,
        y: rcy + (rCellH - 10) / 2,
        width: 10,
        height: 10,
        color: COLOR_WHITE,
        borderColor: COLOR_CHARCOAL,
        borderWidth: 0.8,
      });

      // Room Name & Student Count Label
      let label = rm.room;
      if (rm.studentCount) {
        label += ` (${rm.studentCount})`;
      }
      let fSize = 8;
      let textW = font.widthOfTextAtSize(label, fSize);
      if (textW > rCellW - 20) {
        fSize = Math.max(6.5, ((rCellW - 20) / textW) * fSize);
        textW = font.widthOfTextAtSize(label, fSize);
      }

      page.drawText(label, {
        x: rcx + 18,
        y: rcy + (rCellH - fSize) / 2 + 1,
        size: fSize,
        font,
        color: COLOR_CHARCOAL,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * 2. Exam Transit Bag Sticker (A4 Portrait)
 * Contains the subject checklists with checkboxes [ ] for EST I or EST II.
 */
export async function generateExamBagChecklistPdf(
  options: LogisticsStickerOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  // A4 Portrait: 595.28 x 841.89 pt
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const margin = 20;
  const cardX = margin;
  const cardY = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Outer framing card
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  // Inner Gold Accent border
  page.drawRectangle({
    x: cardX + 3.5,
    y: cardY + 3.5,
    width: cardW - 7,
    height: cardH - 7,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  // Header Bar
  const headerH = 60;
  const headerY = cardY + cardH - headerH - 8;
  const logoH = 42;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = cardX + 14;
  const logoY = headerY + (headerH - logoH) / 2;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 12 : cardX + 14;
  const rawExam = options.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam);
  const examLabel = isEst2 ? "EST II" : "EST I";

  page.drawText(`${examLabel} — EXAM TRANSIT BAG & MANIFEST`, {
    x: textStartX,
    y: headerY + 34,
    size: 13,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EXAM TRANSIT BAG MANIFEST & SECURITY VERIFICATION CHECKLIST", {
    x: textStartX,
    y: headerY + 16,
    size: 9.5,
    font,
    color: COLOR_MUTED,
  });

  // Divider Line
  page.drawLine({
    start: { x: cardX + 10, y: headerY },
    end: { x: cardX + cardW - 10, y: headerY },
    thickness: 1.2,
    color: COLOR_GOLD,
  });

  // Location Highlight Banner
  const locY = headerY - 50;
  const locH = 44;
  page.drawRectangle({
    x: cardX + 10,
    y: locY,
    width: cardW - 20,
    height: locH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  page.drawText(`GOVERNORATE: ${options.governorate || "All Governorates"}    •    CENTER: ${options.center || "Main Center"}`, {
    x: cardX + 18,
    y: locY + 24,
    size: 9,
    font,
    color: COLOR_MUTED,
  });

  page.drawText(`BUILDING: ${options.building || "Building HQ"}`, {
    x: cardX + 18,
    y: locY + 8,
    size: 12,
    font,
    color: COLOR_CHARCOAL,
  });

  // Instructions Box
  const instrY = locY - 34;
  const instrH = 26;
  page.drawRectangle({
    x: cardX + 10,
    y: instrY,
    width: cardW - 20,
    height: instrH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });
  page.drawText("INSTRUCTIONS: Check each subject packet [x] before sealing the transit bag.", {
    x: cardX + 18,
    y: instrY + 8,
    size: 8,
    font,
    color: COLOR_CHARCOAL,
  });

  // Subjects Checklist Table
  const tableTop = instrY - 14;
  const tableBottom = cardY + 28;
  const tableH = tableTop - tableBottom;
  const tableY = tableBottom;

  page.drawRectangle({
    x: cardX + 10,
    y: tableY,
    width: cardW - 20,
    height: tableH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Table Header Row
  const thH = 30;
  const thY = tableY + tableH - thH;
  page.drawRectangle({
    x: cardX + 11,
    y: thY,
    width: cardW - 22,
    height: thH - 1,
    color: COLOR_CHARCOAL,
  });

  page.drawText("PACKED", { x: cardX + 22, y: thY + 11, size: 9, font, color: COLOR_GOLD });
  page.drawText("EXAMINATION SUBJECT", { x: cardX + 90, y: thY + 11, size: 9, font, color: COLOR_GOLD });
  page.drawText("ENVELOPES COUNT", { x: cardX + 330, y: thY + 11, size: 9, font, color: COLOR_GOLD });
  page.drawText("STATUS", { x: cardX + 460, y: thY + 11, size: 9, font, color: COLOR_GOLD });

  const subjects = isEst2
    ? [
        { code: "MATH1", title: "EST II – Math 1 (Mathematics Level 1)" },
        { code: "MATH2", title: "EST II – Math 2 (Mathematics Level 2)" },
        { code: "BIO", title: "EST II – Biology (E & M)" },
        { code: "CHEM", title: "EST II – Chemistry" },
        { code: "PHY", title: "EST II – Physics" },
      ]
    : [
        { code: "LIT", title: "EST I – Literacy (Reading & Writing)" },
        { code: "MATH", title: "EST I – Mathematics" },
        { code: "ESSAY", title: "EST I – Essay (Optional Component)" },
      ];

  const rowH = (tableH - thH) / subjects.length;

  for (let i = 0; i < subjects.length; i++) {
    const sub = subjects[i];
    const ry = thY - (i + 1) * rowH;

    // Alternating zebra
    if (i % 2 === 1) {
      page.drawRectangle({
        x: cardX + 11,
        y: ry,
        width: cardW - 22,
        height: rowH,
        color: COLOR_LIGHT_BG,
      });
    }

    // Row divider
    if (i > 0) {
      page.drawLine({
        start: { x: cardX + 11, y: ry + rowH },
        end: { x: cardX + cardW - 11, y: ry + rowH },
        thickness: 0.8,
        color: COLOR_BORDER,
      });
    }

    // Checkbox Square (Large and clear for pen check)
    const cbSize = 18;
    page.drawRectangle({
      x: cardX + 26,
      y: ry + (rowH - cbSize) / 2,
      width: cbSize,
      height: cbSize,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1.4,
    });

    // Subject title
    page.drawText(sub.title, {
      x: cardX + 90,
      y: ry + (rowH - 12) / 2 + 1,
      size: 12,
      font,
      color: COLOR_CHARCOAL,
    });

    // Envelopes fill-in box
    page.drawText("[ ________ ] Envelopes", {
      x: cardX + 330,
      y: ry + (rowH - 11) / 2 + 1,
      size: 11,
      font,
      color: COLOR_CHARCOAL,
    });

    // Verified checkbox
    page.drawRectangle({
      x: cardX + 460,
      y: ry + (rowH - 14) / 2,
      width: 14,
      height: 14,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1,
    });
    page.drawText("Verified", {
      x: cardX + 482,
      y: ry + (rowH - 9) / 2 + 1,
      size: 9,
      font,
      color: COLOR_MUTED,
    });
  }

  // Footer Note
  const footerNote = "CONFIDENTIAL & STRICTLY CONTROLLED — TRANSIT BAG MANIFEST";
  const noteW = font.widthOfTextAtSize(footerNote, 7.5);
  page.drawText(footerNote, {
    x: cardX + (cardW - noteW) / 2,
    y: cardY + 10,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });

  return await pdfDoc.save();
}

/**
 * 3a. Master Clean Skin Outer Bag Sticker (A4 Portrait)
 * Attached to the emergency reserve packet bag, with dispatch tracking log.
 */
export async function generateCleanSkinMasterPdf(
  options: LogisticsStickerOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  // A4 Portrait: 595.28 x 841.89 pt (Strictly single-page with safe print margins)
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  // Safe 24pt margins to ensure 100% single-page output across all printers
  const margin = 24;
  const cardX = margin;
  const cardY = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Outer framing card with Emergency Border
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: COLOR_WHITE,
    borderColor: COLOR_EMERGENCY_RED,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: cardX + 3,
    y: cardY + 3,
    width: cardW - 6,
    height: cardH - 6,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  // Emergency Header Banner
  const headerH = 68;
  const headerY = cardY + cardH - headerH - 8;
  const innerCardW = cardW - 12;
  const innerCardX = cardX + 6;

  page.drawRectangle({
    x: innerCardX,
    y: headerY,
    width: innerCardW,
    height: headerH,
    color: COLOR_EMERGENCY_LIGHT,
    borderColor: COLOR_EMERGENCY_RED,
    borderWidth: 0.6,
  });

  const logoH = 42;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = innerCardX + 12;
  const logoY = headerY + (headerH - logoH) / 2;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 12 : innerCardX + 14;
  const rawExam = options.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam);
  const examLabel = isEst2 ? "EST II" : "EST I";

  page.drawText(`${examLabel} — OFFICIAL EMERGENCY RESERVE (CLEAN SKIN)`, {
    x: textStartX,
    y: headerY + 44,
    size: 11.5,
    font,
    color: COLOR_EMERGENCY_RED,
  });

  page.drawText("EMERGENCY & RESERVE EXAM PAPERS PACKET — CONTROL MASTER CUSTODY", {
    x: textStartX,
    y: headerY + 27,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("STRICTLY CONFIDENTIAL — FOR EMERGENCY REPLACEMENTS ONLY", {
    x: textStartX,
    y: headerY + 12,
    size: 7,
    font,
    color: COLOR_MUTED,
  });

  // Warning Banner
  const warnH = 22;
  const warnY = headerY - warnH - 6;
  page.drawRectangle({
    x: innerCardX,
    y: warnY,
    width: innerCardW,
    height: warnH,
    color: COLOR_CHARCOAL,
  });

  const warnText = "ATTENTION: DO NOT OPEN EXCEPT UPON CHIEF PROCTOR APPROVAL FOR ACTIVE INCIDENTS";
  const warnW = font.widthOfTextAtSize(warnText, 7.5);
  page.drawText(warnText, {
    x: innerCardX + (innerCardW - warnW) / 2,
    y: warnY + 7,
    size: 7.5,
    font,
    color: COLOR_GOLD,
  });

  // Location details
  const locH = 34;
  const locY = warnY - locH - 6;
  page.drawRectangle({
    x: innerCardX,
    y: locY,
    width: innerCardW,
    height: locH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.75,
  });

  page.drawText(`GOVERNORATE: ${options.governorate || "Alexandria"}    •    CENTER: ${options.center || "Main Center"}`, {
    x: innerCardX + 12,
    y: locY + 19,
    size: 8,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`BUILDING: ${options.building || "Building HQ"}    •    SESSION: ${options.date || "December 2026"}`, {
    x: innerCardX + 12,
    y: locY + 7,
    size: 9,
    font,
    color: COLOR_CHARCOAL,
  });

  // Emergency Dispatch Log Table (Structured Grid with Vertical & Horizontal Borders)
  const footerH = 16;
  const tableTop = locY - 8;
  const tableBottom = cardY + 8 + footerH;
  const tableH = tableTop - tableBottom;
  const tableX = innerCardX;
  const tableW = innerCardW;
  const tableY = tableBottom;

  // Outer Table Box
  page.drawRectangle({
    x: tableX,
    y: tableY,
    width: tableW,
    height: tableH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Table Title Bar
  const thH = 22;
  const thY = tableTop - thH;
  page.drawRectangle({
    x: tableX,
    y: thY,
    width: tableW,
    height: thH,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EMERGENCY DISPATCH LOG SHEET", {
    x: tableX + 12,
    y: thY + 7,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  const subTitle = "[ MANUAL INCIDENT DISPATCH RECORD ]";
  const subTitleW = font.widthOfTextAtSize(subTitle, 7);
  page.drawText(subTitle, {
    x: tableX + tableW - subTitleW - 12,
    y: thY + 7.5,
    size: 7,
    font,
    color: COLOR_GOLD,
  });

  // Table Column Definitions (Sum matches tableW exactly)
  const colHeaderH = 22;
  const colHeaderY = thY - colHeaderH;

  const w0 = 28;  // #
  const w1 = 52;  // TIME
  const w2 = 60;  // ROOM
  const w3 = 135; // SUBJECT
  const w4 = 52;  // COPIES
  const w5 = tableW - (w0 + w1 + w2 + w3 + w4); // REASON / NOTES (~208.28pt)

  const colWidths = [w0, w1, w2, w3, w4, w5];
  const colX = [
    tableX,
    tableX + w0,
    tableX + w0 + w1,
    tableX + w0 + w1 + w2,
    tableX + w0 + w1 + w2 + w3,
    tableX + w0 + w1 + w2 + w3 + w4,
    tableX + tableW,
  ];

  // Column Header Background
  page.drawRectangle({
    x: tableX,
    y: colHeaderY,
    width: tableW,
    height: colHeaderH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 0.8,
  });

  // Column Headers Text (Properly centered & padded)
  const drawCenteredHeader = (text: string, startX: number, colW: number) => {
    const textW = font.widthOfTextAtSize(text, 7.5);
    page.drawText(text, {
      x: startX + (colW - textW) / 2,
      y: colHeaderY + 7,
      size: 7.5,
      font,
      color: COLOR_CHARCOAL,
    });
  };

  drawCenteredHeader("#", colX[0], w0);
  drawCenteredHeader("TIME", colX[1], w1);
  drawCenteredHeader("ROOM", colX[2], w2);
  page.drawText("SUBJECT", { x: colX[3] + 10, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  drawCenteredHeader("COPIES", colX[4], w4);
  page.drawText("REASON / NOTES (DEFECT / EXTRA)", { x: colX[5] + 10, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });

  // 18 Spacious Rows with Zebra Striping and Full Grid Lines
  const numRows = 18;
  const availableRowsH = colHeaderY - tableBottom;
  const rowH = availableRowsH / numRows;

  for (let r = 0; r < numRows; r++) {
    const ry = colHeaderY - (r + 1) * rowH;

    // Zebra striping on even rows
    if (r % 2 === 1) {
      page.drawRectangle({
        x: tableX + 0.5,
        y: ry + 0.5,
        width: tableW - 1,
        height: rowH - 0.5,
        color: COLOR_LIGHT_BG,
      });
    }

    // Row horizontal line
    page.drawLine({
      start: { x: tableX, y: ry },
      end: { x: tableX + tableW, y: ry },
      thickness: 0.5,
      color: COLOR_BORDER,
    });

    // Row Number (centered in # column)
    const rowNumStr = String(r + 1);
    const numW = font.widthOfTextAtSize(rowNumStr, 7.5);
    page.drawText(rowNumStr, {
      x: colX[0] + (w0 - numW) / 2,
      y: ry + (rowH - 7.5) / 2 + 1,
      size: 7.5,
      font,
      color: COLOR_MUTED,
    });
  }

  // Draw Vertical Column Lines from Table Header through All Rows
  for (let i = 1; i < colX.length - 1; i++) {
    page.drawLine({
      start: { x: colX[i], y: thY },
      end: { x: colX[i], y: tableBottom },
      thickness: 0.6,
      color: COLOR_BORDER,
    });
  }

  // Bottom Footer Bar (Page 1 of 1 Indicator)
  const footerY = cardY + 7;
  page.drawText("EST OFFICIAL LOGISTICS • EMERGENCY RESERVE MASTER LOG • CONTROL ROOM CUSTODY ONLY", {
    x: cardX + 12,
    y: footerY,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  const pageInfo = "PAGE 1 OF 1";
  const pageInfoW = font.widthOfTextAtSize(pageInfo, 6.5);
  page.drawText(pageInfo, {
    x: cardX + cardW - pageInfoW - 12,
    y: footerY,
    size: 6.5,
    font,
    color: COLOR_CHARCOAL,
  });

  return await pdfDoc.save();
}

/**
 * 3b. Subject Clean Skin Stickers (Quarter A4, 4-up on A4 Landscape)
 * Blank quantity field left for manual pen entry after packing.
 */
export async function generateCleanSkinSubjectStickersPdf(
  options: LogisticsStickerOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  const rawExam = options.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam);
  const examPrefix = isEst2 ? "EST II" : "EST I";

  const subjects = isEst2
    ? [
        { code: "MATH1", title: `${examPrefix} – Math 1` },
        { code: "MATH2", title: `${examPrefix} – Math 2` },
        { code: "BIO", title: `${examPrefix} – Biology` },
        { code: "CHEM", title: `${examPrefix} – Chemistry` },
        { code: "PHY", title: `${examPrefix} – Physics` },
      ]
    : [
        { code: "LIT", title: `${examPrefix} – Literacy` },
        { code: "MATH", title: `${examPrefix} – Math` },
        { code: "ESSAY", title: `${examPrefix} – Essay` },
      ];

  // A4 Landscape: 841.89 x 595.28 pt
  const a4Width = 841.89;
  const a4Height = 595.28;
  const midX = a4Width / 2;
  const midY = a4Height / 2;

  const quadrants = [
    { x: 0, y: midY, width: midX, height: midY },    // Top-Left
    { x: midX, y: midY, width: midX, height: midY }, // Top-Right
    { x: 0, y: 0, width: midX, height: midY },       // Bottom-Left
    { x: midX, y: 0, width: midX, height: midY },    // Bottom-Right
  ];

  // Draw 2 copies per subject (or chunk 4 per page)
  const items: Array<{ subject: string; code: string; copyIndex: number }> = [];
  for (const s of subjects) {
    items.push({ subject: s.title, code: s.code, copyIndex: 1 });
    items.push({ subject: s.title, code: s.code, copyIndex: 2 });
  }

  for (let i = 0; i < items.length; i += 4) {
    const pageItems = items.slice(i, i + 4);
    const page = pdfDoc.addPage([a4Width, a4Height]);

    // Cutting guide lines
    page.drawLine({
      start: { x: midX, y: 0 },
      end: { x: midX, y: a4Height },
      thickness: 0.5,
      color: COLOR_BORDER,
      dashArray: [4, 4],
    });
    page.drawLine({
      start: { x: 0, y: midY },
      end: { x: a4Width, y: midY },
      thickness: 0.5,
      color: COLOR_BORDER,
      dashArray: [4, 4],
    });

    for (let qIdx = 0; qIdx < pageItems.length; qIdx++) {
      const q = quadrants[qIdx];
      const item = pageItems[qIdx];
      drawQuarterCleanSkinSticker({
        page,
        font,
        logoImg,
        options,
        item,
        slotX: q.x,
        slotY: q.y,
        slotWidth: q.width,
        slotHeight: q.height,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Draws a single Quarter A4 Clean Skin sticker.
 */
function drawQuarterCleanSkinSticker(params: {
  page: any;
  font: any;
  logoImg: any;
  options: LogisticsStickerOptions;
  item: { subject: string; code: string; copyIndex: number };
  slotX: number;
  slotY: number;
  slotWidth: number;
  slotHeight: number;
}) {
  const { page, font, logoImg, options, item, slotX, slotY, slotWidth, slotHeight } = params;

  const margin = 8;
  const x = slotX + margin;
  const y = slotY + margin;
  const width = slotWidth - margin * 2;
  const height = slotHeight - margin * 2;

  // Outer framing card with Emergency Red
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_EMERGENCY_RED,
    borderWidth: 1.6,
  });

  // Inner gold border
  page.drawRectangle({
    x: x + 2.5,
    y: y + 2.5,
    width: width - 5,
    height: height - 5,
    borderColor: COLOR_GOLD,
    borderWidth: 0.75,
  });

  // Header: Logo & Clean Skin tag
  const logoH = 22;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = x + 10;
  const logoY = y + height - 8 - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 8 : x + 10;
  page.drawText("EMERGENCY RESERVE / CLEAN SKIN", {
    x: textStartX,
    y: logoY + 11,
    size: 8.5,
    font,
    color: COLOR_EMERGENCY_RED,
  });

  page.drawText("EMERGENCY & RESERVE EXAM PAPERS — FOR REPLACEMENT IN ROOMS", {
    x: textStartX,
    y: logoY + 2,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  // Copy badge
  const copyText = `PACKET ${item.copyIndex}`;
  const copySize = 6.8;
  const copyW = font.widthOfTextAtSize(copyText, copySize);
  const copyBadgeW = copyW + 10;
  const copyBadgeH = 14;
  const copyBadgeX = x + width - copyBadgeW - 8;
  const copyBadgeY = logoY + (logoH - copyBadgeH) / 2;

  page.drawRectangle({
    x: copyBadgeX,
    y: copyBadgeY,
    width: copyBadgeW,
    height: copyBadgeH,
    color: COLOR_EMERGENCY_LIGHT,
    borderColor: COLOR_EMERGENCY_RED,
    borderWidth: 0.5,
  });

  page.drawText(copyText, {
    x: copyBadgeX + 5,
    y: copyBadgeY + 3.5,
    size: copySize,
    font,
    color: COLOR_EMERGENCY_RED,
  });

  const headerBottom = logoY - 4;

  // Gold divider
  page.drawLine({
    start: { x: x + 6, y: headerBottom },
    end: { x: x + width - 6, y: headerBottom },
    thickness: 1,
    color: COLOR_GOLD,
  });

  // Location ribbon
  const ribbonH = 14;
  const ribbonY = headerBottom - 3 - ribbonH;
  page.drawRectangle({
    x: x + 6,
    y: ribbonY,
    width: width - 12,
    height: ribbonH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const locItems = [
    options.governorate,
    options.center,
    options.building,
  ].filter(Boolean);
  const locText = locItems.join("  •  ");
  let locSize = 7.2;
  let locWidth = font.widthOfTextAtSize(locText, locSize);
  if (locWidth > width - 24) {
    locSize = Math.max(6, ((width - 24) / locWidth) * locSize);
    locWidth = font.widthOfTextAtSize(locText, locSize);
  }
  page.drawText(locText, {
    x: x + (width - locWidth) / 2,
    y: ribbonY + (ribbonH - locSize) / 2 + 1,
    size: locSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body Layout
  const bodyTop = ribbonY - 5;
  const bodyBottom = y + 6;
  const bodyH = bodyTop - bodyBottom;
  const bodyW = width - 12;

  const leftW = Math.round(bodyW * 0.36);
  const gap = 6;
  const rightW = bodyW - leftW - gap;
  const leftX = x + 6;
  const rightX = leftX + leftW + gap;

  const bannerH = 19;
  const bannerY = bodyBottom + bodyH - bannerH;

  // 1. LEFT HERO: CONTROL POOL / RESERVE
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  page.drawRectangle({
    x: leftX + 1,
    y: bannerY,
    width: leftW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const badgeText = "CONTROL POOL";
  const badgeSize = 7.5;
  const badgeW = font.widthOfTextAtSize(badgeText, badgeSize);
  page.drawText(badgeText, {
    x: leftX + (leftW - badgeW) / 2,
    y: bannerY + (bannerH - badgeSize) / 2,
    size: badgeSize,
    font,
    color: COLOR_GOLD,
  });

  const subH = 17;
  const subY = bodyBottom + 2;
  page.drawRectangle({
    x: leftX + 2,
    y: subY,
    width: leftW - 4,
    height: subH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const subText = "RESERVE COPIES";
  const subSize = 6.2;
  const subW = font.widthOfTextAtSize(subText, subSize);
  page.drawText(subText, {
    x: leftX + (leftW - subW) / 2,
    y: subY + (subH - subSize) / 2 + 1,
    size: subSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Hero Text
  const heroValue = "SPARE";
  const heroSize = 24;
  const heroW = font.widthOfTextAtSize(heroValue, heroSize);
  page.drawText(heroValue, {
    x: leftX + (leftW - heroW) / 2,
    y: subY + subH + (bannerY - (subY + subH) - heroSize) / 2 + 2,
    size: heroSize,
    font,
    color: COLOR_EMERGENCY_RED,
  });

  // 2. RIGHT DETAILS: SUBJECT & MANUAL QUANTITY
  page.drawRectangle({
    x: rightX,
    y: bodyBottom,
    width: rightW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  page.drawRectangle({
    x: rightX + 1,
    y: bannerY,
    width: rightW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const bannerTitle = "EMERGENCY EXAM SUBJECT";
  const bannerTitleSize = 7.5;
  const bannerTitleW = font.widthOfTextAtSize(bannerTitle, bannerTitleSize);
  page.drawText(bannerTitle, {
    x: rightX + (rightW - bannerTitleW) / 2,
    y: bannerY + (bannerH - bannerTitleSize) / 2,
    size: bannerTitleSize,
    font,
    color: COLOR_GOLD,
  });

  // Subject Box
  const subjectBoxH = 32;
  const subjectBoxY = bannerY - subjectBoxH - 5;
  page.drawRectangle({
    x: rightX + 6,
    y: subjectBoxY,
    width: rightW - 12,
    height: subjectBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1,
  });

  const subjText = item.subject.toUpperCase();
  let subjSize = 12.5;
  let subjW = font.widthOfTextAtSize(subjText, subjSize);
  if (subjW > rightW - 20) {
    subjSize = Math.max(9, ((rightW - 20) / subjW) * subjSize);
    subjW = font.widthOfTextAtSize(subjText, subjSize);
  }
  page.drawText(subjText, {
    x: rightX + 6 + (rightW - 12 - subjW) / 2,
    y: subjectBoxY + (subjectBoxH - subjSize) / 2 + 1,
    size: subjSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Quantity Box (Spacious & centered for manual pen writing)
  const countBoxY = bodyBottom + 8;
  const countBoxH = subjectBoxY - countBoxY - 8;

  page.drawRectangle({
    x: rightX + 6,
    y: countBoxY,
    width: rightW - 12,
    height: countBoxH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1.4,
  });

  page.drawText("PACKET QUANTITY (WRITE BY HAND):", {
    x: rightX + 14,
    y: countBoxY + countBoxH - 16,
    size: 7,
    font,
    color: COLOR_MUTED,
  });

  // Underlined area for writing count
  const manualCountText = "COUNT: [  ____________  ]  COPIES";
  const manualW = font.widthOfTextAtSize(manualCountText, 13);
  page.drawText(manualCountText, {
    x: rightX + 6 + (rightW - 12 - manualW) / 2,
    y: countBoxY + (countBoxH - 24) / 2 + 2,
    size: 13,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * 4. Master Logistics Bundle PDF
 * Combines all 4 components into one ready-to-print file:
 * 1. Building Carton (A4 Landscape)
 * 2. Exam Bag Checklist (A4 Portrait)
 * 3. Clean Skin Master Outer Bag (A4 Portrait)
 * 4. Clean Skin Subject Stickers (Quarter-A4 4-up)
 */
export async function generateCompleteLogisticsBundlePdf(
  options: LogisticsStickerOptions,
): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();

  const [cartonBytes, bagBytes, masterBytes, subjectBytes] = await Promise.all([
    generateBuildingCartonStickerPdf(options),
    generateExamBagChecklistPdf(options),
    generateCleanSkinMasterPdf(options),
    generateCleanSkinSubjectStickersPdf(options),
  ]);

  const docs = await Promise.all([
    PDFDocument.load(cartonBytes),
    PDFDocument.load(bagBytes),
    PDFDocument.load(masterBytes),
    PDFDocument.load(subjectBytes),
  ]);

  for (const doc of docs) {
    const pageIndices = doc.getPageIndices();
    const copiedPages = await masterDoc.copyPages(doc, pageIndices);
    for (const p of copiedPages) {
      masterDoc.addPage(p);
    }
  }

  return await masterDoc.save();
}

