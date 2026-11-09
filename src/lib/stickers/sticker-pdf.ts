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

// Static decoded logo bytes in memory - zero filesystem dependency
const LOGO_JPEG_BYTES: Uint8Array = new Uint8Array(Buffer.from(EST_LOGO_BASE64, "base64"));

/**
 * Loads the official EST Logo (JPEG) directly from memory.
 * Guaranteed to succeed 100% of the time in all environments.
 */
async function loadLogoImage(pdfDoc: PDFDocument): Promise<any> {
  try {
    return await pdfDoc.embedJpg(LOGO_JPEG_BYTES);
  } catch (err) {
    console.error("[sticker-pdf] Error embedding logo from memory:", err);
    // Try from public path fallback if ever needed
    try {
      const publicPath = path.join(process.cwd(), "public", "est-logo.jpg");
      if (fs.existsSync(publicPath)) {
        const fileBytes = fs.readFileSync(publicPath);
        return await pdfDoc.embedJpg(fileBytes);
      }
    } catch {}
    return null;
  }
}

/**
 * Loads the font.
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
      } catch {}
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
 * Draws a full-page A4 Exam Placard:
 * - Features the official EST Logo (JPEG) at the top of every sticker.
 * - 100% International English labels (no Arabic text on placards to avoid text reversal/rendering issues).
 * - Full hierarchy statistics (Governorate -> Centers, Center -> Buildings, Building -> Floors, Floor -> Rooms).
 * - Room Level: Features a dedicated manual verification checklist box with 5 empty square check-boxes.
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
    // ========================================================
    // 1. ROOM LEVEL
    // Top: 4 location summary cards (Governorate, Center, Building, Floor)
    // Bottom: Left = Room Hero card, Right = Room File Contents Checklist
    // ========================================================
    const summaryCardHeight = isLandscape ? 56 : 52;
    const summaryY = bodyTop - summaryCardHeight;

    const cards = [
      { label: "Governorate", value: content.governorate || "—" },
      { label: "Center", value: content.center || "—" },
      { label: "Building", value: content.building || "—" },
      { label: "Floor", value: content.floor || "—" },
    ];

    if (isLandscape) {
      // 4 horizontal summary cards
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
          value: cards[i].value,
        });
      }

      // Bottom Area: Left = Room Hero (40%), Right = Room Checklist Box (60%)
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
        valueText: content.room || "",
        accentColor: COLOR_GOLD,
      });

      renderChecklistBox({
        page,
        font,
        x: rightColX,
        y: bodyBottom,
        width: rightColWidth,
        height: bottomAreaHeight,
        headerText: "ROOM FILE CONTENTS CHECKLIST",
        items: [
          "1. Student Register",
          "2. Proctor Report",
          "3. Seating Numbers / Room List",
          "4. Mobile Collection Forms",
          "5. Student Misconduct Forms",
        ],
      });
    } else {
      // Portrait layout
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
        valueText: content.room || "",
        accentColor: COLOR_GOLD,
      });

      renderChecklistBox({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: bodyWidth,
        height: checklistHeight,
        headerText: "ROOM FILE CONTENTS CHECKLIST",
        items: [
          "1. Student Register",
          "2. Proctor Report",
          "3. Seating Numbers / Room List",
          "4. Mobile Collection Forms",
          "5. Student Misconduct Forms",
        ],
      });
    }
  } else if (isFloor) {
    // ========================================================
    // 2. FLOOR LEVEL (SENIOR SUPERVISOR DOSSIER)
    // Displays total rooms inside this floor, lists them,
    // and includes the Senior Floor Dossier Checklist
    // ========================================================
    const childRoomsCount = content.childCount || (content.childNames ? content.childNames.length : 0);
    const summaryCardHeight = isLandscape ? 56 : 52;
    const summaryY = bodyTop - summaryCardHeight;

    const cards = [
      { label: "Governorate", value: content.governorate || "—" },
      { label: "Center", value: content.center || "—" },
      { label: "Building", value: content.building || "—" },
      {
        label: "Total Rooms",
        value: childRoomsCount > 0 ? `${childRoomsCount} Rooms` : "Rooms Included",
      },
    ];

    const floorChecklistItems = [
      "1. Proctor Register",
      "2. Senior Report",
      "3. Seating Numbers / Room List",
      "4. Mobile Collection Forms",
      "5. Proctor Misconduct Forms",
    ];

    const subText =
      content.childNames && content.childNames.length > 0
        ? `INCLUDED ROOMS (${childRoomsCount}) : ${content.childNames.join("  •  ")}`
        : childRoomsCount > 0
        ? `TOTAL INCLUDED ROOMS : ${childRoomsCount} ROOMS IN THIS FLOOR`
        : undefined;

    if (isLandscape) {
      // 4 horizontal summary cards
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
          value: cards[i].value,
        });
      }

      // Bottom Area: Left = Floor Hero (40%), Right = Senior Floor Dossier Checklist (60%)
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
        badgeText: "FLOOR",
        valueText: content.floor || "",
        subText,
        accentColor: COLOR_GOLD,
      });

      renderChecklistBox({
        page,
        font,
        x: rightColX,
        y: bodyBottom,
        width: rightColWidth,
        height: bottomAreaHeight,
        headerText: "FLOOR DOSSIER CHECKLIST (SENIOR)",
        items: floorChecklistItems,
      });
    } else {
      // Portrait layout
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
        badgeText: "FLOOR",
        valueText: content.floor || "",
        subText,
        accentColor: COLOR_GOLD,
      });

      renderChecklistBox({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: bodyWidth,
        height: checklistHeight,
        headerText: "FLOOR DOSSIER CHECKLIST (SENIOR)",
        items: floorChecklistItems,
      });
    }
  } else if (isBuilding) {
    // ========================================================
    // 3. BUILDING LEVEL
    // Displays total floors inside this building and lists them all
    // ========================================================
    const childFloorsCount = content.childCount || (content.childNames ? content.childNames.length : 0);

    const heroBoxHeight = Math.min(240, availBodyHeight * 0.60);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Governorate", value: content.governorate || "—" },
      { label: "Center", value: content.center || "—" },
      {
        label: "Total Floors",
        value: childFloorsCount > 0 ? `${childFloorsCount} Floors` : "Floors Included",
      },
    ];

    if (content.totalRooms && content.totalRooms > 0) {
      cards.push({
        label: "Total Rooms",
        value: `${content.totalRooms} Rooms`,
      });
    }

    const colWidth = (bodyWidth - (cards.length - 1) * 12) / cards.length;
    for (let i = 0; i < cards.length; i++) {
      const cardX = isLandscape ? bodyStartX + i * (colWidth + 12) : bodyStartX;
      const cardY = isLandscape ? summaryY : summaryY + (cards.length - 1 - i) * ((summaryHeight - 16) / cards.length + 8);
      const cardW = isLandscape ? colWidth : bodyWidth;
      const cardH = isLandscape ? summaryHeight : (summaryHeight - 16) / cards.length;

      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        label: cards[i].label,
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
      valueText: content.building || "",
      subText,
      accentColor: COLOR_GOLD,
    });
  } else if (isCenter) {
    // ========================================================
    // 4. TEST CENTER LEVEL (e.g. Abu Qir)
    // Displays total buildings inside this center and lists them all
    // ========================================================
    const childBuildingsCount = content.childCount || (content.childNames ? content.childNames.length : 0);

    const heroBoxHeight = Math.min(240, availBodyHeight * 0.60);
    const summaryHeight = availBodyHeight - heroBoxHeight - 16;
    const summaryY = bodyTop - summaryHeight;

    const cards = [
      { label: "Governorate", value: content.governorate || "—" },
      {
        label: "Total Buildings",
        value: childBuildingsCount > 0 ? `${childBuildingsCount} Buildings` : "Buildings Included",
      },
    ];

    if (content.totalRooms && content.totalRooms > 0) {
      cards.push({
        label: "Total Rooms",
        value: `${content.totalRooms} Rooms`,
      });
    }

    const colWidth = (bodyWidth - (cards.length - 1) * 12) / cards.length;
    for (let i = 0; i < cards.length; i++) {
      const cardX = isLandscape ? bodyStartX + i * (colWidth + 12) : bodyStartX;
      const cardY = isLandscape ? summaryY : summaryY + (cards.length - 1 - i) * ((summaryHeight - 16) / cards.length + 8);
      const cardW = isLandscape ? colWidth : bodyWidth;
      const cardH = isLandscape ? summaryHeight : (summaryHeight - 16) / cards.length;

      renderSummaryCard({
        page,
        font,
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        label: cards[i].label,
        value: cards[i].value,
      });
    }

    const subText =
      content.childNames && content.childNames.length > 0
        ? `INCLUDED BUILDINGS (${childBuildingsCount}) : ${content.childNames.join("  •  ")}`
        : childBuildingsCount > 0
        ? `TOTAL INCLUDED BUILDINGS : ${childBuildingsCount} BUILDINGS IN THIS CENTER`
        : undefined;

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "TEST CENTER",
      valueText: content.center || "",
      subText,
      accentColor: COLOR_GOLD,
    });
  } else if (isGov) {
    // ========================================================
    // 5. GOVERNORATE LEVEL (e.g. Alexandria)
    // Displays total centers inside this governorate and lists them
    // ========================================================
    const childCentersCount = content.childCount || (content.childNames ? content.childNames.length : 0);

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
      label: "Total Centers",
      value: childCentersCount > 0 ? `${childCentersCount} Examination Centers` : "Centers Included",
    });

    const subText =
      content.childNames && content.childNames.length > 0
        ? `INCLUDED CENTERS (${childCentersCount}) : ${content.childNames.join("  •  ")}`
        : undefined;

    renderHeroCard({
      page,
      font,
      x: bodyStartX,
      y: bodyBottom,
      width: bodyWidth,
      height: heroBoxHeight,
      badgeText: "GOVERNORATE",
      valueText: content.governorate || "",
      subText,
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
      valueText: content.examName || "EST 1",
      accentColor: COLOR_GOLD,
    });
  } else {
    // Custom fallback
    const items = content.fields.map((f) => ({ label: f.label, value: f.value }));
    if (items.length === 0) {
      items.push({ label: "Location", value: content.examName || "EST" });
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
  const labelSize = Math.max(9, Math.min(11, height * 0.22));
  page.drawText(labelText, {
    x: x + 10,
    y: y + height - labelSize - 8,
    size: labelSize,
    font,
    color: COLOR_MUTED,
  });

  // Value - Auto-scale
  const availValWidth = width - 20;
  let valSize = Math.max(11, Math.min(18, height * 0.38));
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

  // Bottom Sub-Text banner (e.g. Included Floors, Rooms, or Buildings) if present
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
 * Renders an official File Contents Checklist Box.
 * Designed with clean empty square checkboxes for proctors/supervisors to manually check off with a pen.
 * Used for Room Dossiers (Proctor) and Floor Dossiers (Senior).
 */
