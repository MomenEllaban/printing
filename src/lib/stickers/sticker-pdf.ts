import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildStickerContent, type StickerContent } from "./sticker-content";

export interface StickerPdfOptions {
  lines?: string[];
  content?: StickerContent;
  widthMm?: number;
  heightMm?: number;
  paperMode?: "custom" | "a4";
  orientation?: "portrait" | "landscape";
}

const MM_TO_PT = 2.83464567;
const DEFAULT_WIDTH_MM = 100;
const DEFAULT_HEIGHT_MM = 50;

// Color Palette
const COLOR_CHARCOAL = rgb(0.12, 0.12, 0.12);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_GOLD = rgb(0.85, 0.70, 0.08); // EST yellow/gold accent
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97);
const COLOR_BORDER = rgb(0.84, 0.84, 0.84);
const COLOR_WHITE = rgb(1, 1, 1);

/**
 * Generates an official, print-ready EST Exam Placard / Sticker PDF:
 * - Features the official EST Logo (JPEG) at the top of every sticker.
 * - Labeled fields: Center, Building, Floor, Room, Governorate.
 * - Optimized for full A4 paper (Landscape/Portrait) for maximum clarity from a distance.
 * - Also supports compact custom sticker sizes (e.g. 100mm x 50mm).
 */
export async function generateStickerPdf(options: StickerPdfOptions): Promise<Uint8Array> {
  const content = options.content ?? (options.lines ? buildStickerContent(options.lines) : null);
  if (!content) {
    throw new Error("Cannot generate sticker PDF with no text lines or content");
  }

  const paperMode = options.paperMode ?? "a4";
  const orientation = options.orientation ?? (paperMode === "a4" ? "landscape" : "portrait");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load custom font supporting both English and Arabic (Arial-Bold.ttf)
  let font: any;
  const fontPath = path.join(process.cwd(), "src", "assets", "fonts", "Arial-Bold.ttf");
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    font = await pdfDoc.embedFont(fontBytes, { subset: true });
  } else {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Load logo image
  let logoImg: any = null;
  const logoPaths = [
    path.join(process.cwd(), "src", "assets", "images", "est-logo.jpg"),
    path.join(process.cwd(), "public", "est-logo.jpg"),
  ];
  for (const p of logoPaths) {
    if (fs.existsSync(p)) {
      try {
        const logoBytes = fs.readFileSync(p);
        logoImg = await pdfDoc.embedJpg(logoBytes);
        break;
      } catch {
        // continue
      }
    }
  }

  if (paperMode === "a4") {
    // Generate full A4 placard
    return renderA4Placard({
      pdfDoc,
      font,
      logoImg,
      content,
      orientation,
    });
  } else {
    // Generate compact custom sticker
    const widthMm = Math.max(30, Math.min(300, options.widthMm ?? DEFAULT_WIDTH_MM));
    const heightMm = Math.max(20, Math.min(200, options.heightMm ?? DEFAULT_HEIGHT_MM));
    return renderCustomLabel({
      pdfDoc,
      font,
      logoImg,
      content,
      widthMm,
      heightMm,
    });
  }
}

/**
 * Renders a full-page A4 Exam Placard with the EST Logo, labeled fields, and massive Room number.
 */
