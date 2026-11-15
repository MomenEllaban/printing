import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";
import { formatArabicForPdf } from "./arabic-shaper";

export interface CertificateStudentData {
  id?: string;
  serialNumber?: string | number; // e.g. "128"
  studentName: string; // e.g. "Abdelaziz Sameh Mahmoud Aly Aboueyana"
  studentNameAr?: string; // Arabic candidate name e.g. "ابانوب عماد عدلى عبده"
  seatNumber?: string;
  nationalId?: string;
  schoolName?: string;
  governorate?: string;
  examName?: string;
  sessionName?: string;
  certificateCode?: string;
  totalReports?: number | string; // e.g. 2 or 4
  reportsList?: string; // e.g. "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II"
  subjects?: string;
  score?: string;
  status?: string;
  batchName?: string;
  notes?: string;

  // Aramex / Delivery details
  recipient?: string;
  city?: string;
  area?: string;
  street?: string;
  apartment?: string | number;
  floor?: string | number;
  landmark?: string;
  phone?: string;
  phone2?: string;
  awb?: string;
}

export interface CertificateStickersOptions {
  batchName?: string;
  sessionName?: string;
  examName?: string;
  students: CertificateStudentData[];
  layout?: "grid_4_per_a4" | "single_quarter_a4";
  orientation?: "portrait" | "landscape";
  isAramex?: boolean;
}

// 100% Black & White Palette
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_GRAY = rgb(0.28, 0.28, 0.28);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_WHITE = rgb(1, 1, 1);

// Static decoded logo bytes in memory - zero filesystem dependency
const LOGO_JPEG_BYTES: Uint8Array = new Uint8Array(Buffer.from(EST_LOGO_BASE64, "base64"));

async function loadLogoImage(pdfDoc: PDFDocument): Promise<any> {
  try {
    return await pdfDoc.embedJpg(LOGO_JPEG_BYTES);
  } catch (err) {
    try {
      const publicPath = path.join(process.cwd(), "public", "est-logo.jpg");
      if (fs.existsSync(publicPath)) {
        return await pdfDoc.embedJpg(fs.readFileSync(publicPath));
      }
    } catch {}
    return null;
  }
}

async function loadStickerFont(pdfDoc: PDFDocument): Promise<any> {
  const fontPaths = [
    path.join(process.cwd(), "src", "assets", "fonts", "Arial-Bold.ttf"),
    path.join(process.cwd(), "public", "fonts", "Arial-Bold.ttf"),
  ];

  for (const fp of fontPaths) {
    if (fs.existsSync(fp)) {
      try {
        const fontBytes = fs.readFileSync(fp);
        return await pdfDoc.embedFont(fontBytes, { subset: false });
      } catch {}
    }
  }

  return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
}

function normalizeReportItem(item: string): string {
  const map: Record<string, string> = {
    "يناير": "January",
    "فبراير": "February",
    "مارس": "March",
    "أبريل": "April",
    "ابريل": "April",
    "مايو": "May",
    "يونيو": "June",
    "يوليو": "July",
    "أغسطس": "August",
    "اغسطس": "August",
    "سبتمبر": "September",
    "أكتوبر": "October",
    "اكتوبر": "October",
    "نوفمبر": "November",
    "ديسمبر": "December",
  };
  let res = item || "";
  for (const [ar, en] of Object.entries(map)) {
    res = res.replace(new RegExp(ar, "g"), en);
  }
  return res.replace(/\s+/g, " ").trim();
}

