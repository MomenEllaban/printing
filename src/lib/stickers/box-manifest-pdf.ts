import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";
import { formatArabicForPdf } from "./arabic-shaper";
import type { CertificateStudentData } from "./certificate-stickers-pdf";

export interface BoxManifestPdfOptions {
  batchName?: string;
  boxNumber?: number;
  boxLabel?: string;
  fromRow?: number;
  toRow?: number;
  totalStudentsInBatch?: number;
  students: CertificateStudentData[];
  orientation?: "portrait" | "landscape";
  isAramex?: boolean;
}

// 100% Black & White / Grayscale Crisp Palette
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_GRAY = rgb(0.2, 0.2, 0.2);
const COLOR_MUTED = rgb(0.4, 0.4, 0.4);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_ALT_ROW = rgb(0.96, 0.97, 0.98);
const COLOR_HEADER_BG = rgb(0.92, 0.93, 0.95);
const COLOR_WHITE = rgb(1, 1, 1);

const LOGO_JPEG_BYTES: Uint8Array = new Uint8Array(Buffer.from(EST_LOGO_BASE64, "base64"));

async function loadLogoImage(pdfDoc: PDFDocument): Promise<any> {
  try {
    return await pdfDoc.embedJpg(LOGO_JPEG_BYTES);
  } catch {
    try {
      const publicPath = path.join(process.cwd(), "public", "est-logo.jpg");
      if (fs.existsSync(publicPath)) {
        return await pdfDoc.embedJpg(fs.readFileSync(publicPath));
      }
    } catch {}
    return null;
  }
}