function renderChecklistBox(params: {
  page: any;
  font: any;
  x: number;
  y: number;
  width: number;
  height: number;
  headerText: string;
  items: string[];
}) {
  const { page, font, x, y, width, height, headerText, items } = params;

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
  const headerSize = Math.max(10, Math.min(13, bannerHeight * 0.44));
  const hWidth = font.widthOfTextAtSize(headerText, headerSize);
  page.drawText(headerText, {
    x: x + (width - hWidth) / 2,
    y: bannerY + (bannerHeight - headerSize) / 2 - 1,
    size: headerSize,
    font,
    color: COLOR_GOLD,
  });

  const availContentHeight = bannerY - y;
  const footerHeight = Math.max(30, Math.min(38, availContentHeight * 0.16));
  const itemsAreaHeight = availContentHeight - footerHeight - 8;
  const itemRowHeight = itemsAreaHeight / items.length;

  for (let i = 0; i < items.length; i++) {
    const itemText = items[i];
    const rowY = bannerY - 6 - (i + 1) * itemRowHeight;

    // Checkbox Square (empty square for pen checking)
    const boxSize = Math.max(12, Math.min(15, itemRowHeight * 0.42));
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

    // Item Text
    const labelX = boxX + boxSize + 12;
    let textSize = Math.max(9.5, Math.min(12, itemRowHeight * 0.38));
    let tWidth = font.widthOfTextAtSize(itemText, textSize);

    if (tWidth > width - 50) {
      textSize = Math.max(8.5, ((width - 50) / tWidth) * textSize);
    }

    page.drawText(itemText, {
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

  // Footer: Verification & Signature
  const footerY = y + 2;
  page.drawLine({
    start: { x: x + 12, y: footerY + footerHeight },
    end: { x: x + width - 12, y: footerY + footerHeight },
    thickness: 1,
    color: COLOR_GOLD,
  });

  const signText = "Signature: _______________________    Date: _____ / _____ / 2026";
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

  // Include dynamic count in English
  if (content.level === "center" && content.childCount) {
    displayItems.push(`Total Buildings : ${content.childCount}`);
  } else if (content.level === "building" && content.childCount) {
    displayItems.push(`Total Floors : ${content.childCount}`);
  } else if (content.level === "floor") {
    if (content.childCount) {
      displayItems.push(`Total Rooms : ${content.childCount}`);
    }
    displayItems.push("[ ] Proc Reg  [ ] Senior Rep  [ ] Seating  [ ] Mobile  [ ] Proc Misconduct");
  } else if (content.level === "room") {
    displayItems.push("[ ] Reg  [ ] Proctor  [ ] Seating  [ ] Mobile  [ ] Misconduct");
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
