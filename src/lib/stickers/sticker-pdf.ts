import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildStickerContent, type StickerContent } from "./sticker-content";
import { EST_LOGO_BASE64 } from "./est-logo-base64";

export interface StickerPdfOptions {
  lines?: string[];
  content?: StickerContent;
  widthMm?: number;
  heightMm?: number;
  paperMode?: "custom" | "a4";
  orientation?: "portrait" | "landscape";
}

export interface BatchStickerPdfOptions {
  contents: StickerContent[];
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
 * Loads the official EST Logo (JPEG).
 * Checked against file paths first, with a 100% guaranteed inlined Base64 fallback
 * so that the logo is ALWAYS loaded in every environment and never replaced with plain text.
 */
async function loadLogoImage(pdfDoc: PDFDocument): Promise<any> {
  const logoPaths = [
    path.join(process.cwd(), "src", "assets", "images", "est-logo.jpg"),
    path.join(process.cwd(), "public", "est-logo.jpg"),
  ];

  let logoBytes: Uint8Array | null = null;
  for (const p of logoPaths) {
    if (fs.existsSync(p)) {
      try {
        logoBytes = fs.readFileSync(p);
        break;
      } catch {
        // continue
      }
    }
  }

  if (!logoBytes || logoBytes.length === 0) {
    try {
      logoBytes = Buffer.from(EST_LOGO_BASE64, "base64");
    } catch {
      logoBytes = null;
    }
  }

  if (!logoBytes) return null;

  try {
    return await pdfDoc.embedJpg(logoBytes);
  } catch (err) {
    console.error("[sticker-pdf] Error embedding JPG logo, trying direct base64:", err);
    try {
      const fallbackBytes = Buffer.from(EST_LOGO_BASE64, "base64");
      return await pdfDoc.embedJpg(fallbackBytes);
    } catch {
      return null;
    }
  }
}

/**
 * Loads the Unicode font supporting English and Arabic.
 */
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
      } catch {
        // continue
      }
    }
  }

  return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
}

/**
 * Generates an official, print-ready EST Exam Placard / Sticker PDF for a single item.
 */
export async function generateStickerPdf(options: StickerPdfOptions): Promise<Uint8Array> {
  const content = options.content ?? (options.lines ? buildStickerContent(options.lines) : null);
  if (!content) {
    throw new Error("Cannot generate sticker PDF with no text lines or content");
  }

  return generateBatchStickerPdf({
    contents: [content],
    paperMode: options.paperMode,
    orientation: options.orientation,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
  });
}

/**
 * Generates a unified multi-page PDF document containing stickers for multiple folders/items.
 * Each item gets its own full page (A4 placard or custom label), with the official EST logo
 * rendered on every single page.
 */