function wrapTextToLines(
  text: string,
  font: any,
  targetSize: number,
  maxWidth: number,
): { lines: string[]; fontSize: number } {
  const trimmed = text.trim();
  if (!trimmed) return { lines: [], fontSize: targetSize };

  // 1. Try single line scaling down to 10.5pt
  let size = targetSize;
  while (size >= 10.5 && font.widthOfTextAtSize(trimmed, size) > maxWidth) {
    size -= 0.5;
  }
  if (font.widthOfTextAtSize(trimmed, size) <= maxWidth) {
    return { lines: [trimmed], fontSize: size };
  }

  // 2. Wrap into 2 lines for long multi-word names
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    while (size > 8 && font.widthOfTextAtSize(trimmed, size) > maxWidth) {
      size -= 0.5;
    }
    return { lines: [trimmed], fontSize: size };
  }

  const bestSplit = Math.ceil(words.length / 2);
  const line1 = words.slice(0, bestSplit).join(" ");
  const line2 = words.slice(bestSplit).join(" ");
  let wrapSize = Math.min(targetSize, 13.5);

  while (
    wrapSize > 8.5 &&
    (font.widthOfTextAtSize(line1, wrapSize) > maxWidth || font.widthOfTextAtSize(line2, wrapSize) > maxWidth)
  ) {
    wrapSize -= 0.5;
  }

  return { lines: [line1, line2], fontSize: wrapSize };
}

export function parseReportsList(raw: string): string[] {
  if (!raw) return [];
  const normalized = normalizeReportItem(raw);
  const parts = normalized
    .split(/[;؛،,\n\r•]|\s+و\s+/)
    .map((p) => p.replace(/^[-•*]\s*/, "").trim())
    .filter((p) => p.length > 0);
  return parts;
}

function wrapTextToMaxLines(
  rawText: string,
  font: any,
  fontSize: number,
  maxWidth: number,
  maxLines: number = 2,
): string[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];
  const isArabic = /[\u0600-\u06FF]/.test(trimmed);
  const shapedFull = isArabic ? formatArabicForPdf(trimmed) : trimmed;
  if (font.widthOfTextAtSize(shapedFull, fontSize) <= maxWidth) {
    return [shapedFull];
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    return [shapedFull];
  }
  const lines: string[] = [];
  let currentWords: string[] = [];
  for (const w of words) {
    const testWords = [...currentWords, w];
    const testStr = isArabic ? formatArabicForPdf(testWords.join(" ")) : testWords.join(" ");
    if (font.widthOfTextAtSize(testStr, fontSize) <= maxWidth || currentWords.length === 0) {
      currentWords.push(w);
    } else {
      lines.push(isArabic ? formatArabicForPdf(currentWords.join(" ")) : currentWords.join(" "));
      currentWords = [w];
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  if (currentWords.length > 0 && lines.length < maxLines) {
    lines.push(isArabic ? formatArabicForPdf(currentWords.join(" ")) : currentWords.join(" "));
  }
  return lines;
}

/**
 * Generates Quarter-A4 Student Certificate / Score Report Stickers PDF.
 * Simple, Clean, High-Contrast Black & White with Official EST Logo and Clear Typography.
 * 4 stickers per A4 Landscape sheet in a 2x2 grid.
 */
export async function generateCertificateStickersPdf(
  options: CertificateStickersOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  const students = options.students && options.students.length > 0
    ? options.students
    : [
        {
          serialNumber: "1",
          studentName: "Abdelaziz Sameh Mahmoud Aly Aboueyana",
          totalReports: 2,
          reportsList: "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II",
          batchName: options.batchName || "Data for MoE - Nov Batch 2 11.11.2026",
          certificateCode: "EST-REP-0001",
        },
      ];

  // A4 Portrait default (210mm x 297mm) as requested; Landscape optional
  const isLandscape = options.isAramex ? false : options.orientation === "landscape";
  const a4W = isLandscape ? 841.89 : 595.28;
  const a4H = isLandscape ? 595.28 : 841.89;
  const margin = isLandscape ? 14 : 12;
  const gapX = isLandscape ? 12 : 10;
  const gapY = isLandscape ? 12 : 12;
  const stickerW = (a4W - margin * 2 - gapX) / 2; // Portrait: ~280.6 pt (~99 mm)
  const stickerH = (a4H - margin * 2 - gapY) / 2; // Portrait: ~402.9 pt (~142.1 mm)

  const stickersPerPage = 4;
  const totalPages = Math.ceil(students.length / stickersPerPage);

  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([a4W, a4H]);
    const pageStudents = students.slice(p * stickersPerPage, (p + 1) * stickersPerPage);

    // Subtle center cutting guide lines across the A4 sheet
    const midX = a4W / 2;
    const midY = a4H / 2;
    page.drawLine({
      start: { x: midX, y: margin },
      end: { x: midX, y: a4H - margin },
      thickness: 0.5,
      color: COLOR_LIGHT_GRAY,
      dashArray: [4, 4],
    });
    page.drawLine({
      start: { x: margin, y: midY },
      end: { x: a4W - margin, y: midY },
      thickness: 0.5,
      color: COLOR_LIGHT_GRAY,
      dashArray: [4, 4],
    });

    for (let i = 0; i < pageStudents.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2); // 0 = top row, 1 = bottom row
      const sx = margin + col * (stickerW + gapX);
      const sy = a4H - margin - (row + 1) * stickerH - row * gapY;

      if (options.isAramex) {
        drawAramexCertificateSticker({
          page,
          font,
          logoImg,
          student: pageStudents[i],
          globalOptions: options,
          x: sx,
          y: sy,
          width: stickerW,
          height: stickerH,
          stickerIndex: p * stickersPerPage + i + 1,
          totalStickers: students.length,
        });
      } else {
        drawSimpleBwCertificateSticker({
          page,
          font,
          logoImg,
          student: pageStudents[i],
          globalOptions: options,
          x: sx,
          y: sy,
          width: stickerW,
          height: stickerH,
          stickerIndex: p * stickersPerPage + i + 1,
          totalStickers: students.length,
        });
      }
    }
  }

  return await pdfDoc.save();
}

