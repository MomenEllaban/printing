import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface CertificateStudentData {
  id?: string;
  serialNumber?: string | number; // e.g. "128"
  studentName: string; // e.g. "يارا رمضان يوسف ابو الخير" or "Abanoub Emad Adly Abdou"
  seatNumber?: string;
  nationalId?: string;
  schoolName?: string;
  governorate?: string;
  examName?: string;
  sessionName?: string;
  certificateCode?: string;
  totalReports?: number | string; // e.g. 2
  reportsList?: string; // e.g. "يناير 2026 - EST I، ومارس 2026 - EST II"
  subjects?: string;
  score?: string;
  status?: string;
  batchName?: string;
  notes?: string;
}

export interface CertificateStickersOptions {
  batchName?: string;
  sessionName?: string;
  examName?: string;
  students: CertificateStudentData[];
  layout?: "grid_4_per_a4" | "single_quarter_a4";
}

// 100% Black & White Palette
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_GRAY = rgb(0.25, 0.25, 0.25);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_WHITE = rgb(1, 1, 1);

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

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]/.test(text);
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
  let res = item;
  for (const [ar, en] of Object.entries(map)) {
    res = res.replace(new RegExp(ar, "g"), en);
  }
  return res.replace(/\s+/g, " ").trim();
}

/**
 * Generates Quarter-A4 Student Certificate / Score Report Stickers PDF.
 * Simple, Clean, High-Contrast Black & White with Large Typography.
 * 4 stickers per A4 Landscape sheet in a 2x2 grid.
 */
