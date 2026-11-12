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
const COLOR_DARK_GRAY = rgb(0.28, 0.28, 0.28);
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
          reportsList: "يناير 2026 - EST I، ومارس 2026 - EST II",
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

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]/.test(text);
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
  const { page, font, student, globalOptions, x, y, width, height, stickerIndex, totalStickers } = params;

  const serial = student.serialNumber || stickerIndex;
  const studentName = (student.studentName || "Student Candidate").trim();
  const totalReports = student.totalReports || 1;
  const rawReportsList = (student.reportsList || "Official EST Score Report").trim();
  const batchName = (student.batchName || globalOptions.batchName || "Official Report Batch").trim();
  const certCode = student.certificateCode || (student.seatNumber ? `EST-${student.seatNumber}` : `EST-REP-${String(serial).padStart(4, "0")}`);

  // 1. Single Outer Border (Clean 1pt Black Frame for precise cutting)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 1.2,
  });

  // 2. Top Header: Solid Black Bar with Crisp White Typography
  const headerH = 38;
  const headerY = y + height - headerH - 4;

  page.drawRectangle({
    x: x + 4,
    y: headerY,
    width: width - 8,
    height: headerH,
    color: COLOR_BLACK,
  });

  // Left: EST Emblem Box
  page.drawRectangle({
    x: x + 8,
    y: headerY + 6,
    width: 38,
    height: 26,
    color: COLOR_WHITE,
  });

  page.drawText("EST", {
    x: x + 13,
    y: headerY + 12,
    size: 15,
    font,
    color: COLOR_BLACK,
  });

  // Header Title
  page.drawText("OFFICIAL SCORE REPORT & CERTIFICATE", {
    x: x + 52,
    y: headerY + 21,
    size: 9.5,
    font,
    color: COLOR_WHITE,
  });

  // Batch Name on Header
  const displayBatch = batchName.length > 50 ? batchName.slice(0, 48) + "..." : batchName;
  page.drawText(displayBatch.toUpperCase(), {
    x: x + 52,
    y: headerY + 8,
    size: 7.5,
    font,
    color: COLOR_WHITE,
  });

  // Right Index: (1 / 306)
  const badgeText = `${stickerIndex} / ${totalStickers}`;
  const badgeW = font.widthOfTextAtSize(badgeText, 8.5);
  page.drawText(badgeText, {
    x: x + width - badgeW - 14,
    y: headerY + 14,
    size: 8.5,
    font,
    color: COLOR_WHITE,
  });

  // 3. Serial Number & Student Name (Simple, Open, Large Font)
  const nameSectionY = headerY - 58;

  // Prominent Serial Number: e.g. "(128)" or "(1)"
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const serialFontSize = serialStr.length > 6 ? 20 : serialStr.length > 4 ? 24 : 28;

  page.drawText(serialStr, {
    x: x + 12,
    y: nameSectionY + 16,
    size: serialFontSize,
    font,
    color: COLOR_BLACK,
  });

  // Calculate X offset for Candidate Name after Serial Number
  const serialW = font.widthOfTextAtSize(serialStr, serialFontSize);
  const nameStartX = Math.max(x + 12 + serialW + 16, x + 85);

  // Label above Candidate Name
  const nameIsAr = isArabic(studentName);
  page.drawText(nameIsAr ? "اسم الطالب / الطالبة:" : "CANDIDATE NAME:", {
    x: nameStartX,
    y: nameSectionY + 44,
    size: 8.5,
    font,
    color: COLOR_DARK_GRAY,
  });

  // Candidate Name in HUGE FONT (20pt - 24pt bold)
  const maxNameWidth = width - (nameStartX - x) - 14;
  let nameSize = 22;
  while (nameSize > 12 && font.widthOfTextAtSize(studentName, nameSize) > maxNameWidth) {
    nameSize -= 1;
  }

  page.drawText(studentName, {
    x: nameStartX,
    y: nameSectionY + 16,
    size: nameSize,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line 1
  page.drawLine({
    start: { x: x + 10, y: nameSectionY + 6 },
    end: { x: x + width - 10, y: nameSectionY + 6 },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 4. Reports Summary Row: Total Reports & Tracking Code
  const summaryY = nameSectionY - 36;

  // Total Reports
  page.drawText("TOTAL REPORTS / إجمالي التقارير:", {
    x: x + 12,
    y: summaryY + 22,
    size: 8,
    font,
    color: COLOR_DARK_GRAY,
  });

  const totalReportsStr = `${totalReports} ${Number(totalReports) === 1 ? "Report" : "Reports"}`;
  page.drawText(totalReportsStr, {
    x: x + 12,
    y: summaryY + 4,
    size: 15,
    font,
    color: COLOR_BLACK,
  });

  // Tracking Code on Right
  const trackLabel = "TRACKING / DISPATCH ID:";
  page.drawText(trackLabel, {
    x: x + 200,
    y: summaryY + 22,
    size: 8,
    font,
    color: COLOR_DARK_GRAY,
  });

  page.drawText(certCode, {
    x: x + 200,
    y: summaryY + 4,
    size: 14,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line 2
  page.drawLine({
    start: { x: x + 10, y: summaryY - 4 },
    end: { x: x + width - 10, y: summaryY - 4 },
    thickness: 0.8,
    color: COLOR_LIGHT_GRAY,
  });

  // 5. Reports List (Simple, Clear, Large Font)
  const listY = summaryY - 68;

  page.drawText("REPORTS LIST / قائمة التقارير:", {
    x: x + 12,
    y: listY + 52,
    size: 8.5,
    font,
    color: COLOR_BLACK,
  });

  // Format list items
  const reportsParts = rawReportsList.split(/[;؛،,]/).map((p) => p.trim()).filter(Boolean);

  if (reportsParts.length > 1) {
    let curItemY = listY + 34;
    for (let r = 0; r < Math.min(3, reportsParts.length); r++) {
      const itemText = `• ${reportsParts[r]}`;
      page.drawText(itemText, {
        x: x + 14,
        y: curItemY,
        size: 11.5,
        font,
        color: COLOR_BLACK,
      });
      curItemY -= 16;
    }
  } else {
    page.drawText(rawReportsList, {
      x: x + 14,
      y: listY + 28,
      size: 13,
      font,
      color: COLOR_BLACK,
    });
  }

  // 6. Clean Footer: Crisp Barcode & Verification Tag
  const footerY = y + 8;

  // Barcode
  const barcodeX = x + 12;
  const barcodeBars = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 2];
  let curBX = barcodeX;
  for (let b = 0; b < barcodeBars.length; b++) {
    const bw = barcodeBars[b] * 0.9;
    if (b % 2 === 0) {
      page.drawRectangle({
        x: curBX,
        y: footerY,
        width: bw,
        height: 12,
        color: COLOR_BLACK,
      });
    }
    curBX += bw + 0.8;
  }

  page.drawText(`VERIFIED SECURE DISPATCH • ${certCode}`, {
    x: curBX + 10,
    y: footerY + 3,
    size: 7,
    font,
    color: COLOR_DARK_GRAY,
  });

  const sealText = "EST OFFICIAL DISPATCH SEAL";
  const sealW = font.widthOfTextAtSize(sealText, 7);
  page.drawText(sealText, {
    x: x + width - sealW - 14,
    y: footerY + 3,
    size: 7,
    font,
    color: COLOR_BLACK,
  });
}