async function renderA4Placard(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  content: StickerContent;
  orientation: "portrait" | "landscape";
}): Promise<Uint8Array> {
  const { pdfDoc, font, logoImg, content, orientation } = params;

  // A4 dimensions in points: 210mm x 297mm = 595.28 x 841.89 pt
  const isLandscape = orientation === "landscape";
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Outer framing rectangle
  const margin = 24;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: pageWidth - margin * 2,
    height: pageHeight - margin * 2,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2.5,
  });

  // Inner gold accent line
  const innerMargin = 28;
  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: pageWidth - innerMargin * 2,
    height: pageHeight - innerMargin * 2,
    borderColor: COLOR_GOLD,
    borderWidth: 1,
  });

  // --- HEADER SECTION ---
  let headerBottomY = pageHeight - margin - 20;

  if (logoImg) {
    const logoHeight = isLandscape ? 68 : 78;
    const logoWidth = logoHeight * (logoImg.width / logoImg.height);
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = pageHeight - margin - 15 - logoHeight;

    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
    headerBottomY = logoY - 8;
  } else {
    // Text fallback for logo
    const estText = "EST";
    const estSize = isLandscape ? 36 : 42;
    const estWidth = font.widthOfTextAtSize(estText, estSize);
    page.drawText(estText, {
      x: (pageWidth - estWidth) / 2,
      y: pageHeight - margin - 45,
      size: estSize,
      font,
      color: COLOR_GOLD,
    });
    headerBottomY = pageHeight - margin - 60;
  }

  // Exam Subtitle Badge
  const examTitle = `${content.examName || "EST 1"} — OFFICIAL EXAMINATION`;
  const examSize = isLandscape ? 13 : 14;
  const examWidth = font.widthOfTextAtSize(examTitle, examSize);
  page.drawText(examTitle, {
    x: (pageWidth - examWidth) / 2,
    y: headerBottomY - 14,
    size: examSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Gold Divider Line
  const dividerY = headerBottomY - 24;
  page.drawLine({
    start: { x: margin + 30, y: dividerY },
    end: { x: pageWidth - margin - 30, y: dividerY },
    thickness: 1.5,
    color: COLOR_GOLD,
  });

  // --- BODY SECTION ---
  const bodyTop = dividerY - 18;
  const bodyBottom = margin + 20;
  const availBodyHeight = bodyTop - bodyBottom;
  const bodyWidth = pageWidth - margin * 2 - 36;
  const bodyStartX = margin + 18;

  // Determine which level is the hero
  const isRoom = content.level === "room" && Boolean(content.room);
  const isFloor = content.level === "floor" && Boolean(content.floor);
  const isBuilding = content.level === "building" && Boolean(content.building);
  const isCenter = content.level === "center" && Boolean(content.center);
  const isGov = content.level === "governorate" && Boolean(content.governorate);
  const isRoot = content.level === "root";

  if (isRoom) {
    // Top: Summary cards for Governorate, Center, Building, Floor
    // Bottom: Massive hero Room box
    const heroBoxHeight = Math.min(220, availBodyHeight * 0.55);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    // 4 Summary Cards (2 rows x 2 cols in landscape, or 4 rows in portrait)
    const cards = [
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
      { label: "Building", labelAr: "المبنى", value: content.building || "—" },
      { label: "Floor", labelAr: "الدور", value: content.floor || "—" },
    ];

    if (isLandscape) {
      const colWidth = (bodyWidth - 16) / 2;
      const rowHeight = (summaryHeight - 10) / 2;

      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = bodyStartX + col * (colWidth + 16);
        const cardY = summaryY + (1 - row) * (rowHeight + 10);

        renderSummaryCard({
          page,
          font,
          x: cardX,
          y: cardY,
          width: colWidth,
          height: rowHeight,
          label: cards[i].label,
          labelAr: cards[i].labelAr,
          value: cards[i].value,
        });
      }
    } else {
      // Portrait: 4 stacked cards
      const rowHeight = (summaryHeight - 24) / 4;
      for (let i = 0; i < 4; i++) {
        const cardY = summaryY + (3 - i) * (rowHeight + 8);
        renderSummaryCard({
          page,
          font,
          x: bodyStartX,
          y: cardY,
          width: bodyWidth,
          height: rowHeight,
          label: cards[i].label,
          labelAr: cards[i].labelAr,
          value: cards[i].value,
        });
      }
    }

    // Hero Room Box
    const heroY = bodyBottom;
    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: heroY,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "EXAMINATION ROOM",
      badgeTextAr: "القاعة / الغرفة",
      valueText: content.room || "—",
      accentColor: COLOR_GOLD,
    });
  } else if (isFloor) {
    const heroBoxHeight = Math.min(220, availBodyHeight * 0.55);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
      { label: "Building", labelAr: "المبنى", value: content.building || "—" },
    ];

    const colWidth = (bodyWidth - 24) / 3;
    for (let i = 0; i < 3; i++) {
      const cardX = bodyStartX + i * (colWidth + 12);
      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: summaryY,
        width: colWidth,
        height: summaryHeight,
        label: cards[i].label,
        labelAr: cards[i].labelAr,
        value: cards[i].value,
      });
    }

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "EXAMINATION FLOOR",
      badgeTextAr: "الدور",
      valueText: content.floor || "—",
      accentColor: COLOR_GOLD,
    });
  } else if (isBuilding) {
    const heroBoxHeight = Math.min(240, availBodyHeight * 0.6);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
    ];

    const colWidth = (bodyWidth - 16) / 2;
    for (let i = 0; i < 2; i++) {
      const cardX = bodyStartX + i * (colWidth + 16);
      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: summaryY,
        width: colWidth,
        height: summaryHeight,
        label: cards[i].label,
        labelAr: cards[i].labelAr,
        value: cards[i].value,
      });
    }

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "BUILDING",
      badgeTextAr: "المبنى",
      valueText: content.building || "—",
      accentColor: COLOR_GOLD,
    });
  } else if (isCenter) {
    const heroBoxHeight = Math.min(260, availBodyHeight * 0.65);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    renderSummaryCard({
      page,
      font,
      x: bodyStartX,
      y: summaryY,
      width: bodyWidth,
      height: summaryHeight,
      label: "Governorate",
      labelAr: "المحافظة",
      value: content.governorate || "—",
    });

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "TEST CENTER",
      badgeTextAr: "مركز الاختبار",
      valueText: content.center || "—",
      accentColor: COLOR_GOLD,
    });
  } else if (isGov) {
    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom + (availBodyHeight - 240) / 2,
      width: bodyWidth,
      height: 240,
      badgeText: "GOVERNORATE",
      badgeTextAr: "المحافظة",
      valueText: content.governorate || "—",
      accentColor: COLOR_GOLD,
    });
  } else {
    // Root exam level
    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom + (availBodyHeight - 240) / 2,
      width: bodyWidth,
      height: 240,
      badgeText: "OFFICIAL EXAMINATION",
      badgeTextAr: "الاختبار",
      valueText: content.examName || "EST 1",
      accentColor: COLOR_GOLD,
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper to render a summary information card (Center, Floor, Building, Governorate).
 */
function renderSummaryCard(params: {
  page: any;
  font: any;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  labelAr: string;
  value: string;
}) {
  const { page, font, x, y, width, height, label, labelAr, value } = params;

  // Background
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Label
  const labelText = `${label.toUpperCase()} :`;
  const labelSize = Math.max(10, Math.min(13, height * 0.22));
  page.drawText(labelText, {
    x: x + 14,
    y: y + height - labelSize - 12,
    size: labelSize,
    font,
    color: COLOR_MUTED,
  });

  // Value - Auto-scale
  const availValWidth = width - 28;
  let valSize = Math.max(13, Math.min(22, height * 0.38));
  let valWidth = font.widthOfTextAtSize(value, valSize);
  if (valWidth > availValWidth) {
    valSize = Math.max(10, (availValWidth / valWidth) * valSize);
  }

  page.drawText(value, {
    x: x + 14,
    y: y + 14,
    size: valSize,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Helper to render the large hero badge (e.g. ROOM 204).
 */
function renderHeroCard(params: {
  page: any;
  font: any;
  x: number;
  y: number;
  width: number;
  height: number;
  badgeText: string;
  badgeTextAr: string;
  valueText: string;
  accentColor: any;
}) {
  const { page, font, x, y, width, height, badgeText, valueText, accentColor } = params;

  // Outer border with accent
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  // Top header banner in hero box
  const bannerHeight = Math.max(34, height * 0.22);
  const bannerY = y + height - bannerHeight;
  page.drawRectangle({
    x: x + 2,
    y: bannerY,
    width: width - 4,
    height: bannerHeight - 2,
    color: rgb(0.12, 0.12, 0.12),
  });

  // Gold accent line under banner
  page.drawLine({
    start: { x: x + 2, y: bannerY },
    end: { x: x + width - 2, y: bannerY },
    thickness: 2,
    color: accentColor,
  });

  // Header text
  const badgeTitle = badgeText.toUpperCase();
  const titleSize = Math.max(12, Math.min(16, bannerHeight * 0.5));
  const titleWidth = font.widthOfTextAtSize(badgeTitle, titleSize);
  page.drawText(badgeTitle, {
    x: x + (width - titleWidth) / 2,
    y: bannerY + (bannerHeight - titleSize) / 2 - 2,
    size: titleSize,
    font,
    color: accentColor,
  });

  // Giant Value (e.g. 204 or Pharmacy)
  const availValueHeight = bannerY - y - 20;
  const availValueWidth = width - 40;
  let valueSize = Math.max(28, Math.min(92, availValueHeight * 0.72));
  let valWidth = font.widthOfTextAtSize(valueText, valueSize);

  if (valWidth > availValueWidth) {
    valueSize = Math.max(22, (availValueWidth / valWidth) * valueSize);
    valWidth = font.widthOfTextAtSize(valueText, valueSize);
  }

  const valX = x + (width - valWidth) / 2;
  const valY = y + (availValueHeight - valueSize) / 2 + 6;

  page.drawText(valueText, {
    x: valX,
    y: valY,
    size: valueSize,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Compact custom label rendering (e.g. 100mm x 50mm).
 */
async function renderCustomLabel(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  content: StickerContent;
  widthMm: number;
  heightMm: number;
}): Promise<Uint8Array> {
  const { pdfDoc, font, logoImg, content, widthMm, heightMm } = params;

  const stickerWidthPt = widthMm * MM_TO_PT;
  const stickerHeightPt = heightMm * MM_TO_PT;

  const page = pdfDoc.addPage([stickerWidthPt, stickerHeightPt]);

  const paddingX = 14;
  const paddingY = 10;
  const availWidth = stickerWidthPt - paddingX * 2;
  const availHeight = stickerHeightPt - paddingY * 2;

  let currentY = stickerHeightPt - paddingY;

  // Header: Logo if present
  if (logoImg) {
    const logoHeight = Math.min(26, stickerHeightPt * 0.22);
    const logoWidth = logoHeight * (logoImg.width / logoImg.height);
    page.drawImage(logoImg, {
      x: paddingX,
      y: currentY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });

    const examTitle = content.examName || "EST";
    const examSize = Math.min(13, logoHeight * 0.65);
    page.drawText(examTitle, {
      x: paddingX + logoWidth + 8,
      y: currentY - logoHeight + 6,
      size: examSize,
      font,
      color: COLOR_CHARCOAL,
    });

    currentY -= logoHeight + 6;
  } else {
    page.drawText(content.examName || "EST", {
      x: paddingX,
      y: currentY - 16,
      size: 16,
      font,
      color: COLOR_GOLD,
    });
    currentY -= 22;
  }

  // Divider
  page.drawLine({
    start: { x: paddingX, y: currentY },
    end: { x: stickerWidthPt - paddingX, y: currentY },
    thickness: 1,
    color: COLOR_GOLD,
  });
  currentY -= 8;

  // Lines to draw with labels
  const displayItems = content.fields.map((f) => `${f.label} : ${f.value}`);
  if (displayItems.length === 0) {
    displayItems.push(content.examName || "EST");
  }

  const remainingHeight = currentY - paddingY;
  const lineSpacing = 3;
  const rawLineHeight = (remainingHeight - (displayItems.length - 1) * lineSpacing) / displayItems.length;
  const baseSize = Math.max(7, Math.min(15, rawLineHeight));

  for (const text of displayItems) {
    let size = baseSize;
    let width = font.widthOfTextAtSize(text, size);
    if (width > availWidth) {
      size = Math.max(6, (availWidth / width) * size);
    }

    page.drawText(text, {
      x: paddingX,
      y: currentY - size,
      size,
      font,
      color: COLOR_CHARCOAL,
    });
    currentY -= size + lineSpacing;
  }

  return await pdfDoc.save();
}