async function loadManifestFont(pdfDoc: PDFDocument): Promise<any> {
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

function truncateText(text: string, font: any, fontSize: number, maxWidth: number): string {
  if (!text) return "";
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const shaped = isArabic ? formatArabicForPdf(text) : text;
  if (font.widthOfTextAtSize(shaped, fontSize) <= maxWidth) {
    return shaped;
  }

  let truncated = text;
  while (truncated.length > 3) {
    truncated = truncated.slice(0, -1);
    const testStr = (isArabic ? formatArabicForPdf(truncated) : truncated) + "...";
    if (font.widthOfTextAtSize(testStr, fontSize) <= maxWidth) {
      return testStr;
    }
  }
  return shaped;
}

/**
 * Generates an executive Box Manifest (Packing List / كشف محتويات الكرتونة) PDF
 * for a slice of certificates (e.g. Rows 1 - 100, 101 - 200).
 */
export async function generateBoxManifestPdf(options: BoxManifestPdfOptions): Promise<Uint8Array> {
  const {
    students = [],
    batchName = "EST Certificates Batch",
    boxNumber,
    boxLabel,
    fromRow = 1,
    toRow = students.length,
    totalStudentsInBatch = students.length,
    orientation = "landscape",
    isAramex = false,
  } = options;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadManifestFont(pdfDoc);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const logoImg = await loadLogoImage(pdfDoc);

  const isLandscape = orientation === "landscape";
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;

  const margin = 24;
  const contentWidth = pageWidth - margin * 2;

  // Header & Footer dimensions
  const topHeaderHeight = 65;
  const tableHeaderHeight = 22;
  const rowHeight = 20.5;
  const bottomFooterHeight = 40;

  // Available height for table rows per page
  const availableTableHeight = pageHeight - margin * 2 - topHeaderHeight - tableHeaderHeight - bottomFooterHeight;
  const rowsPerPage = Math.max(10, Math.floor(availableTableHeight / rowHeight));

  const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));

  // Compute total certificates / reports in this box
  const totalReportsSum = students.reduce((sum, s) => {
    const n = Number(s.totalReports);
    return sum + (Number.isFinite(n) && n > 0 ? n : 1);
  }, 0);

  // Column definitions based on orientation
  interface ColDef {
    key: string;
    labelEn: string;
    labelAr: string;
    width: number;
    align: "left" | "center" | "right";
  }

  let columns: ColDef[];

  if (isLandscape) {
    if (isAramex) {
      columns = [
        { key: "index", labelEn: "#", labelAr: "#", width: 26, align: "center" },
        { key: "serial", labelEn: "NO.", labelAr: "الرقم", width: 44, align: "center" },
        { key: "nameEn", labelEn: "STUDENT NAME (ENGLISH)", labelAr: "اسم الطالب بالإنجليزي", width: 175, align: "left" },
        { key: "nameAr", labelEn: "STUDENT NAME (ARABIC)", labelAr: "اسم الطالب بالعربي", width: 140, align: "right" },
        { key: "city", labelEn: "GOV / CITY", labelAr: "المحافظة/المدينة", width: 85, align: "left" },
        { key: "phone", labelEn: "PHONE", labelAr: "الهاتف", width: 75, align: "center" },
        { key: "reportsCount", labelEn: "REPORTS", labelAr: "التقارير", width: 48, align: "center" },
        { key: "reportsList", labelEn: "MOE REPORT SESSIONS", labelAr: "بيان الشهادات والمحاولات", width: 165, align: "left" },
        { key: "check", labelEn: "CHECK", labelAr: "فحص", width: 35, align: "center" },
      ];
    } else {
      columns = [
        { key: "index", labelEn: "#", labelAr: "#", width: 30, align: "center" },
        { key: "serial", labelEn: "NO.", labelAr: "الرقم", width: 50, align: "center" },
        { key: "nameEn", labelEn: "STUDENT NAME (ENGLISH)", labelAr: "اسم الطالب بالإنجليزي", width: 220, align: "left" },
        { key: "nameAr", labelEn: "STUDENT NAME (ARABIC)", labelAr: "اسم الطالب بالعربي", width: 170, align: "right" },
        { key: "reportsCount", labelEn: "REPORTS", labelAr: "التقارير", width: 55, align: "center" },
        { key: "reportsList", labelEn: "MOE REPORT LIST / SESSIONS", labelAr: "بيان الشهادات والمحاولات المعتمدة", width: 228, align: "left" },
        { key: "check", labelEn: "CHECK", labelAr: "تأكيد", width: 40, align: "center" },
      ];
    }
  } else {
    // Portrait mode
    columns = [
      { key: "index", labelEn: "#", labelAr: "#", width: 24, align: "center" },
      { key: "serial", labelEn: "NO.", labelAr: "الرقم", width: 38, align: "center" },
      { key: "nameEn", labelEn: "STUDENT NAME", labelAr: "اسم الطالب", width: 155, align: "left" },
      { key: "nameAr", labelEn: "NAME (AR)", labelAr: "الاسم بالعربي", width: 115, align: "right" },
      { key: "reportsCount", labelEn: "REPORTS", labelAr: "العدد", width: 42, align: "center" },
      { key: "reportsList", labelEn: "MOE SESSIONS", labelAr: "المحاولات", width: 143, align: "left" },
      { key: "check", labelEn: "CHECK", labelAr: "فحص", width: 30, align: "center" },
    ];
  }

  // Scale columns so total width exactly equals contentWidth
  const totalDefWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const scale = contentWidth / totalDefWidth;
  columns.forEach((c) => {
    c.width = Math.round(c.width * scale * 10) / 10;
  });
  // Adjust last column rounding
  const scaledTotal = columns.reduce((sum, c) => sum + c.width, 0);
  columns[columns.length - 1].width += contentWidth - scaledTotal;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const startIndex = pageIdx * rowsPerPage;
    const pageStudents = students.slice(startIndex, startIndex + rowsPerPage);
    const isLastPage = pageIdx === totalPages - 1;

    // 1. Draw Outer Border
    page.drawRectangle({
      x: margin,
      y: margin,
      width: contentWidth,
      height: pageHeight - margin * 2,
      borderColor: COLOR_BLACK,
      borderWidth: 1.2,
      color: COLOR_WHITE,
    });

    let currentY = pageHeight - margin - 8;

    // 2. Top Header Section
    const logoHeight = 44;
    const logoWidth = logoImg ? logoHeight * (logoImg.width / logoImg.height) : 44;

    if (logoImg) {
      page.drawImage(logoImg, {
        x: margin + 10,
        y: currentY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    }

    // Title & Subtitle
    const titleX = margin + logoWidth + 18;
    const mainTitle = "EST CERTIFICATES & SCORE REPORTS — BOX PACKING MANIFEST";
    page.drawText(mainTitle, {
      x: titleX,
      y: currentY - 14,
      size: isLandscape ? 12.5 : 10.5,
      font,
      color: COLOR_BLACK,
    });

    const arabicSub = formatArabicForPdf("كشف محتويات كرتونة الشهادات والتقارير المعتمدة");
    page.drawText(arabicSub, {
      x: titleX,
      y: currentY - 28,
      size: 10,
      font,
      color: COLOR_DARK_GRAY,
    });

    // Box & Batch Metadata Banner
    const effectiveBoxTitle = boxLabel || (boxNumber ? `BOX #${boxNumber} (ROWS ${fromRow} - ${toRow})` : `ROWS ${fromRow} - ${toRow}`);
    const metaLine = `${effectiveBoxTitle}  •  ${batchName.toUpperCase()}  •  ${students.length} CANDIDATES (${totalReportsSum} TOTAL REPORTS)`;
    page.drawText(metaLine, {
      x: titleX,
      y: currentY - 42,
      size: isLandscape ? 8.5 : 7.5,
      font,
      color: COLOR_MUTED,
    });

    // Page indicator in top right
    const pageStr = `PAGE ${pageIdx + 1} OF ${totalPages}`;
    const pageStrW = font.widthOfTextAtSize(pageStr, 8.5);
    page.drawText(pageStr, {
      x: margin + contentWidth - pageStrW - 12,
      y: currentY - 14,
      size: 8.5,
      font,
      color: COLOR_BLACK,
    });

    // Date printed
    const now = new Date();
    const dateStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const dateStrW = fontRegular.widthOfTextAtSize(dateStr, 7.5);
    page.drawText(dateStr, {
      x: margin + contentWidth - dateStrW - 12,
      y: currentY - 28,
      size: 7.5,
      font: fontRegular,
      color: COLOR_MUTED,
    });

    currentY -= topHeaderHeight;

    // Header separator line
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + contentWidth, y: currentY },
      color: COLOR_BLACK,
      thickness: 1,
    });

    // 3. Table Header
    page.drawRectangle({
      x: margin,
      y: currentY - tableHeaderHeight,
      width: contentWidth,
      height: tableHeaderHeight,
      color: COLOR_HEADER_BG,
      borderColor: COLOR_BLACK,
      borderWidth: 0.8,
    });

    let colX = margin;
    for (const col of columns) {
      const text = col.labelEn;
      const textW = font.widthOfTextAtSize(text, 7.5);
      let tX = colX + 4;
      if (col.align === "center") {
        tX = colX + (col.width - textW) / 2;
      } else if (col.align === "right") {
        tX = colX + col.width - textW - 4;
      }

      page.drawText(text, {
        x: tX,
        y: currentY - tableHeaderHeight + 7,
        size: 7.5,
        font,
        color: COLOR_BLACK,
      });

      // Vertical line after column
      colX += col.width;
      if (colX < margin + contentWidth) {
        page.drawLine({
          start: { x: colX, y: currentY },
          end: { x: colX, y: currentY - tableHeaderHeight },
          color: COLOR_LIGHT_GRAY,
          thickness: 0.6,
        });
      }
    }

    currentY -= tableHeaderHeight;

    // 4. Table Rows
    for (let r = 0; r < pageStudents.length; r++) {
      const student = pageStudents[r];
      const globalIndex = fromRow + startIndex + r;
      const rowY = currentY - (r + 1) * rowHeight;
      const isAlt = r % 2 === 1;

      // Row background
      page.drawRectangle({
        x: margin,
        y: rowY,
        width: contentWidth,
        height: rowHeight,
        color: isAlt ? COLOR_ALT_ROW : COLOR_WHITE,
        borderColor: COLOR_LIGHT_GRAY,
        borderWidth: 0.5,
      });

      let cellX = margin;
      for (const col of columns) {
        let val = "";
        let isArabic = false;

        switch (col.key) {
          case "index":
            val = String(globalIndex);
            break;
          case "serial":
            val = student.serialNumber ? String(student.serialNumber) : String(globalIndex);
            break;
          case "nameEn":
            val = student.studentName || "";
            break;
          case "nameAr":
            val = student.studentNameAr || "";
            isArabic = Boolean(val);
            break;
          case "city":
            val = [student.governorate, student.city].filter(Boolean).join(" / ");
            break;
          case "phone":
            val = student.phone || student.phone2 || "";
            break;
          case "reportsCount":
            val = student.totalReports ? String(student.totalReports) : "1";
            break;
          case "reportsList":
            val = student.reportsList || "";
            break;
          case "check":
            val = ""; // square box drawn below
            break;
        }

        const maxCellTextWidth = col.width - 8;
        const fontSize = col.key === "nameEn" || col.key === "nameAr" ? 7.8 : col.key === "reportsList" ? 6.8 : 7.5;
        const hasArabic = isArabic || /[\u0600-\u06FF]/.test(val);
        const fontToUse = (hasArabic || col.key === "index" || col.key === "serial" || col.key === "reportsCount") ? font : fontRegular;

        if (col.key === "check") {
          // Draw neat square checkbox
          const boxSize = 8.5;
          const bX = cellX + (col.width - boxSize) / 2;
          const bY = rowY + (rowHeight - boxSize) / 2;
          page.drawRectangle({
            x: bX,
            y: bY,
            width: boxSize,
            height: boxSize,
            color: COLOR_WHITE,
            borderColor: COLOR_BLACK,
            borderWidth: 0.8,
          });
        } else if (val) {
          const displayStr = truncateText(val, fontToUse, fontSize, maxCellTextWidth);
          const strW = fontToUse.widthOfTextAtSize(displayStr, fontSize);
          let textX = cellX + 4;
          if (col.align === "center") {
            textX = cellX + (col.width - strW) / 2;
          } else if (col.align === "right") {
            textX = cellX + col.width - strW - 4;
          }

          page.drawText(displayStr, {
            x: textX,
            y: rowY + 6,
            size: fontSize,
            font: fontToUse,
            color: COLOR_BLACK,
          });
        }

        cellX += col.width;
        // Inner vertical cell border
        if (cellX < margin + contentWidth) {
          page.drawLine({
            start: { x: cellX, y: rowY },
            end: { x: cellX, y: rowY + rowHeight },
            color: COLOR_LIGHT_GRAY,
            thickness: 0.4,
          });
        }
      }
    }

    // 5. Bottom Footer (Summary on Last Page / Pagination on others)
    const footerY = margin + 8;
    if (isLastPage) {
      // Summary & verification signatures
      const summaryText = `TOTAL IN THIS BOX: ${students.length} CANDIDATES  •  ${totalReportsSum} TOTAL CERTIFICATE REPORTS`;
      page.drawText(summaryText, {
        x: margin + 10,
        y: footerY + 12,
        size: 8.5,
        font,
        color: COLOR_BLACK,
      });

      const signatureText = "PACKED & VERIFIED BY: _____________________________    DATE: ______ / ______ / 2026";
      page.drawText(signatureText, {
        x: margin + 10,
        y: footerY,
        size: 8,
        font,
        color: COLOR_DARK_GRAY,
      });

      const certStamp = "OFFICIAL EST ASSESSMENT CONFIDENTIAL DOSSIER";
      const certW = font.widthOfTextAtSize(certStamp, 7.5);
      page.drawText(certStamp, {
        x: margin + contentWidth - certW - 10,
        y: footerY + 6,
        size: 7.5,
        font,
        color: COLOR_MUTED,
      });
    } else {
      const contText = `CONTINUED ON NEXT PAGE... (SHOWING ROWS ${startIndex + 1} - ${startIndex + pageStudents.length} OF ${students.length})`;
      page.drawText(contText, {
        x: margin + 10,
        y: footerY + 6,
        size: 7.5,
        font,
        color: COLOR_MUTED,
      });

      const pageNumStr = `PAGE ${pageIdx + 1} / ${totalPages}`;
      const pageNumW = font.widthOfTextAtSize(pageNumStr, 8);
      page.drawText(pageNumStr, {
        x: margin + contentWidth - pageNumW - 10,
        y: footerY + 6,
        size: 8,
        font,
        color: COLOR_BLACK,
      });
    }
  }

  return await pdfDoc.save();
}

