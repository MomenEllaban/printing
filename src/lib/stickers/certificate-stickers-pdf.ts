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
}

export interface CertificateStickersOptions {
  batchName?: string;
  sessionName?: string;
  examName?: string;
  students: CertificateStudentData[];
  layout?: "grid_4_per_a4" | "single_quarter_a4";
  orientation?: "portrait" | "landscape";
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

export function parseReportsList(raw: string): string[] {
  if (!raw) return [];
  const normalized = normalizeReportItem(raw);
  const parts = normalized
    .split(/[;؛،,\n\r•]|\s+و\s+/)
    .map((p) => p.replace(/^[-•*]\s*/, "").trim())
    .filter((p) => p.length > 0);
  return parts;
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
  const isLandscape = options.orientation === "landscape";
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

  const serial = student.serialNumber || stickerIndex;
  const studentName = (student.studentName || "Student Candidate").trim();
  const rawReportsList = (student.reportsList || "Official EST Score Report").trim();
  const reportsParts = parseReportsList(rawReportsList);

  // 1. Top Header: Enlarged Official EST Logo (Centered, clean, no outer border box)
  const logoH = width > 320 ? 38 : 35;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 56;
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
    const estSize = 24;
    const estW = font.widthOfTextAtSize(estText, estSize);
    page.drawText(estText, {
      x: x + (width - estW) / 2,
      y: logoY + 4,
      size: estSize,
      font,
      color: COLOR_BLACK,
    });
  }

