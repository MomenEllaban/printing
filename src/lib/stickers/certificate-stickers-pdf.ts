import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";
import { reshapeArabic } from "./arabic-reshaper";

export interface CertificateStudentData {
  id?: string;
  serialNumber?: string | number; // e.g. "128"
  studentName: string; // e.g. "يارا رمضان يوسف ابو الخير"
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

const COLOR_CHARCOAL = rgb(0.12, 0.14, 0.18); // Dark charcoal gray header background (#1E242E)
const COLOR_CHARCOAL_DARK = rgb(0.08, 0.09, 0.12);
const COLOR_GOLD = rgb(0.96, 0.72, 0.10); // Yellow/gold accent (#F5B71A)
const COLOR_GOLD_LIGHT = rgb(0.99, 0.95, 0.82);
const COLOR_EMERALD = rgb(0.06, 0.48, 0.32);
const COLOR_EMERALD_SOFT = rgb(0.93, 0.98, 0.95);
const COLOR_MUTED = rgb(0.45, 0.48, 0.52);
const COLOR_LIGHT_BG = rgb(0.96, 0.97, 0.98);
const COLOR_BORDER = rgb(0.82, 0.85, 0.88);
const COLOR_WHITE = rgb(1, 1, 1);

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
    if (fs.existsSync(fp)) {
      try {
        const fontBytes = fs.readFileSync(fp);
        return await pdfDoc.embedFont(fontBytes, { subset: true });
      } catch {}
    }
  }

  return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
}

