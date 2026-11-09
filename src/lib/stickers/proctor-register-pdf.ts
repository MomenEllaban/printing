import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { EST_LOGO_BASE64 } from "./est-logo-base64";

export interface ProctorRegisterPdfParams {
  examName?: string;
  governorate?: string;
  center?: string;
  building?: string;
  floor?: string;
  rooms?: string[];
  totalRooms?: number;
  dateStr?: string;
}

const COLOR_CHARCOAL = rgb(0.12, 0.12, 0.12);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_GOLD = rgb(0.85, 0.70, 0.08); // EST Gold
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97);
const COLOR_ALT_ROW = rgb(0.95, 0.96, 0.97);
const COLOR_BORDER = rgb(0.80, 0.80, 0.80);
const COLOR_WHITE = rgb(1, 1, 1);

const LOGO_JPEG_BYTES: Uint8Array = new Uint8Array(Buffer.from(EST_LOGO_BASE64, "base64"));

/**
 * Generates an official, executive-ready EST Proctor Attendance & Assignment Register PDF (A4 Landscape).
 * Ready for high-quality printing and manual physical verification/signing on test day.
 */
export async function generateProctorRegisterPdf(params: ProctorRegisterPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 Landscape: 841.89 x 595.28 pt
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Embed EST Logo
  let logoImg: any = null;
  try {
    logoImg = await pdfDoc.embedJpg(LOGO_JPEG_BYTES);
  } catch (err) {
    console.error("[proctor-pdf] Error embedding logo:", err);
  }

  const margin = 26;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // 1. Double Outer Frame (Charcoal + Gold)
  page.drawRectangle({
    x: margin,
    y: margin,
    width: contentWidth,
    height: contentHeight,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: margin + 4,
    y: margin + 4,
    width: contentWidth - 8,
    height: contentHeight - 8,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  let currentY = pageHeight - margin - 12;

  // 2. Top Header with Logo & Titles
  const headerHeight = 58;
  const headerY = currentY - headerHeight;

  if (logoImg) {
    const lH = 46;
    const lW = lH * (logoImg.width / logoImg.height);
    page.drawImage(logoImg, {
      x: margin + 14,
      y: headerY + (headerHeight - lH) / 2,
      width: lW,
      height: lH,
    });
  }

  // Header Title
  const titleX = margin + 105;
  const examTitle = `${params.examName || "EST 1"} — OFFICIAL PROCTOR ATTENDANCE & ROOM ASSIGNMENT REGISTER`;
  page.drawText(examTitle, {
    x: titleX,
    y: currentY - 20,
    size: 15,
    font: fontBold,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EXAMINATION SUPERVISION, FLOOR DOSSIER & PROCTOR VERIFICATION SHEET", {
    x: titleX,
    y: currentY - 36,
    size: 9.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  // Date box on the right
  const dateBoxW = 160;
  const dateBoxX = margin + contentWidth - dateBoxW - 14;
  page.drawRectangle({
    x: dateBoxX,
    y: currentY - 48,
    width: dateBoxW,
    height: 40,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  page.drawText("EXAM SESSION DATE", {
    x: dateBoxX + 12,
    y: currentY - 22,
    size: 8,
    font: fontBold,
    color: COLOR_MUTED,
  });

  page.drawText(params.dateStr || "_____ / _____ / 2026", {
    x: dateBoxX + 12,
    y: currentY - 38,
    size: 11,
    font: fontBold,
    color: COLOR_CHARCOAL,
  });

  currentY = headerY - 8;

  // Gold Divider
  page.drawLine({
    start: { x: margin + 12, y: currentY },
    end: { x: margin + contentWidth - 12, y: currentY },
    thickness: 1.5,
    color: COLOR_GOLD,
  });

  currentY -= 10;

  // 3. Location Hierarchy Summary Card (Governorate, Center, Building, Floor)
  const locCardH = 46;
  const locCardY = currentY - locCardH;

  page.drawRectangle({
    x: margin + 12,
    y: locCardY,
    width: contentWidth - 24,
    height: locCardH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  const cols = [
    { label: "GOVERNORATE", val: params.governorate || "All Governorates" },
    { label: "TEST CENTER", val: params.center || "General Center" },
    { label: "BUILDING", val: params.building || "Main Building" },
    { label: "FLOOR", val: params.floor || "All Floors" },
  ];

  const colW = (contentWidth - 24) / 4;
  for (let i = 0; i < cols.length; i++) {
    const colX = margin + 12 + i * colW + 10;
    page.drawText(cols[i].label, {
      x: colX,
      y: locCardY + locCardH - 15,
      size: 8,
      font: fontBold,
      color: COLOR_MUTED,
    });
    page.drawText(cols[i].val, {
      x: colX,
      y: locCardY + 12,
      size: 11,
      font: fontBold,
      color: COLOR_CHARCOAL,
    });

    if (i < cols.length - 1) {
      page.drawLine({
        start: { x: margin + 12 + (i + 1) * colW, y: locCardY + 4 },
        end: { x: margin + 12 + (i + 1) * colW, y: locCardY + locCardH - 4 },
        thickness: 0.5,
        color: COLOR_BORDER,
      });
    }
  }

  currentY = locCardY - 8;

  // Sub-bar: Included rooms / stations
  if (params.rooms && params.rooms.length > 0) {
    const roomsText = `COVERED EXAMINATION ROOMS (${params.rooms.length}) :  ${params.rooms.join("   •   ")}`;
    page.drawText(roomsText, {
      x: margin + 14,
      y: currentY - 9,
      size: 9,
      font: fontBold,
      color: COLOR_CHARCOAL,
    });
    currentY -= 18;
  }

  // 4. Proctors Attendance Table
  const tableX = margin + 12;
  const tableW = contentWidth - 24;
  const tableHeaderH = 22;

  // Define Column Widths
  // Total: 34 + 190 + 130 + 100 + 110 + 110 + remaining
  const colDef = [
    { title: "#", width: 34 },
    { title: "PROCTOR FULL NAME", width: 190 },
    { title: "NATIONAL ID / PHONE", width: 130 },
    { title: "ASSIGNED ROOM", width: 100 },
    { title: "PERIOD 1 SIGNATURE", width: 115 },
    { title: "PERIOD 2 SIGNATURE", width: 115 },
    { title: "ATTENDANCE / REMARKS", width: tableW - (34 + 190 + 130 + 100 + 115 + 115) },
  ];

  // Draw Table Header
  const tableHeaderY = currentY - tableHeaderH;
  page.drawRectangle({
    x: tableX,
    y: tableHeaderY,
    width: tableW,
    height: tableHeaderH,
    color: COLOR_CHARCOAL,
  });

  let curColX = tableX;
  for (const c of colDef) {
    page.drawText(c.title, {
      x: curColX + 8,
      y: tableHeaderY + (tableHeaderH - 8) / 2,
      size: 7.5,
      font: fontBold,
      color: COLOR_GOLD,
    });
    curColX += c.width;
  }

  // Rows: 11 Proctors rows
  const numRows = 11;
  const rowHeight = 21.5;
  let rowTopY = tableHeaderY;

  for (let r = 0; r < numRows; r++) {
    const rowY = rowTopY - rowHeight;
    const isAlt = r % 2 === 1;

    page.drawRectangle({
      x: tableX,
      y: rowY,
      width: tableW,
      height: rowHeight,
      color: isAlt ? COLOR_ALT_ROW : COLOR_WHITE,
      borderColor: COLOR_BORDER,
      borderWidth: 0.5,
    });

    // Row Number
    page.drawText(String(r + 1), {
      x: tableX + 12,
      y: rowY + (rowHeight - 9) / 2 + 1,
      size: 9,
      font: fontBold,
      color: COLOR_CHARCOAL,
    });

    // Column dividing lines
    let cx = tableX;
    for (let i = 0; i < colDef.length - 1; i++) {
      cx += colDef[i].width;
      page.drawLine({
        start: { x: cx, y: rowY },
        end: { x: cx, y: rowY + rowHeight },
        thickness: 0.5,
        color: COLOR_BORDER,
      });
    }

    rowTopY = rowY;
  }

  currentY = rowTopY - 12;

  // 5. Verification & Signature Footer
  const footerH = 40;
  const footerY = currentY - footerH;

  page.drawRectangle({
    x: tableX,
    y: footerY,
    width: tableW,
    height: footerH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1.5,
  });

  const signColW = tableW / 3;

  // Senior Proctor Signature
  page.drawText("SENIOR SUPERVISOR (FLOOR)", {
    x: tableX + 12,
    y: footerY + footerH - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_MUTED,
  });
  page.drawText("Name: _______________________    Sign: ___________________", {
    x: tableX + 12,
    y: footerY + 11,
    size: 8,
    font: fontRegular,
    color: COLOR_CHARCOAL,
  });

  // Center Official Stamp
  page.drawLine({
    start: { x: tableX + signColW, y: footerY + 4 },
    end: { x: tableX + signColW, y: footerY + footerH - 4 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page.drawText("TEST CENTER VERIFICATION & STAMP", {
    x: tableX + signColW + 16,
    y: footerY + footerH - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_MUTED,
  });
  page.drawText("[ OFFICIAL TEST CENTER SEAL / STAMP ]", {
    x: tableX + signColW + 28,
    y: footerY + 11,
    size: 8,
    font: fontBold,
    color: COLOR_BORDER,
  });

  // Center Lead Signature
  page.drawLine({
    start: { x: tableX + signColW * 2, y: footerY + 4 },
    end: { x: tableX + signColW * 2, y: footerY + footerH - 4 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page.drawText("TEST CENTER LEAD", {
    x: tableX + signColW * 2 + 12,
    y: footerY + footerH - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_MUTED,
  });
  page.drawText("Name: _______________________    Sign: ___________________", {
    x: tableX + signColW * 2 + 12,
    y: footerY + 11,
    size: 8,
    font: fontRegular,
    color: COLOR_CHARCOAL,
  });

  return await pdfDoc.save();
}