function drawSimpleBwCertificateSticker(params: {
  page: any;
  font: any;
  logoImg: any;
  student: CertificateStudentData;
  globalOptions: CertificateStickersOptions;
  x: number;
  y: number;
  width: number;
  height: number;
  stickerIndex: number;
  totalStickers: number;
}) {
  const { page, font, logoImg, student, x, y, width, height, stickerIndex } = params;

  const isPortrait = height > 340;
  const serial = student.serialNumber || stickerIndex;
  const studentName = (student.studentName || "Student Candidate").trim();
  const rawReportsList = (student.reportsList || "Official EST Score Report").trim();
  const reportsParts = parseReportsList(rawReportsList);

  // 1. Top Header: Centered Official EST Logo
  const logoH = isPortrait ? 40 : 34;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 58;
  const logoX = x + (width - logoW) / 2;
  const logoY = y + height - (isPortrait ? 10 : 8) - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } else {
    const estText = "EST";
    const estSize = isPortrait ? 24 : 20;
    const estW = font.widthOfTextAtSize(estText, estSize);
    page.drawText(estText, {
      x: x + (width - estW) / 2,
      y: logoY + 4,
      size: estSize,
      font,
      color: COLOR_BLACK,
    });
  }

  // Header Divider Line
  const headerDividerY = logoY - (isPortrait ? 8 : 6);
  page.drawLine({
    start: { x: x + 8, y: headerDividerY },
    end: { x: x + width - 8, y: headerDividerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 2. Serial Number Row: Centered Placard Badge (Clean, prominent, separated from student name)
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const serialLabel = "SERIAL NO:";
  const serialLabelSize = isPortrait ? 9.5 : 8.5;
  const serialNumSize = isPortrait ? 18 : 16;
  const labelW = font.widthOfTextAtSize(serialLabel + "  ", serialLabelSize);
  const numW = font.widthOfTextAtSize(serialStr, serialNumSize);
  const totalSerialW = labelW + numW;

  const placardH = isPortrait ? 26 : 22;
  const placardW = Math.max(130, totalSerialW + 24);
  const placardX = x + (width - placardW) / 2;
  const placardY = headerDividerY - (isPortrait ? 14 : 10) - placardH;

  // Placard background box with clean border
  page.drawRectangle({
    x: placardX,
    y: placardY,
    width: placardW,
    height: placardH,
    borderColor: COLOR_BLACK,
    borderWidth: 1,
    color: COLOR_WHITE,
  });

  const serialTextY = placardY + (placardH - serialNumSize) / 2 + 1;
  const serialStartX = placardX + (placardW - totalSerialW) / 2;

  page.drawText(serialLabel, {
    x: serialStartX,
    y: serialTextY + 1.5,
    size: serialLabelSize,
    font,
    color: COLOR_DARK_GRAY,
  });
  page.drawText(serialStr, {
    x: serialStartX + labelW,
    y: serialTextY,
    size: serialNumSize,
    font,
    color: COLOR_BLACK,
  });

  // 3. Student Name Section: Dedicated Full-Width Area
  const nameStartX = x + 12;
  const maxNameWidth = width - 24;

  const studentLabelY = placardY - (isPortrait ? 16 : 11);
  const labelText = "STUDENT NAME:";
  page.drawText(labelText, {
    x: nameStartX,
    y: studentLabelY,
    size: isPortrait ? 9 : 8.5,
    font,
    color: COLOR_DARK_GRAY,
  });

  const hasArabic = Boolean(student.studentNameAr && student.studentNameAr.trim());
  const hasEnglish = Boolean(studentName && studentName.trim() && studentName !== student.studentNameAr);

  let curY = studentLabelY - (isPortrait ? 18 : 15);

  if (hasEnglish && hasArabic) {
    const primaryName = studentName;
    const rawArabic = student.studentNameAr!.trim();

    // English Name
    const enFit = wrapTextToLines(primaryName, font, isPortrait ? 15 : 13.5, maxNameWidth);
    for (const line of enFit.lines) {
      page.drawText(line, {
        x: nameStartX,
        y: curY,
        size: enFit.fontSize,
        font,
        color: COLOR_BLACK,
      });
      curY -= enFit.fontSize + (isPortrait ? 4 : 3);
    }

    curY -= isPortrait ? 4 : 2;

    // Arabic Name: wrap raw Arabic first, then format each line for natural RTL reading order in PDF
    const arFit = wrapTextToLines(rawArabic, font, isPortrait ? 15 : 13.5, maxNameWidth);
    for (const line of arFit.lines) {
      const shapedLine = formatArabicForPdf(line);
      page.drawText(shapedLine, {
        x: nameStartX,
        y: curY,
        size: arFit.fontSize,
        font,
        color: COLOR_BLACK,
      });
      curY -= arFit.fontSize + (isPortrait ? 4 : 3);
    }
  } else {
    // Single name (either English or Arabic)
    const rawName = studentName || student.studentNameAr || "Student Candidate";
    const isAr = /[\u0600-\u06FF]/.test(rawName);
    const fit = wrapTextToLines(rawName, font, isPortrait ? 17 : 15, maxNameWidth);
    for (const line of fit.lines) {
      const displayLine = isAr ? formatArabicForPdf(line) : line;
      page.drawText(displayLine, {
        x: nameStartX,
        y: curY,
        size: fit.fontSize,
        font,
        color: COLOR_BLACK,
      });
      curY -= fit.fontSize + (isPortrait ? 4 : 3);
    }
  }

  // Divider Line below Student Section
  const studentDividerY = curY - (isPortrait ? 12 : 8);
  page.drawLine({
    start: { x: x + 8, y: studentDividerY },
    end: { x: x + width - 8, y: studentDividerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 4. Reports Summary Row: TOTAL REPORTS
  const totalReportsNum = student.totalReports ? Number(student.totalReports) : reportsParts.length;
  const totalReportsCount = totalReportsNum > 0 ? totalReportsNum : Math.max(1, reportsParts.length);
  const totalReportsStr = `${totalReportsCount} ${totalReportsCount === 1 ? "Report" : "Reports"}`;

  const totalLabelY = studentDividerY - (isPortrait ? 16 : 12);
  page.drawText("TOTAL REPORTS:", {
    x: nameStartX,
    y: totalLabelY,
    size: isPortrait ? 9.5 : 8.5,
    font,
    color: COLOR_DARK_GRAY,
  });

  const totalValY = totalLabelY - (isPortrait ? 18 : 15);
  page.drawText(totalReportsStr, {
    x: nameStartX,
    y: totalValY,
    size: isPortrait ? 17 : 14.5,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line below Total Reports
  const summaryDividerY = totalValY - (isPortrait ? 12 : 8);
  page.drawLine({
    start: { x: x + 8, y: summaryDividerY },
    end: { x: x + width - 8, y: summaryDividerY },
    thickness: 0.8,
    color: COLOR_LIGHT_GRAY,
  });

  // 5. Enclosed Score Reports List
  const listTitleY = summaryDividerY - (isPortrait ? 16 : 12);
  page.drawText("ENCLOSED SCORE REPORTS:", {
    x: nameStartX,
    y: listTitleY,
    size: isPortrait ? 10 : 9,
    font,
    color: COLOR_BLACK,
  });

  const reportsStartY = listTitleY - (isPortrait ? 19 : 15);
  const count = reportsParts.length;

  if (count === 0) {
    page.drawText("• Official EST Score Report", {
      x: nameStartX,
      y: reportsStartY,
      size: isPortrait ? 13 : 11,
      font,
      color: COLOR_BLACK,
    });
  } else if (count <= 6 || width < 320) {
    // 1 column with generous line spacing in portrait (width ~280pt, height ~403pt)
    const step = count <= 2 ? (isPortrait ? 26 : 20) : count <= 4 ? (isPortrait ? 22 : 17) : 16;
    const baseSize = count <= 2 ? (isPortrait ? 13 : 11.5) : count <= 4 ? 11 : 10;
    const maxLineW = width - 24;

    for (let r = 0; r < count; r++) {
      const itemText = `• ${reportsParts[r]}`;
      let itemSize = baseSize;
      let itemW = font.widthOfTextAtSize(itemText, itemSize);
      if (itemW > maxLineW) {
        itemSize = Math.max(8.5, (maxLineW / itemW) * itemSize);
      }
      const itemY = reportsStartY - r * step;
      page.drawText(itemText, {
        x: nameStartX,
        y: itemY,
        size: itemSize,
        font,
        color: COLOR_BLACK,
      });
    }
  } else {
    // 2 columns for 7+ reports on wide layout
    const colWidth = (width - 36) / 2;
    const rows = Math.ceil(count / 2);
    const step = Math.min(18, Math.max(14, (reportsStartY - (y + 26)) / rows));
    const baseSize = 10;

    for (let r = 0; r < count; r++) {
      const colIdx = r < rows ? 0 : 1;
      const rowIdx = r < rows ? r : r - rows;
      const colX = colIdx === 0 ? x + 12 : x + 16 + colWidth;
      const itemText = `• ${reportsParts[r]}`;

      let itemSize = baseSize;
      let itemW = font.widthOfTextAtSize(itemText, itemSize);
      if (itemW > colWidth - 6) {
        itemSize = Math.max(8, ((colWidth - 6) / itemW) * itemSize);
      }
      const itemY = reportsStartY - rowIdx * step;
      page.drawText(itemText, {
        x: colX,
        y: itemY,
        size: itemSize,
        font,
        color: COLOR_BLACK,
      });
    }
  }
}

/**
 * Draws a comprehensive Aramex / Delivery Shipping Score Report Sticker.
 * Includes Official EST Logo, Serial (xxx), Recipient, Student name, Governorate,
 * City, Area, Street, Apartment, Floor, Landmark, Phone numbers, Total Reports, and MoE Report List.
 * Vertical / Portrait orientation with zero outer border box.
 */
function drawAramexCertificateSticker(params: {
  page: any;
  font: any;
  logoImg: any;
  student: CertificateStudentData;
  globalOptions: CertificateStickersOptions;
  x: number;
  y: number;
  width: number;
  height: number;
  stickerIndex: number;
  totalStickers: number;
}) {
  const { page, font, logoImg, student, x, y, width, height, stickerIndex } = params;

  const serial = student.serialNumber || stickerIndex;
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const rawReportsList = (student.reportsList || "Official EST Score Report").trim();
  const reportsParts = parseReportsList(rawReportsList);

  // 1. Top Header: Official EST Logo (Centered, clean, no outer border box)
  const logoH = 34;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 54;
  const logoX = x + (width - logoW) / 2;
  const logoY = y + height - 8 - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } else {
    const estText = "EST";
    const estSize = 22;
    const estW = font.widthOfTextAtSize(estText, estSize);
    page.drawText(estText, {
      x: x + (width - estW) / 2,
      y: logoY + 4,
      size: estSize,
      font,
      color: COLOR_BLACK,
    });
  }

  // Divider Line below Header
  const headerDividerY = logoY - 5;
  page.drawLine({
    start: { x: x + 8, y: headerDividerY },
    end: { x: x + width - 8, y: headerDividerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 2. Serial Number Row: Centered Placard (e.g. (205))
  const serialRowY = headerDividerY - 14;
  const serialLabel = "SERIAL NO:";
  const serialLabelSize = 8.5;
  const serialNumSize = 15;
  const labelW = font.widthOfTextAtSize(serialLabel + "  ", serialLabelSize);
  const numW = font.widthOfTextAtSize(serialStr, serialNumSize);
  const totalSerialW = labelW + numW;
  const serialStartX = x + (width - totalSerialW) / 2;

  page.drawText(serialLabel, {
    x: serialStartX,
    y: serialRowY + 1.5,
    size: serialLabelSize,
    font,
    color: COLOR_DARK_GRAY,
  });
  page.drawText(serialStr, {
    x: serialStartX + labelW,
    y: serialRowY,
    size: serialNumSize,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line below Serial Number
  const serialDividerY = serialRowY - 7;
  page.drawLine({
    start: { x: x + 8, y: serialDividerY },
    end: { x: x + width - 8, y: serialDividerY },
    thickness: 0.8,
    color: COLOR_LIGHT_GRAY,
  });

  // 3. Shipping & Delivery Details
  const leftX = x + 10;
  const maxContentW = width - 20;
  let curY = serialDividerY - 11;

  // Helper to draw a key-value row with automatic RTL/Arabic shaping
  const drawFieldRow = (
    label: string,
    rawVal?: string | number,
    opts?: { fontSize?: number; labelWidth?: number },
  ) => {
    if (!rawVal && rawVal !== 0) return;
    const valStr = String(rawVal).trim();
    if (!valStr) return;

    const fSize = opts?.fontSize || 8;
    const lText = label.endsWith(":") ? label : `${label}:`;
    const lW = opts?.labelWidth || font.widthOfTextAtSize(`${lText} `, fSize);

    page.drawText(lText, {
      x: leftX,
      y: curY,
      size: fSize,
      font,
      color: COLOR_DARK_GRAY,
    });

    const isArabic = /[\u0600-\u06FF]/.test(valStr);
    const shapedVal = isArabic ? formatArabicForPdf(valStr) : valStr;

    // Check if value fits on same line
    const availValW = maxContentW - lW;
    if (font.widthOfTextAtSize(shapedVal, fSize) <= availValW) {
      page.drawText(shapedVal, {
        x: leftX + lW,
        y: curY,
        size: fSize,
        font,
        color: COLOR_BLACK,
      });
      curY -= (fSize + 3);
    } else {
      // Multi-line wrap
      const lines = wrapTextToMaxLines(valStr, font, fSize, maxContentW, 2);
      if (lines.length === 1) {
        page.drawText(lines[0], {
          x: leftX + lW,
          y: curY,
          size: fSize,
          font,
          color: COLOR_BLACK,
        });
        curY -= (fSize + 3);
      } else {
        curY -= (fSize + 2);
        for (const line of lines) {
          page.drawText(line, {
            x: leftX + 8,
            y: curY,
            size: fSize,
            font,
            color: COLOR_BLACK,
          });
          curY -= (fSize + 2);
        }
      }
    }
  };

  // 1. Recipient (e.g. عماد عدلي عبده / مصطفى مهدي...)
  const recipientVal = student.recipient || student.studentNameAr || student.studentName;
  drawFieldRow("Recipient", recipientVal, { fontSize: 8.5 });

  // 2. Student name
  const studentNameVal = student.studentNameAr || student.studentName;
  drawFieldRow("Student name", studentNameVal, { fontSize: 8.5 });

  // 3. Governorate & City
  const govVal = student.governorate || "—";
  const cityVal = student.city || "—";
  page.drawText(`Governorate: ${govVal}   •   City: ${cityVal}`, {
    x: leftX,
    y: curY,
    size: 8,
    font,
    color: COLOR_BLACK,
  });
  curY -= 11;

  // 4. Area
  if (student.area) {
    drawFieldRow("Area", student.area, { fontSize: 8 });
  }

  // 5. Street
  if (student.street) {
    drawFieldRow("Street", student.street, { fontSize: 7.5 });
  }

  // 6. Apartment & Floor
  const aptVal = student.apartment ? String(student.apartment) : "—";
  const floorVal = student.floor ? String(student.floor) : "—";
  page.drawText(`Apartment: ${aptVal}        Floor: ${floorVal}`, {
    x: leftX,
    y: curY,
    size: 8,
    font,
    color: COLOR_BLACK,
  });
  curY -= 11;

  // 7. Landmark
  if (student.landmark) {
    drawFieldRow("Landmark", student.landmark, { fontSize: 7.5 });
  }

  // 8. Phone Numbers
  if (student.phone) {
    drawFieldRow("Phone", student.phone, { fontSize: 8 });
  }
  if (student.phone2 && student.phone2 !== student.phone) {
    drawFieldRow("Phone", student.phone2, { fontSize: 8 });
  }

  // Divider Line before Reports
  curY -= 2;
  page.drawLine({
    start: { x: x + 8, y: curY },
    end: { x: x + width - 8, y: curY },
    thickness: 0.8,
    color: COLOR_BLACK,
  });
  curY -= 11;

  // 9. Total Reports
  const totalReportsNum = student.totalReports || 1;
  const repCountText = Number(totalReportsNum) === 1 ? "1 Report" : `${totalReportsNum} Reports`;
  const repLabel = "TOTAL REPORTS:";
  page.drawText(repLabel, {
    x: leftX,
    y: curY,
    size: 8.5,
    font,
    color: COLOR_DARK_GRAY,
  });
  const repLabelW = font.widthOfTextAtSize(`${repLabel}  `, 8.5);
  page.drawText(repCountText, {
    x: leftX + repLabelW,
    y: curY,
    size: 9.5,
    font,
    color: COLOR_BLACK,
  });
  curY -= 12;

  // 10. MoE Report List
  page.drawText("MoE Report List:", {
    x: leftX,
    y: curY,
    size: 8,
    font,
    color: COLOR_DARK_GRAY,
  });
  curY -= 10;

  const displayReports = reportsParts.length > 0 ? reportsParts.slice(0, 3) : ["Official EST Score Report"];
  for (const item of displayReports) {
    page.drawText(`• ${item}`, {
      x: leftX + 4,
      y: curY,
      size: 7.5,
      font,
      color: COLOR_BLACK,
    });
    curY -= 9.5;
  }
}