/**
 * Generates Quarter-A4 Student Certificate / Score Report Stickers PDF.
 * Arranges 4 stickers per A4 Landscape sheet in a 2x2 grid (~140mm x 97mm each).
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
  const margin = 16;
  const gapX = 14;
  const gapY = 14;
  const stickerW = (a4W - margin * 2 - gapX) / 2; // ~397.9 pt (~140.4 mm)
  const stickerH = (a4H - margin * 2 - gapY) / 2; // ~274.6 pt (~96.9 mm)

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

      drawSingleCertificateSticker({
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

function drawSingleCertificateSticker(params: {
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
  const { page, font, logoImg, student, globalOptions, x, y, width, height, stickerIndex, totalStickers } = params;

  const serial = student.serialNumber || stickerIndex;
  const studentName = student.studentName || "Student Candidate";
  const totalReports = student.totalReports || 1;
  const reportsList = student.reportsList || "Official EST Score Report";
  const batchName = student.batchName || globalOptions.batchName || "Official Report Batch";

  // 1. Outer Frame (Quarter A4 Card)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  // Inner border line for aesthetic polish
  page.drawRectangle({
    x: x + 3.5,
    y: y + 3.5,
    width: width - 7,
    height: height - 7,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  // 2. Header Bar: Dark Charcoal Gray Background with Gold Accents
  const headerH = 44;
  const headerY = y + height - headerH - 5;

  page.drawRectangle({
    x: x + 5,
    y: headerY,
    width: width - 10,
    height: headerH,
    color: COLOR_CHARCOAL,
  });

  // Top Yellow Accent Line
  page.drawRectangle({
    x: x + 5,
    y: headerY + headerH - 3,
    width: width - 10,
    height: 3,
    color: COLOR_GOLD,
  });

  // EST Logo on Header
  const logoH = 28;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = x + 12;
  const logoY = headerY + (headerH - logoH) / 2 - 1;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  // Yellow "EST" text emblem next to logo
  const titleX = logoImg ? logoX + logoW + 8 : x + 14;

  page.drawText("EST", {
    x: titleX,
    y: headerY + 22,
    size: 13,
    font,
    color: COLOR_GOLD,
  });

  page.drawText("SCORE REPORT & CERTIFICATE PLACARD", {
    x: titleX + 32,
    y: headerY + 23,
    size: 8.5,
    font,
    color: COLOR_WHITE,
  });

  // Batch Name on Header (truncated if long)
  const displayBatch = batchName.length > 44 ? batchName.slice(0, 42) + "..." : batchName;
  page.drawText(displayBatch.toUpperCase(), {
    x: titleX,
    y: headerY + 9,
    size: 7,
    font,
    color: COLOR_GOLD,
  });

  // Index Badge at Top Right: (e.g. 1 / 150)
  const badgeText = `${stickerIndex} / ${totalStickers}`;
  const badgeW = 60;
  const badgeH = 18;
  const badgeX = x + width - badgeW - 12;
  const badgeY = headerY + (headerH - badgeH) / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: COLOR_CHARCOAL_DARK,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  const bTextW = font.widthOfTextAtSize(badgeText, 7.5);
  page.drawText(badgeText, {
    x: badgeX + (badgeW - bTextW) / 2,
    y: badgeY + 5,
    size: 7.5,
    font,
    color: COLOR_GOLD,
  });

  // 3. Serial Number & Student Name Row
  const nameRowH = 52;
  const nameRowY = headerY - 6 - nameRowH;

  // Serial Number Badge on Left: Large #128 or (128)
  const serialBoxW = 72;
  page.drawRectangle({
    x: x + 8,
    y: nameRowY,
    width: serialBoxW,
    height: nameRowH,
    color: COLOR_CHARCOAL,
    borderColor: COLOR_GOLD,
    borderWidth: 1.5,
  });

  // Serial label
  page.drawText("SERIAL NO.", {
    x: x + 16,
    y: nameRowY + nameRowH - 14,
    size: 6.5,
    font,
    color: COLOR_GOLD,
  });

  // Prominent Serial Number: e.g. "128" or "(128)"
  const serialStr = String(serial).startsWith("(") ? String(serial) : `(${serial})`;
  const serialFontSize = serialStr.length > 5 ? 14 : 17;
  const sW = font.widthOfTextAtSize(serialStr, serialFontSize);
  page.drawText(serialStr, {
    x: x + 8 + (serialBoxW - sW) / 2,
    y: nameRowY + 11,
    size: serialFontSize,
    font,
    color: COLOR_GOLD,
  });

  // Candidate Name Box (Takes rest of width)
  const nameBoxX = x + 8 + serialBoxW + 6;
  const nameBoxW = width - 16 - serialBoxW - 6;

  page.drawRectangle({
    x: nameBoxX,
    y: nameRowY,
    width: nameBoxW,
    height: nameRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Candidate Name Label in English & Arabic
  const labelText = reshapeArabic("اسم الطالبة / الطالب (Candidate Name):");
  page.drawText(labelText, {
    x: nameBoxX + 10,
    y: nameRowY + nameRowH - 14,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });

  // Reshaped Arabic Student Name (e.g. يارا رمضان يوسف ابو الخير)
  const shapedStudentName = reshapeArabic(studentName);
  const nameLen = studentName.length;
  const nameFontSize = nameLen > 35 ? 12 : nameLen > 24 ? 14 : 16;

  page.drawText(shapedStudentName, {
    x: nameBoxX + 10,
    y: nameRowY + 10,
    size: nameFontSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 4. Reports Summary Row: Total Reports + Certificate Code / Seat No
  const summaryRowH = 34;
  const summaryRowY = nameRowY - 6 - summaryRowH;

  // Total Reports Box (Yellow/Gold Highlight!)
  const totalBoxW = (width - 16 - 8) * 0.45;
  page.drawRectangle({
    x: x + 8,
    y: summaryRowY,
    width: totalBoxW,
    height: summaryRowH,
    color: COLOR_GOLD_LIGHT,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });

  const totalLabel = reshapeArabic("إجمالي التقارير (Total Reports):");
  page.drawText(totalLabel, {
    x: x + 14,
    y: summaryRowY + summaryRowH - 13,
    size: 7,
    font,
    color: rgb(0.55, 0.40, 0.05),
  });

  const totalCountText = `${totalReports} ${Number(totalReports) === 1 ? "Report" : "Reports"}`;
  page.drawText(totalCountText, {
    x: x + 14,
    y: summaryRowY + 7,
    size: 11,
    font,
    color: COLOR_CHARCOAL,
  });

  // Secondary Box: Certificate Code / Tracking
  const trackBoxX = x + 8 + totalBoxW + 8;
  const trackBoxW = width - 16 - totalBoxW - 8;

  page.drawRectangle({
    x: trackBoxX,
    y: summaryRowY,
    width: trackBoxW,
    height: summaryRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  page.drawText("CERTIFICATE CODE / DISPATCH ID:", {
    x: trackBoxX + 10,
    y: summaryRowY + summaryRowH - 13,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  const certCode = student.certificateCode || (student.seatNumber ? `EST-${student.seatNumber}` : `EST-REP-${String(serial).padStart(4, "0")}`);
  page.drawText(certCode, {
    x: trackBoxX + 10,
    y: summaryRowY + 7,
    size: 10.5,
    font,
    color: COLOR_EMERALD,
  });

  // 5. Reports List Box (قائمة التقارير)
  const listH = 68;
  const listY = summaryRowY - 6 - listH;

  page.drawRectangle({
    x: x + 8,
    y: listY,
    width: width - 16,
    height: listH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Header of Reports List
  page.drawRectangle({
    x: x + 8,
    y: listY + listH - 18,
    width: width - 16,
    height: 18,
    color: COLOR_CHARCOAL,
  });

  const listHeaderArabic = reshapeArabic("قائمة التقارير المرفقة (Reports List):");
  page.drawText(listHeaderArabic, {
    x: x + 14,
    y: listY + listH - 13,
    size: 7.5,
    font,
    color: COLOR_GOLD,
  });

  // Content of Reports List: e.g. "يناير 2026 - EST I، ومارس 2026 - EST II"
  const shapedReportsList = reshapeArabic(reportsList);

  // If reportsList contains comma or slash, or multiple items, split across two lines if needed
  if (reportsList.includes("،") || reportsList.includes(",") || reportsList.length > 40) {
    const parts = reportsList.split(/[،,]/);
    if (parts.length >= 2) {
      const line1 = reshapeArabic(`• ${parts[0].trim()}`);
      const line2 = reshapeArabic(`• ${parts.slice(1).join("، ").trim()}`);
      page.drawText(line1, {
        x: x + 14,
        y: listY + 28,
        size: 9.5,
        font,
        color: COLOR_CHARCOAL,
      });
      page.drawText(line2, {
        x: x + 14,
        y: listY + 11,
        size: 9.5,
        font,
        color: COLOR_CHARCOAL,
      });
    } else {
      page.drawText(shapedReportsList, {
        x: x + 14,
        y: listY + 20,
        size: 10,
        font,
        color: COLOR_CHARCOAL,
      });
    }
  } else {
    page.drawText(shapedReportsList, {
      x: x + 14,
      y: listY + 20,
      size: 10.5,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // 6. Footer: Barcode + Official Verification Stamp
  const footerY = y + 7;

  // Simulated Barcode
  const barcodeX = x + 12;
  const barcodeY = footerY;
  const barcodeBars = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 2];
  let curBX = barcodeX;
  for (let b = 0; b < barcodeBars.length; b++) {
    const bw = barcodeBars[b] * 0.9;
    if (b % 2 === 0) {
      page.drawRectangle({
        x: curBX,
        y: barcodeY,
        width: bw,
        height: 12,
        color: COLOR_CHARCOAL,
      });
    }
    curBX += bw + 0.8;
  }

  // Footer Dispatch Text
  page.drawText(`VERIFIED SECURE DISPATCH • ${certCode}`, {
    x: curBX + 8,
    y: barcodeY + 3,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  // Official Seal Badge
  const sealText = "EST OFFICIAL SEAL";
  const sealW = font.widthOfTextAtSize(sealText, 6.5);
  page.drawText(sealText, {
    x: x + width - sealW - 14,
    y: barcodeY + 3,
    size: 6.5,
    font,
    color: COLOR_GOLD,
  });
}