export async function generateCertificateStickersPdf(
  options: CertificateStickersOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);

  const students = options.students && options.students.length > 0
    ? options.students
    : [
        {
          serialNumber: "128",
          studentName: "يارا رمضان يوسف ابو الخير",
          totalReports: 2,
          reportsList: "January 2026 - EST I; March 2026 - EST II",
          batchName: options.batchName || "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
          certificateCode: "EST-REP-0128",
        },
      ];

  // A4 Landscape: 841.89 x 595.28 pt (297mm x 210mm)
  const a4W = 841.89;
  const a4H = 595.28;
  const margin = 14;
  const gapX = 12;
  const gapY = 12;
  const stickerW = (a4W - margin * 2 - gapX) / 2; // ~400.9 pt (~141.4 mm)
  const stickerH = (a4H - margin * 2 - gapY) / 2; // ~270.6 pt (~95.5 mm)

  const stickersPerPage = 4;
  const totalPages = Math.ceil(students.length / stickersPerPage);

  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([a4W, a4H]);
    const pageStudents = students.slice(p * stickersPerPage, (p + 1) * stickersPerPage);

    for (let i = 0; i < pageStudents.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2); // 0 = top row, 1 = bottom row
      const sx = margin + col * (stickerW + gapX);
      const sy = a4H - margin - (row + 1) * stickerH - row * gapY;

      drawSimpleBwCertificateSticker({
        page,
        font,
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

  return await pdfDoc.save();
}

function drawSimpleBwCertificateSticker(params: {
  page: any;
  font: any;
  student: CertificateStudentData;
  globalOptions: CertificateStickersOptions;
  x: number;
  y: number;
  width: number;
  height: number;
  stickerIndex: number;
  totalStickers: number;
}) {
  const { page, font, student, globalOptions, x, y, width, height, stickerIndex } = params;

  const serial = student.serialNumber || stickerIndex;
  const studentName = (student.studentName || "Student Candidate").trim();
  const totalReports = student.totalReports || 1;
  const rawReportsList = (student.reportsList || "Official EST Score Report").trim();
  const batchName = (student.batchName || globalOptions.batchName || "Official Report Batch").trim();

  // 1. Single Outer Border (Clean 1.2pt Black Frame for precise cutting)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 1.2,
  });

  // 2. Top Header: Clean, Light Header (No heavy solid black bar, no 79/306 count)
  const headerH = 38;
  const headerY = y + height - headerH - 6;

  // Subtle clean light header background
  page.drawRectangle({
    x: x + 2,
    y: headerY,
    width: width - 4,
    height: headerH + 4,
    color: rgb(0.96, 0.96, 0.97),
  });

  // Left: EST Emblem Box (Crisp emblem badge)
  page.drawRectangle({
    x: x + 10,
    y: headerY + 6,
    width: 44,
    height: 26,
    color: COLOR_BLACK,
  });

  page.drawText("EST", {
    x: x + 17,
    y: headerY + 12,
    size: 15,
    font,
    color: COLOR_WHITE,
  });

  // Header Title
  page.drawText("OFFICIAL SCORE REPORT & CERTIFICATE", {
    x: x + 62,
    y: headerY + 21,
    size: 10,
    font,
    color: COLOR_BLACK,
  });

  // Batch Name on Header
  const displayBatch = batchName.length > 55 ? batchName.slice(0, 52) + "..." : batchName;
  page.drawText(displayBatch.toUpperCase(), {
    x: x + 62,
    y: headerY + 8,
    size: 8,
    font,
    color: COLOR_DARK_GRAY,
  });

  // Divider Line below Header
  page.drawLine({
    start: { x: x + 2, y: headerY },
    end: { x: x + width - 2, y: headerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 3. Serial Number & Student Name (Adjusted placement, clear font, generous breathing room)
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const serialFontSize = serialStr.length > 6 ? 22 : serialStr.length > 4 ? 26 : 30;
  const serialW = font.widthOfTextAtSize(serialStr, serialFontSize);

  const studentSectionBottomY = headerY - 76;
  const nameBaselineY = studentSectionBottomY + 18;
  const labelBaselineY = nameBaselineY + 30;

  // Prominent Serial Number on Left
  page.drawText(serialStr, {
    x: x + 14,
    y: nameBaselineY,
    size: serialFontSize,
    font,
    color: COLOR_BLACK,
  });

  // Calculate start position for candidate name
  const nameStartX = Math.max(x + 14 + serialW + 16, x + 95);

  // Label above Candidate Name: "اسم الطالب / الطالبة:"
  const nameIsAr = isArabic(studentName);
  const labelText = nameIsAr ? "اسم الطالب / الطالبة:" : "CANDIDATE NAME:";
  page.drawText(labelText, {
    x: nameStartX,
    y: labelBaselineY,
    size: 10,
    font,
    color: COLOR_DARK_GRAY,
  });

  // Candidate Name in HUGE FONT (22pt - 26pt bold)
  const maxNameWidth = width - (nameStartX - x) - 14;
  let nameSize = 24;
  while (nameSize > 13 && font.widthOfTextAtSize(studentName, nameSize) > maxNameWidth) {
    nameSize -= 1;
  }

  page.drawText(studentName, {
    x: nameStartX,
    y: nameBaselineY,
    size: nameSize,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line below Student Section
  page.drawLine({
    start: { x: x + 10, y: studentSectionBottomY },
    end: { x: x + width - 10, y: studentSectionBottomY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 4. Reports Summary Row: Total Reports only (TRACKING / DISPATCH ID removed)
  const summaryY = studentSectionBottomY - 44;

  // Total Reports Label
  page.drawText("TOTAL REPORTS / إجمالي التقارير:", {
    x: x + 14,
    y: summaryY + 24,
    size: 9,
    font,
    color: COLOR_DARK_GRAY,
  });

  const totalReportsStr = `${totalReports} ${Number(totalReports) === 1 ? "Report" : "Reports"}`;
  page.drawText(totalReportsStr, {
    x: x + 14,
    y: summaryY + 4,
    size: 16,
    font,
    color: COLOR_BLACK,
  });

  // Clean Divider Line
  page.drawLine({
    start: { x: x + 10, y: summaryY - 8 },
    end: { x: x + width - 10, y: summaryY - 8 },
    thickness: 0.8,
    color: COLOR_LIGHT_GRAY,
  });

  // 5. Enclosed Score Reports List (Simple, Clear, Large Font)
  const listY = summaryY - 32;

  page.drawText("ENCLOSED SCORE REPORTS:", {
    x: x + 14,
    y: listY,
    size: 9.5,
    font,
    color: COLOR_BLACK,
  });

  // Normalize any Arabic month to standard English session name to prevent RTL bidi flip
  const normalizedRaw = normalizeReportItem(rawReportsList);
  const reportsParts = normalizedRaw
    .split(/[;؛,]|\s+و\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (reportsParts.length > 1) {
    let curItemY = listY - 22;
    for (let r = 0; r < Math.min(4, reportsParts.length); r++) {
      const itemText = `• ${reportsParts[r]}`;
      page.drawText(itemText, {
        x: x + 16,
        y: curItemY,
        size: 13,
        font,
        color: COLOR_BLACK,
      });
      curItemY -= 20;
    }
  } else {
    page.drawText(normalizedRaw, {
      x: x + 16,
      y: listY - 22,
      size: 14,
      font,
      color: COLOR_BLACK,
    });
  }

  // 6. Clean bottom: Footer removed completely (No barcode, no dispatch id, no official dispatch seal)
}