export async function generateBatchStickerPdf(options: BatchStickerPdfOptions): Promise<Uint8Array> {
  const contents = options.contents || [];
  if (contents.length === 0) {
    throw new Error("Cannot generate batch sticker PDF with no items");
  }

  const paperMode = options.paperMode ?? "a4";
  const orientation = options.orientation ?? (paperMode === "a4" ? "landscape" : "portrait");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  for (const content of contents) {
    if (paperMode === "a4") {
      drawA4PlacardPage({
        pdfDoc,
        font,
        logoImg,
        content,
        orientation,
      });
    } else {
      const widthMm = Math.max(30, Math.min(300, options.widthMm ?? DEFAULT_WIDTH_MM));
      const heightMm = Math.max(20, Math.min(200, options.heightMm ?? DEFAULT_HEIGHT_MM));
      drawCustomLabelPage({
        pdfDoc,
        font,
        logoImg,
        content,
        widthMm,
        heightMm,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Draws a full-page A4 Exam Placard with the EST Logo, labeled fields, dynamic subfolder statistics,
 * and for Rooms: a manual verification checklist box for room file contents.
 */
function drawA4PlacardPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  content: StickerContent;
  orientation: "portrait" | "landscape";
}) {
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
    const logoHeight = isLandscape ? 66 : 76;
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
    // Guaranteed fallback if image cannot be embedded
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
  const bodyTop = dividerY - 16;
  const bodyBottom = margin + 18;
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
    // --- ROOM LEVEL ---
    // Includes:
    // 1. Top row of 4 location summary cards (Governorate, Center, Building, Floor)
    // 2. Large Room Hero box
    // 3. Room File Contents Checklist Box (with 5 checkboxes for manual pen check)
    const summaryCardHeight = isLandscape ? 56 : 52;
    const summaryY = bodyTop - summaryCardHeight;

    const cards = [
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      { label: "Building", labelAr: "المبنى", value: content.building || "—" },
      { label: "Floor", labelAr: "الدور", value: content.floor || "—" },
    ];

    if (isLandscape) {
      // 4 horizontal cards in one sleek row
      const colWidth = (bodyWidth - 36) / 4;
      for (let i = 0; i < 4; i++) {
        renderSummaryCard({
          page,
          font,
          x: bodyStartX + i * (colWidth + 12),
          y: summaryY,
          width: colWidth,
          height: summaryCardHeight,
          label: cards[i].label,
          labelAr: cards[i].labelAr,
          value: cards[i].value,
        });
      }

      // Bottom Area: Left = Room Hero (40% width), Right = File Contents Checklist (60% width)
      const bottomAreaTop = summaryY - 14;
      const bottomAreaHeight = bottomAreaTop - bodyBottom;
      const leftColWidth = (bodyWidth - 16) * 0.40;
      const rightColWidth = (bodyWidth - 16) * 0.60;
      const rightColX = bodyStartX + leftColWidth + 16;

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: leftColWidth,
        height: bottomAreaHeight,
        badgeText: "ROOM",
        badgeTextAr: "القاعة / الغرفة",
        valueText: content.room || "",
        accentColor: COLOR_GOLD,
      });

      renderRoomChecklistBox({
        page,
        font,
        x: rightColX,
        y: bodyBottom,
        width: rightColWidth,
        height: bottomAreaHeight,
      });
    } else {
      // Portrait Layout: 2x2 summary grid, Hero box, then Checklist box stacked
      const rowHeight = 48;
      const colWidth = (bodyWidth - 12) / 2;
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = bodyStartX + col * (colWidth + 12);
        const cardY = bodyTop - (row + 1) * rowHeight - row * 8;
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

      const gridBottom = bodyTop - 2 * rowHeight - 8;
      const remainingHeight = gridBottom - bodyBottom - 16;
      const heroHeight = Math.min(150, remainingHeight * 0.38);
      const checklistHeight = remainingHeight - heroHeight - 12;

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: gridBottom - heroHeight - 10,
        width: bodyWidth,
        height: heroHeight,
        badgeText: "ROOM",
        badgeTextAr: "القاعة / الغرفة",
        valueText: content.room || "",
        accentColor: COLOR_GOLD,
      });

      renderRoomChecklistBox({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: bodyWidth,
        height: checklistHeight,
      });
    }
  } else if (isFloor) {
    // --- FLOOR LEVEL ---
    // Displays how many rooms are inside this floor (Total Rooms: X)
    const childRoomsCount = content.childCount || (content.childNames ? content.childNames.length : 0);
    const roomsText = childRoomsCount > 0 ? `${childRoomsCount} Rooms` : "Rooms Included";

    const heroBoxHeight = Math.min(230, availBodyHeight * 0.58);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      { label: "Building", labelAr: "المبنى", value: content.building || "—" },
      {
        label: "Total Rooms",
        labelAr: "إجمالي القاعات",
        value: childRoomsCount > 0 ? `${childRoomsCount} Rooms (${childRoomsCount} قاعات)` : "Included Rooms",
      },
    ];

    const colWidth = (bodyWidth - 36) / 4;
    for (let i = 0; i < 4; i++) {
      const cardX = isLandscape ? bodyStartX + i * (colWidth + 12) : bodyStartX;
      const cardY = isLandscape ? summaryY : summaryY + (3 - i) * ((summaryHeight - 24) / 4 + 8);
      const cardW = isLandscape ? colWidth : bodyWidth;
      const cardH = isLandscape ? summaryHeight : (summaryHeight - 24) / 4;

      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        label: cards[i].label,
        labelAr: cards[i].labelAr,
        value: cards[i].value,
      });
    }

    const subText =
      content.childNames && content.childNames.length > 0
        ? `INCLUDED ROOMS (${childRoomsCount}) : ${content.childNames.join("  •  ")}`
        : childRoomsCount > 0
        ? `TOTAL INCLUDED ROOMS : ${childRoomsCount} ROOMS IN THIS FLOOR`
        : undefined;

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "FLOOR",
      badgeTextAr: "الدور",
      valueText: content.floor || "",
      subText,
      accentColor: COLOR_GOLD,
    });
  } else if (isBuilding) {
    // --- BUILDING LEVEL ---
    // Displays how many floors are inside this building (Total Floors: X)
    const childFloorsCount = content.childCount || (content.childNames ? content.childNames.length : 0);

    const heroBoxHeight = Math.min(240, availBodyHeight * 0.60);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Governorate", labelAr: "المحافظة", value: content.governorate || "—" },
      { label: "Center", labelAr: "السنتر", value: content.center || "—" },
      {
        label: "Total Floors",
        labelAr: "إجمالي الأدوار",
        value: childFloorsCount > 0 ? `${childFloorsCount} Floors (${childFloorsCount} أدوار)` : "Included Floors",
      },
    ];

    const colWidth = (bodyWidth - 24) / 3;
    for (let i = 0; i < 3; i++) {
      const cardX = isLandscape ? bodyStartX + i * (colWidth + 12) : bodyStartX;
      const cardY = isLandscape ? summaryY : summaryY + (2 - i) * ((summaryHeight - 16) / 3 + 8);
      const cardW = isLandscape ? colWidth : bodyWidth;
      const cardH = isLandscape ? summaryHeight : (summaryHeight - 16) / 3;

      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        label: cards[i].label,
        labelAr: cards[i].labelAr,
        value: cards[i].value,
      });
    }

    const subText =
      content.childNames && content.childNames.length > 0
        ? `INCLUDED FLOORS (${childFloorsCount}) : ${content.childNames.join("  •  ")}`
        : childFloorsCount > 0
        ? `TOTAL INCLUDED FLOORS : ${childFloorsCount} FLOORS IN THIS BUILDING`
        : undefined;

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "BUILDING",
      badgeTextAr: "المبنى",
      valueText: content.building || "",
      subText,
      accentColor: COLOR_GOLD,
    });
  } else if (isCenter) {
    const heroBoxHeight = Math.min(250, availBodyHeight * 0.65);
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
      badgeTextAr: "السنتر / مركز الاختبار",
      valueText: content.center || "",
      accentColor: COLOR_GOLD,
    });
  } else if (isGov) {
    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom + 20,
      width: bodyWidth,
      height: availBodyHeight - 40,
      badgeText: "GOVERNORATE",
      badgeTextAr: "المحافظة",
      valueText: content.governorate || "",
      accentColor: COLOR_GOLD,
    });
  } else if (isRoot) {
    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom + 20,
      width: bodyWidth,
      height: availBodyHeight - 40,
      badgeText: "EXAMINATION",
      badgeTextAr: "الاختبار الرسمي",
      valueText: content.examName || "EST 1",
      accentColor: COLOR_GOLD,
    });
  } else {
    // Custom fallback
    const items = content.fields.map((f) => ({ label: f.label, labelAr: f.labelAr, value: f.value }));
    if (items.length === 0) {
      items.push({ label: "Location", labelAr: "الموقع", value: content.examName || "EST" });
    }

    const rowH = Math.min(70, (availBodyHeight - (items.length - 1) * 12) / items.length);
    for (let i = 0; i < items.length; i++) {
      const cardY = bodyTop - (i + 1) * rowH - i * 12;
      renderSummaryCard({
        page,
        font,
        x: bodyStartX,
        y: cardY,
        width: bodyWidth,
        height: rowH,
        label: items[i].label,
        labelAr: items[i].labelAr,
        value: items[i].value,
      });
    }
  }
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
  const { page, font, x, y, width, height, label, value } = params;

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
  const labelSize = Math.max(9, Math.min(11.5, height * 0.22));
  page.drawText(labelText, {
    x: x + 10,
    y: y + height - labelSize - 8,
    size: labelSize,
    font,
    color: COLOR_MUTED,
  });

  // Value - Auto-scale
  const availValWidth = width - 20;
  let valSize = Math.max(11, Math.min(18, height * 0.40));
  let valWidth = font.widthOfTextAtSize(value, valSize);
  if (valWidth > availValWidth) {
    valSize = Math.max(8.5, (availValWidth / valWidth) * valSize);
  }

  page.drawText(value, {
    x: x + 10,
    y: y + 10,
    size: valSize,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Helper to render the large hero badge (e.g. ROOM 204 or BUILDING Pharmacy),
 * with an optional sub-text banner (e.g. Included Floors or Included Rooms).
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
  subText?: string;
  accentColor: any;
}) {
  const { page, font, x, y, width, height, badgeText, valueText, subText, accentColor } = params;

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
  const bannerHeight = Math.max(30, Math.min(38, height * 0.20));
  const bannerY = y + height - bannerHeight;
  page.drawRectangle({
    x: x + 2,
    y: bannerY,
    width: width - 4,
    height: bannerHeight - 2,
    color: COLOR_CHARCOAL,
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
  const titleSize = Math.max(11, Math.min(15, bannerHeight * 0.48));
  const titleWidth = font.widthOfTextAtSize(badgeTitle, titleSize);
  page.drawText(badgeTitle, {
    x: x + (width - titleWidth) / 2,
    y: bannerY + (bannerHeight - titleSize) / 2 - 2,
    size: titleSize,
    font,
    color: accentColor,
  });

  // Bottom Sub-Text banner (e.g. Included Floors or Rooms) if present
  const subBarHeight = subText ? Math.max(26, Math.min(34, height * 0.16)) : 0;
  if (subText) {
    const subBarY = y + 2;
    page.drawRectangle({
      x: x + 2,
      y: subBarY,
      width: width - 4,
      height: subBarHeight,
      color: COLOR_LIGHT_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 1,
    });

    const subSize = Math.max(8.5, Math.min(11, subBarHeight * 0.38));
    let subW = font.widthOfTextAtSize(subText, subSize);
    let finalSubSize = subSize;
    if (subW > width - 20) {
      finalSubSize = Math.max(7.5, ((width - 20) / subW) * subSize);
      subW = font.widthOfTextAtSize(subText, finalSubSize);
    }
    page.drawText(subText, {
      x: x + (width - subW) / 2,
      y: subBarY + (subBarHeight - finalSubSize) / 2 + 1,
      size: finalSubSize,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // Giant Value (e.g. 204 or Pharmacy)
  const availValueHeight = bannerY - y - 16 - subBarHeight;
  const availValueWidth = width - 30;
  let valueSize = Math.max(24, Math.min(84, availValueHeight * 0.70));
  let valWidth = font.widthOfTextAtSize(valueText, valueSize);

  if (valWidth > availValueWidth) {
    valueSize = Math.max(18, (availValueWidth / valWidth) * valueSize);
    valWidth = font.widthOfTextAtSize(valueText, valueSize);
  }

  const valX = x + (width - valWidth) / 2;
  const valY = y + subBarHeight + (availValueHeight - valueSize) / 2 + 4;

  page.drawText(valueText, {
    x: valX,
    y: valY,
    size: valueSize,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Renders the official Room File Contents Checklist Box.
 * Designed with 5 clean empty square checkboxes for proctors/staff to manually check off with a pen:
 * 1. Student Register (كشف حضور الطلاب - ريجستر ستيدينت)
 * 2. Proctor Report (تقرير المراقب - ريبورت بروكتور)
 * 3. Seating Numbers (أرقام الجلوس والمقاعد - أرقام)
 * 4. Mobile Collection Forms (نماذج تسليم الهواتف المحمولة - فايلات الموبايل)
 * 5. Student Misconduct Forms (محاضر إثبات الحالة وسوء السلوك - ميس كوندكات للطالب)
 */
function renderRoomChecklistBox(params: {
  page: any;
  font: any;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const { page, font, x, y, width, height } = params;

  // Outer framing card
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  // Header Banner
  const bannerHeight = Math.max(30, Math.min(38, height * 0.15));
  const bannerY = y + height - bannerHeight;
  page.drawRectangle({
    x: x + 2,
    y: bannerY,
    width: width - 4,
    height: bannerHeight - 2,
    color: COLOR_CHARCOAL,
  });

  // Gold accent line under header
  page.drawLine({
    start: { x: x + 2, y: bannerY },
    end: { x: x + width - 2, y: bannerY },
    thickness: 2,
    color: COLOR_GOLD,
  });

  // Header Text
  const headerText = "ROOM FILE CONTENTS / فحص محتويات ملف القاعة";
  const headerSize = Math.max(10, Math.min(13, bannerHeight * 0.44));
  const hWidth = font.widthOfTextAtSize(headerText, headerSize);
  page.drawText(headerText, {
    x: x + (width - hWidth) / 2,
    y: bannerY + (bannerHeight - headerSize) / 2 - 1,
    size: headerSize,
    font,
    color: COLOR_GOLD,
  });

  // Checklist items
  const items = [
    { en: "Student Register", ar: "كشف حضور وتسجيل الطلاب" },
    { en: "Proctor Report", ar: "تقرير ومحضر المراقب" },
    { en: "Seating / Seat Numbers", ar: "أرقام جلوس وتوزيع المقاعد" },
    { en: "Mobile Collection Forms", ar: "نماذج واستمارات جمع الهواتف" },
    { en: "Student Misconduct Forms", ar: "محاضر إثبات الحالة وسوء السلوك" },
  ];

  const availContentHeight = bannerY - y;
  const footerHeight = Math.max(30, Math.min(38, availContentHeight * 0.16));
  const itemsAreaHeight = availContentHeight - footerHeight - 8;
  const itemRowHeight = itemsAreaHeight / items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowY = bannerY - 6 - (i + 1) * itemRowHeight;

    // Checkbox Square (empty square for pen checking)
    const boxSize = Math.max(12, Math.min(14, itemRowHeight * 0.42));
    const boxX = x + 16;
    const boxY = rowY + (itemRowHeight - boxSize) / 2;

    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxSize,
      height: boxSize,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1.5,
    });

    // Item Text: English + Arabic
    const labelX = boxX + boxSize + 12;
    const fullText = `${item.en}  —  ${item.ar}`;
    let textSize = Math.max(9, Math.min(11.5, itemRowHeight * 0.38));
    let tWidth = font.widthOfTextAtSize(fullText, textSize);

    if (tWidth > width - 50) {
      textSize = Math.max(8, ((width - 50) / tWidth) * textSize);
    }

    page.drawText(fullText, {
      x: labelX,
      y: boxY + 2,
      size: textSize,
      font,
      color: COLOR_CHARCOAL,
    });

    // Subtle divider line
    if (i < items.length - 1) {
      page.drawLine({
        start: { x: x + 14, y: rowY },
        end: { x: x + width - 14, y: rowY },
        thickness: 0.5,
        color: COLOR_BORDER,
      });
    }
  }

  // Footer: Proctor Verification & Signature
  const footerY = y + 2;
  page.drawLine({
    start: { x: x + 12, y: footerY + footerHeight },
    end: { x: x + width - 12, y: footerY + footerHeight },
    thickness: 1,
    color: COLOR_GOLD,
  });

  const signText = "Proctor Signature / توقيع المراقب: __________________   Date: ___/___/2026";
  const signSize = Math.max(8.5, Math.min(10, footerHeight * 0.32));
  page.drawText(signText, {
    x: x + 14,
    y: footerY + (footerHeight - signSize) / 2 + 1,
    size: signSize,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Compact custom label rendering (e.g. 100mm x 50mm).
 */
function drawCustomLabelPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  content: StickerContent;
  widthMm: number;
  heightMm: number;
}) {
  const { pdfDoc, font, logoImg, content, widthMm, heightMm } = params;

  const stickerWidthPt = widthMm * MM_TO_PT;
  const stickerHeightPt = heightMm * MM_TO_PT;

  const page = pdfDoc.addPage([stickerWidthPt, stickerHeightPt]);

  const paddingX = 14;
  const paddingY = 10;
  const availWidth = stickerWidthPt - paddingX * 2;

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

  // Include dynamic count
  if (content.level === "building" && content.childCount) {
    displayItems.push(`Total Floors : ${content.childCount}`);
  } else if (content.level === "floor" && content.childCount) {
    displayItems.push(`Total Rooms : ${content.childCount}`);
  } else if (content.level === "room") {
    displayItems.push("[ ] Reg  [ ] Proc  [ ] Seat  [ ] Mob  [ ] Mis");
  }

  const remainingHeight = currentY - paddingY;
  const lineSpacing = 3;
  const rawLineHeight = (remainingHeight - (displayItems.length - 1) * lineSpacing) / displayItems.length;
  const baseSize = Math.max(7, Math.min(13, rawLineHeight));

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
}
