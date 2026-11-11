import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";

export interface LogisticsStickerOptions {
  examName?: string;          // e.g. "EST 1" or "EST 2" (or "EST I" / "EST II")
  governorate?: string;       // e.g. "Alexandria"
  center?: string;            // e.g. "Abu Qir" or "Momen Center"
  building?: string;          // e.g. "Pharmacy" or "Momen Building"
  date?: string;              // e.g. "December 2026"
  totalRooms?: number;
  totalStudents?: number;
  roomNames?: string[];       // e.g. ["M101", "M102", "M103", ...]
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

/**
 * 1. Building Master Carton Sticker (A4 Landscape)
 * Affixed to the outside of the large carton box containing all room packets for that building.
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
  const headerH = 65;
  const headerY = cardY + cardH - headerH - 8;
  const logoH = 46;
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
    y: headerY + 36,
    size: 15,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText(`BUILDING MASTER CARTON / صندوق أوراق ومظاريف المبنى بالكامل — ${sessionText.toUpperCase()}`, {
    x: textStartX,
    y: headerY + 16,
    size: 10.5,
    font,
    color: COLOR_MUTED,
  });

  // Right Badge: Box # / Exam badge
  const boxBadgeText = `CARTON BOX ${options.boxNumber || 1} OF ${options.totalBoxes || 1}`;
  const badgeW = 160;
  const badgeH = 34;
  const badgeX = cardX + cardW - badgeW - 16;
  const badgeY = headerY + (headerH - badgeH) / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: COLOR_CHARCOAL,
  });

  const boxW = font.widthOfTextAtSize(boxBadgeText, 10);
  page.drawText(boxBadgeText, {
    x: badgeX + (badgeW - boxW) / 2,
    y: badgeY + 11,
    size: 10,
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
  const locRibbonY = headerY - 56;
  const locRibbonH = 50;

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
  page.drawText("GOVERNORATE / المحافظة", {
    x: cardX + 22,
    y: locRibbonY + locRibbonH - 16,
    size: 8,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.governorate || "All Governorates", {
    x: cardX + 22,
    y: locRibbonY + 10,
    size: 14,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. Test Center
  page.drawText("TEST CENTER / السنتر", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + locRibbonH - 16,
    size: 8,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.center || "Main Center", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + 10,
    size: 14,
    font,
    color: COLOR_CHARCOAL,
  });

  // 3. Building
  page.drawText("BUILDING / المبنى", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + locRibbonH - 16,
    size: 8,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.building || "Building HQ", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + 10,
    size: 16,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body Layout
  const bodyTop = locRibbonY - 12;
  const footerH = 50;
  const bodyBottom = cardY + footerH + 14;
  const bodyH = bodyTop - bodyBottom;
  const leftW = 270;
  const rightW = cardW - 24 - leftW - 12;
  const leftX = cardX + 12;
  const rightX = leftX + leftW + 12;

  // Left Column: Statistics & Security Seal
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Top header for Left
  page.drawRectangle({
    x: leftX + 1,
    y: bodyBottom + bodyH - 26,
    width: leftW - 2,
    height: 25,
    color: COLOR_CHARCOAL,
  });
  page.drawText("CARTON SPECIFICATIONS & SECURITY", {
    x: leftX + 12,
    y: bodyBottom + bodyH - 18,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  // Stat Card 1: Total Rooms
  const statBoxH = 54;
  const stat1Y = bodyBottom + bodyH - 26 - statBoxH - 10;
  page.drawRectangle({
    x: leftX + 10,
    y: stat1Y,
    width: leftW - 20,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("TOTAL ENCLOSED ROOM PACKETS:", {
    x: leftX + 18,
    y: stat1Y + statBoxH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  const roomsText = `${options.totalRooms ?? (options.roomNames ? options.roomNames.length : 0)} ROOMS`;
  page.drawText(roomsText, {
    x: leftX + 18,
    y: stat1Y + 12,
    size: 20,
    font,
    color: COLOR_CHARCOAL,
  });

  // Stat Card 2: Total Students
  const stat2Y = stat1Y - statBoxH - 8;
  page.drawRectangle({
    x: leftX + 10,
    y: stat2Y,
    width: leftW - 20,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("TOTAL ASSIGNED CANDIDATES:", {
    x: leftX + 18,
    y: stat2Y + statBoxH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  const studentsText = `${options.totalStudents ?? "VERIFIED"} CANDIDATES`;
  page.drawText(studentsText, {
    x: leftX + 18,
    y: stat2Y + 12,
    size: 19,
    font,
    color: COLOR_CHARCOAL,
  });

  // Security Seal Box
  const sealY = bodyBottom + 10;
  const sealH = stat2Y - sealY - 8;
  page.drawRectangle({
    x: leftX + 10,
    y: sealY,
    width: leftW - 20,
    height: sealH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });
  page.drawText("SECURITY SEAL NUMBER / رقم القفل الأمني:", {
    x: leftX + 16,
    y: sealY + sealH - 16,
    size: 7.5,
    font,
    color: COLOR_CHARCOAL,
  });
  page.drawText(options.securitySeal || "SEAL: [ ___________________________ ]", {
    x: leftX + 16,
    y: sealY + (sealH - 24) / 2 + 2,
    size: 11,
    font,
    color: COLOR_CHARCOAL,
  });
  page.drawText("CHECK SEAL INTEGRITY BEFORE OPENING IN CONTROL ROOM", {
    x: leftX + 16,
    y: sealY + 8,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  // Right Column: Rooms Directory & Manifest (Grid of room chips)
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
    y: bodyBottom + bodyH - 26,
    width: rightW - 2,
    height: 25,
    color: COLOR_CHARCOAL,
  });
  page.drawText("ROOMS DIRECTORY & PACKETS MANIFEST / مسرد القاعات بالكرتونة", {
    x: rightX + 14,
    y: bodyBottom + bodyH - 18,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  // Render Rooms in a balanced grid
  const rooms = options.roomNames && options.roomNames.length > 0
    ? options.roomNames
    : Array.from({ length: Math.min(options.totalRooms || 12, 30) }, (_, i) => `Room ${i + 1}`);

  const gridAreaTop = bodyBottom + bodyH - 36;
  const gridAreaBottom = bodyBottom + 10;
  const gridAreaH = gridAreaTop - gridAreaBottom;
  const cols = rooms.length > 18 ? 5 : rooms.length > 10 ? 4 : 3;
  const rows = Math.ceil(rooms.length / cols);
  const cellW = (rightW - 24 - (cols - 1) * 8) / cols;
  const cellH = Math.min(36, (gridAreaH - (rows - 1) * 6) / rows);

  for (let idx = 0; idx < rooms.length; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = rightX + 12 + col * (cellW + 8);
    const cy = gridAreaTop - (row + 1) * cellH - row * 6;

    page.drawRectangle({
      x: cx,
      y: cy,
      width: cellW,
      height: cellH,
      color: COLOR_LIGHT_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 0.8,
    });

    // Checkbox square
    page.drawRectangle({
      x: cx + 5,
      y: cy + (cellH - 11) / 2,
      width: 11,
      height: 11,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 0.8,
    });

    const roomText = rooms[idx];
    let rSize = 10;
    let rW = font.widthOfTextAtSize(roomText, rSize);
    if (rW > cellW - 24) {
      rSize = Math.max(7, ((cellW - 24) / rW) * rSize);
      rW = font.widthOfTextAtSize(roomText, rSize);
    }
    page.drawText(roomText, {
      x: cx + 20,
      y: cy + (cellH - rSize) / 2 + 1,
      size: rSize,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // Footer: Chain of Custody & Sign-offs
  const footY = cardY + 8;
  page.drawRectangle({
    x: cardX + 12,
    y: footY,
    width: cardW - 24,
    height: footerH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  const footColW = (cardW - 24) / 3;

  page.drawText("PACKED & VERIFIED BY / مسؤول التعبئة:", {
    x: cardX + 20,
    y: footY + footerH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText("Name: ____________________________", {
    x: cardX + 20,
    y: footY + 12,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("DISPATCH DATE & TIME / تاريخ وساعة الخروج:", {
    x: cardX + 12 + footColW + 10,
    y: footY + footerH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText("Date: _____ / _____ / 2026   Time: ____:____", {
    x: cardX + 12 + footColW + 10,
    y: footY + 12,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("BUILDING RECEPTION / استلام مسؤول المبنى:", {
    x: cardX + 12 + footColW * 2 + 10,
    y: footY + footerH - 15,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText("Signature: ________________________", {
    x: cardX + 12 + footColW * 2 + 10,
    y: footY + 12,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

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

  page.drawText("بيان محتويات شنطة الامتحانات وقائمة الفحص والتأكيد", {
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

  page.drawText(`BUILDING / المبنى: ${options.building || "Building HQ"}`, {
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
  const tableTop = instrY - 12;
  const tableH = isEst2 ? 290 : 210;
  const tableY = tableTop - tableH;

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
  const thH = 26;
  const thY = tableY + tableH - thH;
  page.drawRectangle({
    x: cardX + 11,
    y: thY,
    width: cardW - 22,
    height: thH - 1,
    color: COLOR_CHARCOAL,
  });

  page.drawText("PACKED", { x: cardX + 20, y: thY + 9, size: 8, font, color: COLOR_GOLD });
  page.drawText("EXAMINATION SUBJECT / المادة", { x: cardX + 80, y: thY + 9, size: 8, font, color: COLOR_GOLD });
  page.drawText("ENVELOPES COUNT", { x: cardX + 310, y: thY + 9, size: 8, font, color: COLOR_GOLD });
  page.drawText("VERIFIED BY", { x: cardX + 430, y: thY + 9, size: 8, font, color: COLOR_GOLD });

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
        thickness: 0.5,
        color: COLOR_BORDER,
      });
    }

    // Checkbox Square (Large and clear for pen check)
    const cbSize = 14;
    page.drawRectangle({
      x: cardX + 26,
      y: ry + (rowH - cbSize) / 2,
      width: cbSize,
      height: cbSize,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1.2,
    });

    // Subject title
    page.drawText(sub.title, {
      x: cardX + 80,
      y: ry + (rowH - 10) / 2 + 1,
      size: 10,
      font,
      color: COLOR_CHARCOAL,
    });

    // Envelopes fill-in box
    page.drawText("[ ______ ] Envelopes", {
      x: cardX + 310,
      y: ry + (rowH - 10) / 2 + 1,
      size: 9.5,
      font,
      color: COLOR_CHARCOAL,
    });

    // Verified checkbox
    page.drawRectangle({
      x: cardX + 430,
      y: ry + (rowH - 12) / 2,
      width: 12,
      height: 12,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 0.8,
    });
    page.drawText("Verified", {
      x: cardX + 448,
      y: ry + (rowH - 8) / 2 + 1,
      size: 8,
      font,
      color: COLOR_MUTED,
    });
  }

  // Security Seal & Chain of Custody Section
  const secY = tableY - 145;
  const secH = 135;

  page.drawRectangle({
    x: cardX + 10,
    y: secY,
    width: cardW - 20,
    height: secH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  page.drawRectangle({
    x: cardX + 11,
    y: secY + secH - 24,
    width: cardW - 22,
    height: 23,
    color: COLOR_CHARCOAL,
  });

  page.drawText("SECURITY SEAL & DISPATCH CHAIN OF CUSTODY", {
    x: cardX + 18,
    y: secY + secH - 17,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  const sealLineY = secY + secH - 52;
  page.drawText("TRANSIT BAG SECURITY SEAL # (رقم القفل الأمني للشنطة):", {
    x: cardX + 18,
    y: sealLineY + 12,
    size: 8,
    font,
    color: COLOR_CHARCOAL,
  });
  page.drawRectangle({
    x: cardX + 18,
    y: sealLineY - 12,
    width: cardW - 56,
    height: 22,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });
  page.drawText(options.securitySeal || "SEAL: [ __________________________________________________ ]", {
    x: cardX + 26,
    y: sealLineY - 6,
    size: 9.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Signatures Row
  const sigY = secY + 10;
  const sigColW = (cardW - 36) / 2;

  page.drawText("PACKED & DISPATCHED BY / مسؤول التجهيز:", {
    x: cardX + 18,
    y: sigY + 28,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText("Name: ____________________  Sign: _________", {
    x: cardX + 18,
    y: sigY + 10,
    size: 8,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("RECEIVED & UNBROKEN SEAL VERIFIED BY / المستلم بالسنتر:", {
    x: cardX + 18 + sigColW,
    y: sigY + 28,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText("Name: ____________________  Sign: _________", {
    x: cardX + 18 + sigColW,
    y: sigY + 10,
    size: 8,
    font,
    color: COLOR_CHARCOAL,
  });

  // Footer Warning Note
  page.drawText("CONFIDENTIAL & STRICTLY CONTROLLED — DO NOT OPEN OUTSIDE SECURE CONTROL ROOM", {
    x: cardX + (cardW - 380) / 2,
    y: cardY + 10,
    size: 7,
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

  // A4 Portrait: 595.28 x 841.89 pt
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const margin = 20;
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
    borderWidth: 2.5,
  });

  page.drawRectangle({
    x: cardX + 3.5,
    y: cardY + 3.5,
    width: cardW - 7,
    height: cardH - 7,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  // Emergency Header Banner
  const headerH = 75;
  const headerY = cardY + cardH - headerH - 8;

  page.drawRectangle({
    x: cardX + 5,
    y: headerY,
    width: cardW - 10,
    height: headerH,
    color: COLOR_EMERGENCY_LIGHT,
  });

  const logoH = 46;
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

  const textStartX = logoImg ? logoX + logoW + 14 : cardX + 16;
  const rawExam = options.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam);
  const examLabel = isEst2 ? "EST II" : "EST I";

  page.drawText(`${examLabel} — OFFICIAL EMERGENCY RESERVE (CLEAN SKIN)`, {
    x: textStartX,
    y: headerY + 46,
    size: 12.5,
    font,
    color: COLOR_EMERGENCY_RED,
  });

  page.drawText("مظروف أوراق الامتحانات الاحتياطية والطوارئ — عهدة رئيس الكنترول", {
    x: textStartX,
    y: headerY + 28,
    size: 9.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("STRICTLY CONFIDENTIAL — FOR EMERGENCY REPLACEMENTS ONLY", {
    x: textStartX,
    y: headerY + 12,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });

  // Warning Banner
  const warnY = headerY - 30;
  page.drawRectangle({
    x: cardX + 8,
    y: warnY,
    width: cardW - 16,
    height: 24,
    color: COLOR_CHARCOAL,
  });

  const warnText = "ATTENTION: DO NOT OPEN EXCEPT UPON CHIEF PROCTOR APPROVAL FOR ACTIVE INCIDENTS";
  const warnW = font.widthOfTextAtSize(warnText, 7.5);
  page.drawText(warnText, {
    x: cardX + 8 + (cardW - 16 - warnW) / 2,
    y: warnY + 7.5,
    size: 7.5,
    font,
    color: COLOR_GOLD,
  });

  // Location details
  const locY = warnY - 44;
  page.drawRectangle({
    x: cardX + 8,
    y: locY,
    width: cardW - 16,
    height: 38,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  page.drawText(`GOVERNORATE: ${options.governorate || "Alexandria"}    •    CENTER: ${options.center || "Main Center"}`, {
    x: cardX + 16,
    y: locY + 22,
    size: 8.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`BUILDING / المبنى: ${options.building || "Building HQ"}    •    SESSION: ${options.date || "December 2026"}`, {
    x: cardX + 16,
    y: locY + 8,
    size: 9.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Emergency Dispatch Log Table (Ready for manual pen writing)
  const logTableTop = locY - 14;
  const logTableH = 430;
  const logTableY = logTableTop - logTableH;

  page.drawRectangle({
    x: cardX + 8,
    y: logTableY,
    width: cardW - 16,
    height: logTableH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Table Title Bar
  const thH = 24;
  const thY = logTableY + logTableH - thH;
  page.drawRectangle({
    x: cardX + 9,
    y: thY,
    width: cardW - 18,
    height: thH - 1,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EMERGENCY DISPATCH LOG SHEET / سجل صرف أوراق الطوارئ بالقاعات", {
    x: cardX + 16,
    y: thY + 8,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  // Table Column Headers
  const colHeaderH = 22;
  const colHeaderY = thY - colHeaderH;
  page.drawRectangle({
    x: cardX + 9,
    y: colHeaderY,
    width: cardW - 18,
    height: colHeaderH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  page.drawText("#", { x: cardX + 14, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("TIME / الوقت", { x: cardX + 32, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("ROOM / القاعة", { x: cardX + 90, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("SUBJECT / المادة", { x: cardX + 160, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("COPIES", { x: cardX + 270, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("REASON (DEFECT / EXTRA) / السبب", { x: cardX + 320, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });
  page.drawText("PROCTOR SIGNATURE", { x: cardX + 445, y: colHeaderY + 7, size: 7.5, font, color: COLOR_CHARCOAL });

  // 12 Blank Rows for manual logging
  const numRows = 12;
  const rowH = (colHeaderY - logTableY) / numRows;

  for (let r = 0; r < numRows; r++) {
    const ry = colHeaderY - (r + 1) * rowH;

    // Row line
    page.drawLine({
      start: { x: cardX + 9, y: ry },
      end: { x: cardX + cardW - 9, y: ry },
      thickness: 0.5,
      color: COLOR_BORDER,
    });

    // Row Number
    page.drawText(`${r + 1}`, {
      x: cardX + 14,
      y: ry + (rowH - 7) / 2 + 1,
      size: 7,
      font,
      color: COLOR_MUTED,
    });
  }

  // Footer Signatures
  const footY = cardY + 8;
  const footH = logTableY - footY - 6;

  page.drawRectangle({
    x: cardX + 8,
    y: footY,
    width: cardW - 16,
    height: footH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  page.drawText("CHIEF PROCTOR CLOSEOUT / إقرار رئيس الكنترول في نهاية الامتحان:", {
    x: cardX + 16,
    y: footY + footH - 16,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });

  page.drawText("Total Emergency Copies Dispatched: [ ______ ]        Remaining Unused Returned: [ ______ ]", {
    x: cardX + 16,
    y: footY + footH - 30,
    size: 8,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("Chief Proctor Name: ____________________________    Signature: ____________________________", {
    x: cardX + 16,
    y: footY + 10,
    size: 8,
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

  page.drawText("أوراق احتياطي وطوارئ — للاستبدال أثناء الامتحان", {
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

  // Quantity Box (Left blank for pen writing as requested)
  const countBoxH = 46;
  const countBoxY = subjectBoxY - countBoxH - 5;

  page.drawRectangle({
    x: rightX + 6,
    y: countBoxY,
    width: rightW - 12,
    height: countBoxH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });

  page.drawText("PACKET QUANTITY / عدد النسخ (يُكتب باليد):", {
    x: rightX + 12,
    y: countBoxY + countBoxH - 12,
    size: 6.2,
    font,
    color: COLOR_MUTED,
  });

  // Underlined area for writing count
  const manualCountText = "COUNT: [  ____________  ]  COPIES";
  const manualW = font.widthOfTextAtSize(manualCountText, 12);
  page.drawText(manualCountText, {
    x: rightX + 6 + (rightW - 12 - manualW) / 2,
    y: countBoxY + 12,
    size: 12,
    font,
    color: COLOR_CHARCOAL,
  });

  // Dispatch details
  const verifyY = bodyBottom + 4;
  page.drawLine({
    start: { x: rightX + 6, y: countBoxY - 4 },
    end: { x: rightX + rightW - 6, y: countBoxY - 4 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page.drawText("DISPATCHED TO ROOM: [ ______ ]    TIME: ____:____", {
    x: rightX + 8,
    y: verifyY + 12,
    size: 6.2,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("CHIEF PROCTOR SIGNATURE: ________________________", {
    x: rightX + 8,
    y: verifyY + 2,
    size: 6.2,
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