  // Clean Divider Line below Header
  const headerDividerY = logoY - 7;
  page.drawLine({
    start: { x: x + 8, y: headerDividerY },
    end: { x: x + width - 8, y: headerDividerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 2. Serial Number & Student Name (English and/or Arabic name from Excel)
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const serialFontSize = width > 320
    ? (serialStr.length > 6 ? 20 : serialStr.length > 4 ? 23 : 26)
    : (serialStr.length > 5 ? 17 : 21);
  const serialW = font.widthOfTextAtSize(serialStr, serialFontSize);

  const serialX = x + 10;
  const nameStartX = Math.max(serialX + serialW + 8, width > 320 ? x + 72 : x + 48);
  const maxNameWidth = width - (nameStartX - x) - 8;

  const hasArabic = Boolean(student.studentNameAr && student.studentNameAr.trim());
  const hasEnglish = Boolean(studentName && studentName.trim() && studentName !== student.studentNameAr);

  const studentLabelY = headerDividerY - 14;
  const labelText = "STUDENT NAME:";
  page.drawText(labelText, {
    x: nameStartX,
    y: studentLabelY,
    size: 9,
    font,
    color: COLOR_DARK_GRAY,
  });

  let studentSectionBottomY = studentLabelY - 24;

  if (hasEnglish && hasArabic) {
    // Both English and Arabic names displayed cleanly stacked
    const primaryName = studentName;
    const arabicName = formatArabicForPdf(student.studentNameAr!.trim());

    let enSize = width > 320 ? 17.5 : 15.5;
    while (enSize > 8.5 && font.widthOfTextAtSize(primaryName, enSize) > maxNameWidth) {
      enSize -= 0.5;
    }
    const enY = studentLabelY - 18;
    page.drawText(primaryName, {
      x: nameStartX,
      y: enY,
      size: enSize,
      font,
      color: COLOR_BLACK,
    });

    let arSize = width > 320 ? 17 : 15;
    while (arSize > 8.5 && font.widthOfTextAtSize(arabicName, arSize) > maxNameWidth) {
      arSize -= 0.5;
    }
    const arY = enY - 20;
    page.drawText(arabicName, {
      x: nameStartX,
      y: arY,
      size: arSize,
      font,
      color: COLOR_BLACK,
    });

    studentSectionBottomY = arY;

    // Serial number vertically centered beside both name lines
    const serialCenterY = (enY + arY) / 2 - 2;
    page.drawText(serialStr, {
      x: serialX,
      y: serialCenterY,
      size: serialFontSize,
      font,
      color: COLOR_BLACK,
    });
  } else {
    // Single name (either English or Arabic)
    const rawName = studentName || student.studentNameAr || "Student Candidate";
    const displayName = /[\u0600-\u06FF]/.test(rawName) ? formatArabicForPdf(rawName) : rawName;
    let nameSize = width > 320 ? 21 : 18;
    while (nameSize > 9.5 && font.widthOfTextAtSize(displayName, nameSize) > maxNameWidth) {
      nameSize -= 0.5;
    }

    const nameBaselineY = studentLabelY - 20;
    page.drawText(displayName, {
      x: nameStartX,
      y: nameBaselineY,
      size: nameSize,
      font,
      color: COLOR_BLACK,
    });

    studentSectionBottomY = nameBaselineY;

    page.drawText(serialStr, {
      x: serialX,
      y: nameBaselineY,
      size: serialFontSize,
      font,
      color: COLOR_BLACK,
    });
  }

  // Divider Line below Student Section
  const studentDividerY = studentSectionBottomY - 10;
  page.drawLine({
    start: { x: x + 8, y: studentDividerY },
    end: { x: x + width - 8, y: studentDividerY },
    thickness: 1,
    color: COLOR_BLACK,
  });

  // 4. Reports Summary Row: TOTAL REPORTS (100% English, no Arabic text)
  const totalReportsNum = student.totalReports ? Number(student.totalReports) : reportsParts.length;
  const totalReportsCount = totalReportsNum > 0 ? totalReportsNum : Math.max(1, reportsParts.length);
  const totalReportsStr = `${totalReportsCount} ${totalReportsCount === 1 ? "Report" : "Reports"}`;

  const totalLabelY = studentDividerY - 13;
  page.drawText("TOTAL REPORTS:", {
    x: x + 12,
    y: totalLabelY,
    size: 9,
    font,
    color: COLOR_DARK_GRAY,
  });

  const totalValY = totalLabelY - 17;
  page.drawText(totalReportsStr, {
    x: x + 12,
    y: totalValY,
    size: 15,
    font,
    color: COLOR_BLACK,
  });

  // Divider Line below Total Reports
  const summaryDividerY = totalValY - 8;
  page.drawLine({
    start: { x: x + 8, y: summaryDividerY },
    end: { x: x + width - 8, y: summaryDividerY },
    thickness: 0.8,
    color: COLOR_LIGHT_GRAY,
  });

  // 5. Enclosed Score Reports List
  const listTitleY = summaryDividerY - 14;
  page.drawText("ENCLOSED SCORE REPORTS:", {
    x: x + 12,
    y: listTitleY,
    size: 9.5,
    font,
    color: COLOR_BLACK,
  });

  const reportsStartY = listTitleY - 16;
  const count = reportsParts.length;

  if (count === 0) {
    page.drawText("• Official EST Score Report", {
      x: x + 12,
      y: reportsStartY,
      size: 12,
      font,
      color: COLOR_BLACK,
    });
  } else if (count <= 6 || width < 320) {
    // 1 column with generous line spacing in portrait (width ~280pt, height ~403pt)
    const step = count <= 2 ? 24 : count <= 4 ? 20 : 17;
    const baseSize = count <= 2 ? 12.5 : count <= 4 ? 11.5 : 10.5;
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
        x: x + 12,
        y: itemY,
        size: itemSize,
        font,
        color: COLOR_BLACK,
      });
    }
  } else {
    // 2 columns for 7+ reports on wide layout
    const colWidth = (width - 40) / 2;
    const rows = Math.ceil(count / 2);
    const step = Math.min(18, Math.max(14, (reportsStartY - (y + 14)) / rows));
    const baseSize = 10.5;

    for (let r = 0; r < count; r++) {
      const colIdx = r < rows ? 0 : 1;
      const rowIdx = r < rows ? r : r - rows;
      const colX = colIdx === 0 ? x + 16 : x + 20 + colWidth;
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
