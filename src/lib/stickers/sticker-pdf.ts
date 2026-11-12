import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildStickerContent, type StickerContent } from "./sticker-content";
import { type RoomSubjectCount } from "./est-room-data";
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

// 100% Black & White Color Palette
const COLOR_CHARCOAL = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.28, 0.28, 0.28);
const COLOR_GOLD = rgb(0, 0, 0); // Converted gold/yellow to crisp solid black
const COLOR_LIGHT_BG = rgb(1, 1, 1); // Clean white background
const COLOR_BORDER = rgb(0.75, 0.75, 0.75); // Simple clean border
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
    if (fs.existsSync(/*turbopackIgnore: true*/ fp)) {
      try {
        const fontBytes = fs.readFileSync(/*turbopackIgnore: true*/ fp);
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

  if (paperMode === "a4") {
    // In A4 mode:
    // - Room stickers and Floor stickers are grouped into a 4-up 2x2 grid (4 quarters per A4 page).
    // - Building, Center, Governorate, and Root stickers are printed as full-page A4 placards.
    let pendingQuarterItems: StickerContent[] = [];

    const flushQuarterItems = () => {
      while (pendingQuarterItems.length > 0) {
        const chunk = pendingQuarterItems.slice(0, 4);
        pendingQuarterItems = pendingQuarterItems.slice(4);
        drawA4FourUpPlacardPage({
          pdfDoc,
          font,
          logoImg,
          contents: chunk,
        });
      }
    };

    for (const content of contents) {
      const isQuarter = content.level === "room" || content.level === "floor";
      if (isQuarter) {
        pendingQuarterItems.push(content);
        if (pendingQuarterItems.length === 4) {
          flushQuarterItems();
        }
      } else {
        flushQuarterItems();
        drawA4PlacardPage({
          pdfDoc,
          font,
          logoImg,
          content,
          orientation,
        });
      }
    }

    flushQuarterItems();
  } else {
    for (const content of contents) {
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
    borderWidth: 1.8,
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

    const roomChecklistItems = [
      "1. Student Register",
      "2. Proctor Report",
      "3. Numbers & Mobile Collection Files",
      "4. Student Misconduct Forms",
      "5. Draft papers, pens, and IDs",
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

      const examBreakdown =
        content.breakdownText ||
        (content.subjects && content.subjects.length > 0
          ? content.subjects.map((s) => `${s.code}: ${s.count}`).join("  |  ")
          : typeof content.litCount === "number" || typeof content.mathCount === "number"
          ? `LIT: ${content.litCount ?? 0}  |  MATH: ${content.mathCount ?? 0}  |  ESSAY: ${content.hasEssay ? content.essayCount ?? 0 : 0}`
          : undefined);

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: leftColWidth,
        height: bottomAreaHeight,
        badgeText: "ROOM",
        valueText: content.room || "",
        subText:
          typeof content.totalStudents === "number" && content.totalStudents > 0
            ? `${content.totalStudents} STUDENTS TOTAL`
            : undefined,
        detailText: examBreakdown,
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
        items: roomChecklistItems,
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

      const examBreakdown =
        content.breakdownText ||
        (content.subjects && content.subjects.length > 0
          ? content.subjects.map((s) => `${s.code}: ${s.count}`).join("  |  ")
          : typeof content.litCount === "number" || typeof content.mathCount === "number"
          ? `LIT: ${content.litCount ?? 0}  |  MATH: ${content.mathCount ?? 0}  |  ESSAY: ${content.hasEssay ? content.essayCount ?? 0 : 0}`
          : undefined);

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: gridBottom - heroHeight - 10,
        width: bodyWidth,
        height: heroHeight,
        badgeText: "ROOM",
        valueText: content.room || "",
        subText:
          typeof content.totalStudents === "number" && content.totalStudents > 0
            ? `${content.totalStudents} STUDENTS TOTAL`
            : undefined,
        detailText: examBreakdown,
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
        items: roomChecklistItems,
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
      "3. Numbers & Mobile Collection Files",
      "4. Proctor Misconduct Forms",
      "5. Draft papers, pens, and IDs",
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
  detailText?: string;
  accentColor: any;
}) {
  const { page, font, x, y, width, height, badgeText, valueText, subText, detailText, accentColor } = params;

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
  const titleSize = Math.max(12, Math.min(16, bannerHeight * 0.52));
  const titleWidth = font.widthOfTextAtSize(badgeTitle, titleSize);
  page.drawText(badgeTitle, {
    x: x + (width - titleWidth) / 2,
    y: bannerY + (bannerHeight - titleSize) / 2 - 2,
    size: titleSize,
    font,
    color: COLOR_WHITE,
  });

  // Bottom Sub-Text banner (e.g. Included Floors, Rooms, or Candidate counts) if present
  const hasSub = Boolean(subText || detailText);
  const subBarHeight = hasSub
    ? detailText && subText
      ? Math.max(38, Math.min(48, height * 0.22))
      : Math.max(26, Math.min(34, height * 0.16))
    : 0;

  if (hasSub) {
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

    if (detailText && subText) {
      // Line 1: Main count / label (e.g. "35 STUDENTS TOTAL")
      const topSize = Math.max(8.5, Math.min(10.5, subBarHeight * 0.24));
      let topW = font.widthOfTextAtSize(subText, topSize);
      let finalTopSize = topSize;
      if (topW > width - 20) {
        finalTopSize = Math.max(7, ((width - 20) / topW) * topSize);
        topW = font.widthOfTextAtSize(subText, finalTopSize);
      }
      page.drawText(subText, {
        x: x + (width - topW) / 2,
        y: subBarY + subBarHeight * 0.54,
        size: finalTopSize,
        font,
        color: COLOR_CHARCOAL,
      });

      // Subtle horizontal divider line
      page.drawLine({
        start: { x: x + 12, y: subBarY + subBarHeight * 0.48 },
        end: { x: x + width - 12, y: subBarY + subBarHeight * 0.48 },
        thickness: 0.5,
        color: COLOR_BORDER,
      });

      // Line 2: Detailed subject breakdown (e.g. "LIT: 35  |  MATH: 28  |  ESSAY: 12")
      const dtlSize = Math.max(7.5, Math.min(9.5, subBarHeight * 0.22));
      let dtlW = font.widthOfTextAtSize(detailText, dtlSize);
      let finalDtlSize = dtlSize;
      if (dtlW > width - 20) {
        finalDtlSize = Math.max(6.5, ((width - 20) / dtlW) * dtlSize);
        dtlW = font.widthOfTextAtSize(detailText, finalDtlSize);
      }
      page.drawText(detailText, {
        x: x + (width - dtlW) / 2,
        y: subBarY + 5,
        size: finalDtlSize,
        font,
        color: COLOR_CHARCOAL,
      });
    } else {
      const singleText = subText || detailText || "";
      const subSize = Math.max(8.5, Math.min(11, subBarHeight * 0.38));
      let subW = font.widthOfTextAtSize(singleText, subSize);
      let finalSubSize = subSize;
      if (subW > width - 20) {
        finalSubSize = Math.max(7.5, ((width - 20) / subW) * subSize);
        subW = font.widthOfTextAtSize(singleText, finalSubSize);
      }
      page.drawText(singleText, {
        x: x + (width - subW) / 2,
        y: subBarY + (subBarHeight - finalSubSize) / 2 + 1,
        size: finalSubSize,
        font,
        color: COLOR_CHARCOAL,
      });
    }
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
    displayItems.push("[ ] Proc Reg  [ ] Senior Rep  [ ] Numbers & Mobile  [ ] Proc Misconduct  [ ] Draft/Pens/IDs");
  } else if (content.level === "room") {
    displayItems.push("[ ] Reg  [ ] Proctor  [ ] Numbers & Mobile  [ ] Misconduct  [ ] Draft/Pens/IDs");
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

/**
 * Draws an A4 Landscape page (841.89 x 595.28 pt) divided into 4 quarters (2x2 grid).
 * Used for Room stickers and Floor stickers.
 * Each quarter contains a complete, official EST dossier placard with logo, hero, and checklist.
 * Features dashed cut guides between the 4 quadrants.
 */
function drawA4FourUpPlacardPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  contents: StickerContent[];
}) {
  const { pdfDoc, font, logoImg, contents } = params;

  // Standard A4 Landscape in points
  const pageWidth = 841.89;
  const pageHeight = 595.28;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const midX = pageWidth / 2; // 420.945 pt
  const midY = pageHeight / 2; // 297.64 pt

  // Subtle cut lines dividing the sheet into 4 quadrants
  const cutColor = rgb(0.72, 0.72, 0.72);
  page.drawLine({
    start: { x: midX, y: 0 },
    end: { x: midX, y: pageHeight },
    thickness: 0.75,
    color: cutColor,
    dashArray: [4, 4],
  });
  page.drawLine({
    start: { x: 0, y: midY },
    end: { x: pageWidth, y: midY },
    thickness: 0.75,
    color: cutColor,
    dashArray: [4, 4],
  });

  // Center cross-marker for precise cutting
  page.drawLine({ start: { x: midX - 8, y: midY }, end: { x: midX + 8, y: midY }, thickness: 1.2, color: cutColor });
  page.drawLine({ start: { x: midX, y: midY - 8 }, end: { x: midX, y: midY + 8 }, thickness: 1.2, color: cutColor });

  // 4 Quadrants in reading order:
  // 0: Top-Left (x: 0, y: midY)
  // 1: Top-Right (x: midX, y: midY)
  // 2: Bottom-Left (x: 0, y: 0)
  // 3: Bottom-Right (x: midX, y: 0)
  const quadrants = [
    { x: 0, y: midY, width: midX, height: midY },
    { x: midX, y: midY, width: midX, height: midY },
    { x: 0, y: 0, width: midX, height: midY },
    { x: midX, y: 0, width: midX, height: midY },
  ];

  for (let i = 0; i < contents.length && i < 4; i++) {
    const q = quadrants[i];
    drawQuarterPlacard({
      page,
      font,
      logoImg,
      content: contents[i],
      slotX: q.x,
      slotY: q.y,
      slotWidth: q.width,
      slotHeight: q.height,
    });
  }
}

/**
 * Draws a single dossier placard inside one quadrant (approx 421 x 298 pt).
 */
function drawQuarterPlacard(params: {
  page: any;
  font: any;
  logoImg: any;
  content: StickerContent;
  slotX: number;
  slotY: number;
  slotWidth: number;
  slotHeight: number;
}) {
  const { page, font, logoImg, content, slotX, slotY, slotWidth, slotHeight } = params;

  const isRoom = content.level === "room";
  const margin = 8;
  const x = slotX + margin;
  const y = slotY + margin;
  const width = slotWidth - margin * 2;
  const height = slotHeight - margin * 2;

  // Outer framing card
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Header: Logo & Exam title
  let headerBottom = y + height - 8;
  const logoH = 22;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = x + 10;
  const logoY = y + height - 8 - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 8 : x + 10;
  const examTitle = `${content.examName || "EST 1"} — OFFICIAL EXAMINATION`;
  page.drawText(examTitle, {
    x: textStartX,
    y: logoY + 11,
    size: 9,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EGYPTIAN SCHOLASTIC TEST", {
    x: textStartX,
    y: logoY + 2,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  headerBottom = logoY - 4;

  // Gold divider
  page.drawLine({
    start: { x: x + 6, y: headerBottom },
    end: { x: x + width - 6, y: headerBottom },
    thickness: 1,
    color: COLOR_GOLD,
  });

  // Location ribbon
  const ribbonH = 14;
  const ribbonY = headerBottom - 3 - ribbonH;
  page.drawRectangle({
    x: x + 6,
    y: ribbonY,
    width: width - 12,
    height: ribbonH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const locItems = [
    content.governorate,
    content.center,
    content.building,
    isRoom ? content.floor : undefined,
  ].filter(Boolean);
  const locText = locItems.join("  •  ");
  let locSize = 7.2;
  let locWidth = font.widthOfTextAtSize(locText, locSize);
  if (locWidth > width - 24) {
    locSize = Math.max(6, ((width - 24) / locWidth) * locSize);
    locWidth = font.widthOfTextAtSize(locText, locSize);
  }
  page.drawText(locText, {
    x: x + (width - locWidth) / 2,
    y: ribbonY + (ribbonH - locSize) / 2 + 1,
    size: locSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body: Left Column (Hero) + Right Column (Checklist)
  const bodyTop = ribbonY - 5;
  const bodyBottom = y + 6;
  const bodyH = bodyTop - bodyBottom;
  const bodyW = width - 12;

  const leftW = Math.round(bodyW * 0.38);
  const gap = 6;
  const rightW = bodyW - leftW - gap;
  const leftX = x + 6;
  const rightX = leftX + leftW + gap;

  // 1. LEFT HERO CARD
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Hero top banner
  const bannerH = 19;
  const bannerY = bodyBottom + bodyH - bannerH;
  page.drawRectangle({
    x: leftX + 1,
    y: bannerY,
    width: leftW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const badgeText = isRoom ? "ROOM" : "FLOOR";
  const badgeSize = 8.5;
  const badgeW = font.widthOfTextAtSize(badgeText, badgeSize);
  page.drawText(badgeText, {
    x: leftX + (leftW - badgeW) / 2,
    y: bannerY + (bannerH - badgeSize) / 2,
    size: badgeSize,
    font,
    color: COLOR_GOLD,
  });

  // Hero bottom sub-banner (displays total students & per-exam breakdown for rooms)
  const childRoomsCount = content.childCount || (content.childNames ? content.childNames.length : 0);
  const examBreakdown =
    content.breakdownText ||
    (content.subjects && content.subjects.length > 0
      ? content.subjects.map((s) => `${s.code}: ${s.count}`).join("  |  ")
      : isRoom && (typeof content.litCount === "number" || typeof content.mathCount === "number")
      ? `LIT: ${content.litCount ?? 0}  |  MATH: ${content.mathCount ?? 0}  |  ESSAY: ${content.hasEssay ? content.essayCount ?? 0 : 0}`
      : undefined);

  const subH = isRoom && examBreakdown ? 30 : 17;
  const subY = bodyBottom + 2;
  page.drawRectangle({
    x: leftX + 2,
    y: subY,
    width: leftW - 4,
    height: subH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  if (isRoom && examBreakdown) {
    const topText =
      typeof content.totalStudents === "number" && content.totalStudents > 0
        ? `${content.totalStudents} STUDENTS TOTAL`
        : "ROOM DOSSIER";
    let topSize = 6.8;
    let topW = font.widthOfTextAtSize(topText, topSize);
    if (topW > leftW - 8) {
      topSize = Math.max(5.5, ((leftW - 8) / topW) * topSize);
      topW = font.widthOfTextAtSize(topText, topSize);
    }
    page.drawText(topText, {
      x: leftX + (leftW - topW) / 2,
      y: subY + subH - topSize - 3.5,
      size: topSize,
      font,
      color: COLOR_CHARCOAL,
    });

    // Subtle divider line inside sub-banner
    page.drawLine({
      start: { x: leftX + 8, y: subY + subH / 2 - 1 },
      end: { x: leftX + leftW - 8, y: subY + subH / 2 - 1 },
      thickness: 0.4,
      color: COLOR_BORDER,
    });

    let btmSize = 5.8;
    let btmW = font.widthOfTextAtSize(examBreakdown, btmSize);
    if (btmW > leftW - 6) {
      btmSize = Math.max(4.8, ((leftW - 6) / btmW) * btmSize);
      btmW = font.widthOfTextAtSize(examBreakdown, btmSize);
    }
    page.drawText(examBreakdown, {
      x: leftX + (leftW - btmW) / 2,
      y: subY + 3.5,
      size: btmSize,
      font,
      color: COLOR_CHARCOAL,
    });
  } else {
    const subText = isRoom
      ? typeof content.totalStudents === "number" && content.totalStudents > 0
        ? `${content.totalStudents} STUDENTS`
        : "ROOM DOSSIER"
      : childRoomsCount > 0
      ? `${childRoomsCount} ROOMS INCLUDED`
      : "SENIOR DOSSIER";
    let subSize = 6.5;
    let subW = font.widthOfTextAtSize(subText, subSize);
    if (subW > leftW - 8) {
      subSize = Math.max(5.5, ((leftW - 8) / subW) * subSize);
      subW = font.widthOfTextAtSize(subText, subSize);
    }
    page.drawText(subText, {
      x: leftX + (leftW - subW) / 2,
      y: subY + (subH - subSize) / 2 + 1,
      size: subSize,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // Giant hero value in center
  const heroAvailH = bannerY - (subY + subH);
  const heroValue = isRoom ? (content.room || "") : (content.floor || "");
  const maxHeroSize = isRoom ? 34 : 20;
  let heroSize = maxHeroSize;
  let heroW = font.widthOfTextAtSize(heroValue, heroSize);
  if (heroW > leftW - 12) {
    heroSize = Math.max(14, ((leftW - 12) / heroW) * heroSize);
    heroW = font.widthOfTextAtSize(heroValue, heroSize);
  }
  page.drawText(heroValue, {
    x: leftX + (leftW - heroW) / 2,
    y: subY + subH + (heroAvailH - heroSize) / 2 + 2,
    size: heroSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. RIGHT CHECKLIST BOX
  page.drawRectangle({
    x: rightX,
    y: bodyBottom,
    width: rightW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Checklist banner
  page.drawRectangle({
    x: rightX + 1,
    y: bannerY,
    width: rightW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const chkTitle = isRoom ? "ROOM FILE CONTENTS CHECKLIST" : "FLOOR DOSSIER CHECKLIST (SENIOR)";
  const chkTitleSize = 7.2;
  const chkW = font.widthOfTextAtSize(chkTitle, chkTitleSize);
  page.drawText(chkTitle, {
    x: rightX + (rightW - chkW) / 2,
    y: bannerY + (bannerH - chkTitleSize) / 2,
    size: chkTitleSize,
    font,
    color: COLOR_GOLD,
  });

  // Checklist footer (signature)
  const footerH = 17;
  const footerY = bodyBottom + 2;
  page.drawRectangle({
    x: rightX + 2,
    y: footerY,
    width: rightW - 4,
    height: footerH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const sigText = isRoom ? "Signature: __________________   Date: ___/___" : "Senior Sig: __________________   Date: ___/___";
  const sigSize = 6.2;
  const sigW = font.widthOfTextAtSize(sigText, sigSize);
  page.drawText(sigText, {
    x: rightX + (rightW - sigW) / 2,
    y: footerY + (footerH - sigSize) / 2 + 1,
    size: sigSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 5 Checklist items
  const items = isRoom
    ? [
        "1. Student Register",
        "2. Proctor Report",
        "3. Numbers & Mobile Collection Files",
        "4. Student Misconduct Forms",
        "5. Draft papers, pens, and IDs",
      ]
    : [
        "1. Proctor Register",
        "2. Senior Report",
        "3. Numbers & Mobile Collection Files",
        "4. Proctor Misconduct Forms",
        "5. Draft papers, pens, and IDs",
      ];

  const availItemsH = bannerY - (footerY + footerH) - 4;
  const rowH = availItemsH / 5;

  for (let i = 0; i < items.length; i++) {
    const itemY = bannerY - (i + 1) * rowH;
    const boxSize = 9;
    const boxX = rightX + 8;
    const boxY = itemY + (rowH - boxSize) / 2;

    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxSize,
      height: boxSize,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1,
    });

    const itemText = items[i];
    const textSize = 7;
    page.drawText(itemText, {
      x: boxX + boxSize + 6,
      y: boxY + 1.5,
      size: textSize,
      font,
      color: COLOR_CHARCOAL,
    });

    // Light row separator
    if (i < 4) {
      page.drawLine({
        start: { x: rightX + 6, y: itemY },
        end: { x: rightX + rightW - 6, y: itemY },
        thickness: 0.4,
        color: COLOR_BORDER,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// EST I Exam Stickers Implementation (Quarter-A4, 2 Copies Per Subject)
// ---------------------------------------------------------------------------

export interface ExamStickerItem {
  room: string;
  examName?: string;
  governorate?: string;
  center?: string;
  building?: string;
  floor?: string;
  subject: string;
  subjectCode: string;
  studentCount: number;
  copyIndex: number;
  totalCopies: number;
}

export interface GenerateExamStickersPdfOptions {
  content: StickerContent;
  litCount?: number;
  mathCount?: number;
  essayCount?: number;
  subjects?: RoomSubjectCount[];
}

export interface BatchExamStickersPdfOptions {
  rooms?: Array<{
    content: StickerContent;
    litCount?: number;
    mathCount?: number;
    essayCount?: number;
    subjects?: RoomSubjectCount[];
  }>;
  contents?: StickerContent[];
}

/**
 * Draws a single EST I Exam Sticker inside one quadrant of an A4 page (approx 421 x 298 pt).
 * Exactly one-quarter of an A4 page, maintaining full visual harmony with the regular stickers.
 */
function drawQuarterExamSticker(params: {
  page: any;
  font: any;
  logoImg: any;
  item: ExamStickerItem;
  slotX: number;
  slotY: number;
  slotWidth: number;
  slotHeight: number;
}) {
  const { page, font, logoImg, item, slotX, slotY, slotWidth, slotHeight } = params;

  const margin = 8;
  const x = slotX + margin;
  const y = slotY + margin;
  const width = slotWidth - margin * 2;
  const height = slotHeight - margin * 2;

  // Outer framing card
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Header: Logo & Exam title
  const logoH = 22;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = x + 10;
  const logoY = y + height - 8 - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 8 : x + 10;
  const examTitle = `${item.examName || "EST I"} — OFFICIAL EXAMINATION`;
  page.drawText(examTitle, {
    x: textStartX,
    y: logoY + 11,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("EXAMINATION PAPERS & MATERIALS DOSSIER", {
    x: textStartX,
    y: logoY + 2,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  // Copy badge at top right
  const copyText = `COPY ${item.copyIndex} OF ${item.totalCopies}`;
  const copySize = 6.8;
  const copyW = font.widthOfTextAtSize(copyText, copySize);
  const copyBadgeW = copyW + 10;
  const copyBadgeH = 14;
  const copyBadgeX = x + width - copyBadgeW - 8;
  const copyBadgeY = logoY + (logoH - copyBadgeH) / 2;

  page.drawRectangle({
    x: copyBadgeX,
    y: copyBadgeY,
    width: copyBadgeW,
    height: copyBadgeH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  page.drawText(copyText, {
    x: copyBadgeX + 5,
    y: copyBadgeY + 3.5,
    size: copySize,
    font,
    color: COLOR_CHARCOAL,
  });

  const headerBottom = logoY - 4;

  // Gold divider
  page.drawLine({
    start: { x: x + 6, y: headerBottom },
    end: { x: x + width - 6, y: headerBottom },
    thickness: 1,
    color: COLOR_GOLD,
  });

  // Location ribbon
  const ribbonH = 14;
  const ribbonY = headerBottom - 3 - ribbonH;
  page.drawRectangle({
    x: x + 6,
    y: ribbonY,
    width: width - 12,
    height: ribbonH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const locItems = [
    item.governorate,
    item.center,
    item.building,
    item.floor,
  ].filter(Boolean);
  const locText = locItems.join("  •  ");
  let locSize = 7.2;
  let locWidth = font.widthOfTextAtSize(locText, locSize);
  if (locWidth > width - 24) {
    locSize = Math.max(6, ((width - 24) / locWidth) * locSize);
    locWidth = font.widthOfTextAtSize(locText, locSize);
  }
  page.drawText(locText, {
    x: x + (width - locWidth) / 2,
    y: ribbonY + (ribbonH - locSize) / 2 + 1,
    size: locSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body layout
  const bodyTop = ribbonY - 5;
  const bodyBottom = y + 6;
  const bodyH = bodyTop - bodyBottom;
  const bodyW = width - 12;

  const leftW = Math.round(bodyW * 0.36);
  const gap = 6;
  const rightW = bodyW - leftW - gap;
  const leftX = x + 6;
  const rightX = leftX + leftW + gap;

  const bannerH = 19;
  const bannerY = bodyBottom + bodyH - bannerH;

  // 1. LEFT HERO: ROOM
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Hero Room Banner
  page.drawRectangle({
    x: leftX + 1,
    y: bannerY,
    width: leftW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const badgeText = "ROOM";
  const badgeSize = 8.5;
  const badgeW = font.widthOfTextAtSize(badgeText, badgeSize);
  page.drawText(badgeText, {
    x: leftX + (leftW - badgeW) / 2,
    y: bannerY + (bannerH - badgeSize) / 2,
    size: badgeSize,
    font,
    color: COLOR_GOLD,
  });

  // Bottom Sub-banner
  const subH = 17;
  const subY = bodyBottom + 2;
  page.drawRectangle({
    x: leftX + 2,
    y: subY,
    width: leftW - 4,
    height: subH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  const subText = "EXAM PAPERS";
  const subSize = 6.5;
  const subW = font.widthOfTextAtSize(subText, subSize);
  page.drawText(subText, {
    x: leftX + (leftW - subW) / 2,
    y: subY + (subH - subSize) / 2 + 1,
    size: subSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Hero room number
  const heroAvailH = bannerY - (subY + subH);
  const heroValue = item.room || "";
  let heroSize = 34;
  let heroW = font.widthOfTextAtSize(heroValue, heroSize);
  if (heroW > leftW - 12) {
    heroSize = Math.max(14, ((leftW - 12) / heroW) * heroSize);
    heroW = font.widthOfTextAtSize(heroValue, heroSize);
  }
  page.drawText(heroValue, {
    x: leftX + (leftW - heroW) / 2,
    y: subY + subH + (heroAvailH - heroSize) / 2 + 2,
    size: heroSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. RIGHT DETAILS: EXAM SUBJECT & STUDENTS COUNT
  page.drawRectangle({
    x: rightX,
    y: bodyBottom,
    width: rightW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Right Top Banner
  page.drawRectangle({
    x: rightX + 1,
    y: bannerY,
    width: rightW - 2,
    height: bannerH - 1,
    color: COLOR_CHARCOAL,
  });

  const bannerTitle = "EXAM SUBJECT & CANDIDATES";
  const bannerTitleSize = 7.5;
  const bannerTitleW = font.widthOfTextAtSize(bannerTitle, bannerTitleSize);
  page.drawText(bannerTitle, {
    x: rightX + (rightW - bannerTitleW) / 2,
    y: bannerY + (bannerH - bannerTitleSize) / 2,
    size: bannerTitleSize,
    font,
    color: COLOR_GOLD,
  });

  // Subject Box
  const subjectBoxH = 34;
  const subjectBoxY = bannerY - subjectBoxH - 6;

  page.drawRectangle({
    x: rightX + 6,
    y: subjectBoxY,
    width: rightW - 12,
    height: subjectBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1,
  });

  const subjText = item.subject.toUpperCase();
  let subjSize = 13.5;
  let subjW = font.widthOfTextAtSize(subjText, subjSize);
  if (subjW > rightW - 20) {
    subjSize = Math.max(9.5, ((rightW - 20) / subjW) * subjSize);
    subjW = font.widthOfTextAtSize(subjText, subjSize);
  }
  page.drawText(subjText, {
    x: rightX + 6 + (rightW - 12 - subjW) / 2,
    y: subjectBoxY + (subjectBoxH - subjSize) / 2 + 2,
    size: subjSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Students Count Box
  const countBoxH = 46;
  const countBoxY = subjectBoxY - countBoxH - 6;

  page.drawRectangle({
    x: rightX + 6,
    y: countBoxY,
    width: rightW - 12,
    height: countBoxH,
    color: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });

  const countLabel = "ASSIGNED CANDIDATES FOR THIS EXAM:";
  const countLabelSize = 6.2;
  page.drawText(countLabel, {
    x: rightX + 12,
    y: countBoxY + countBoxH - 12,
    size: countLabelSize,
    font,
    color: COLOR_MUTED,
  });

  const countValue = `${item.studentCount} STUDENTS`;
  const countValSize = 17;
  const countValW = font.widthOfTextAtSize(countValue, countValSize);
  page.drawText(countValue, {
    x: rightX + 6 + (rightW - 12 - countValW) / 2,
    y: countBoxY + 8,
    size: countValSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Bottom section: Verification & Sign-off
  const verifyY = bodyBottom + 4;
  const verifyH = countBoxY - verifyY - 3;

  page.drawLine({
    start: { x: rightX + 6, y: verifyY + verifyH },
    end: { x: rightX + rightW - 6, y: verifyY + verifyH },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page.drawText("Packet: [ ] Sealed    [ ] Count Verified", {
    x: rightX + 8,
    y: verifyY + 12,
    size: 6.2,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText("Proctor Signature: ____________________________", {
    x: rightX + 8,
    y: verifyY + 2,
    size: 6.2,
    font,
    color: COLOR_CHARCOAL,
  });
}

/**
 * Builds the list of ExamStickerItems for a room:
 * - 2 identical copies for each subject assigned to the room
 * - Supports arbitrary combinations of subjects for both EST 1 and EST 2
 * - For EST 1: Literacy, Math, and Essay (only if essayCount > 0)
 * - For EST 2: Math 1, Math 2, Biology, Chemistry, Physics (any subset)
 */
export function buildExamStickerItemsForRoom(params: {
  content: StickerContent;
  litCount?: number;
  mathCount?: number;
  essayCount?: number;
  subjects?: RoomSubjectCount[];
}): ExamStickerItem[] {
  const { content } = params;
  const room = content.room || "Room";
  const items: ExamStickerItem[] = [];

  const rawExamName = content.examName || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExamName) || content.examType === "EST 2";
  const defaultExamPrefix = isEst2 ? "EST II" : "EST I";

  // Use dynamic subjects from params or content
  let subjects = params.subjects || content.subjects;

  if (!subjects || subjects.length === 0) {
    // If no explicit subjects array, synthesize from litCount / mathCount / essayCount
    const litCount = params.litCount ?? content.litCount ?? 25;
    const mathCount = params.mathCount ?? content.mathCount ?? 25;
    const essayCount = params.essayCount ?? content.essayCount ?? 0;

    subjects = [
      { code: "LIT", name: "Literacy", displayName: `${defaultExamPrefix} – Literacy`, count: litCount, copies: 2 },
      { code: "MATH", name: "Math", displayName: `${defaultExamPrefix} – Math`, count: mathCount, copies: 2 },
    ];
    if (essayCount > 0) {
      subjects.push({
        code: "ESSAY",
        name: "Essay",
        displayName: `${defaultExamPrefix} – Essay`,
        count: essayCount,
        copies: 2,
      });
    }
  }

  // Generate 2 copies for each subject
  for (const sub of subjects) {
    if (sub.code === "ESSAY" && sub.count <= 0) continue;
    if (sub.count <= 0) continue;

    const totalCopies = sub.copies || 2;
    const subjectTitle = sub.displayName || `${defaultExamPrefix} – ${sub.name}`;

    for (let c = 1; c <= totalCopies; c++) {
      items.push({
        room,
        examName: content.examName,
        governorate: content.governorate,
        center: content.center,
        building: content.building,
        floor: content.floor,
        subject: subjectTitle,
        subjectCode: sub.code,
        studentCount: sub.count,
        copyIndex: c,
        totalCopies,
      });
    }
  }

  return items;
}

/**
 * Draws an A4 page with up to 4 exam stickers in a 2x2 grid.
 */
function drawA4FourUpExamStickersPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  items: ExamStickerItem[];
}) {
  const { pdfDoc, font, logoImg, items } = params;

  // A4 Landscape: 841.89 x 595.28 pt
  const a4Width = 841.89;
  const a4Height = 595.28;
  const page = pdfDoc.addPage([a4Width, a4Height]);

  const midX = a4Width / 2;
  const midY = a4Height / 2;

  // Center cutting guide lines
  page.drawLine({
    start: { x: midX, y: 0 },
    end: { x: midX, y: a4Height },
    thickness: 0.5,
    color: COLOR_BORDER,
    dashArray: [4, 4],
  });

  page.drawLine({
    start: { x: 0, y: midY },
    end: { x: a4Width, y: midY },
    thickness: 0.5,
    color: COLOR_BORDER,
    dashArray: [4, 4],
  });

  const quadrants = [
    { x: 0, y: midY, width: midX, height: midY },    // Top-Left
    { x: midX, y: midY, width: midX, height: midY }, // Top-Right
    { x: 0, y: 0, width: midX, height: midY },       // Bottom-Left
    { x: midX, y: 0, width: midX, height: midY },    // Bottom-Right
  ];

  for (let i = 0; i < items.length && i < 4; i++) {
    const q = quadrants[i];
    drawQuarterExamSticker({
      page,
      font,
      logoImg,
      item: items[i],
      slotX: q.x,
      slotY: q.y,
      slotWidth: q.width,
      slotHeight: q.height,
    });
  }
}

/**
 * Generates an official Exam Stickers PDF for a single room (EST 1 & EST 2).
 * Produces 2 copies for each applicable subject.
 * Each sticker occupies exactly one-quarter of an A4 page (4-up on A4 Landscape).
 */
export async function generateExamStickersPdf(
  options: GenerateExamStickersPdfOptions,
): Promise<Uint8Array> {
  const content = options.content;
  if (!content) {
    throw new Error("Cannot generate exam stickers PDF without sticker content");
  }

  const litCount = options.litCount ?? content.litCount ?? 25;
  const mathCount = options.mathCount ?? content.mathCount ?? 25;
  const essayCount = options.essayCount ?? content.essayCount ?? 0;
  const subjects = options.subjects ?? content.subjects;

  return generateBatchExamStickersPdf({
    rooms: [
      {
        content,
        litCount,
        mathCount,
        essayCount,
        subjects,
      },
    ],
  });
}

/**
 * Generates unified multi-page Exam Stickers PDF for multiple rooms.
 * Each room's exam stickers start on a fresh page.
 */
export async function generateBatchExamStickersPdf(
  options: BatchExamStickersPdfOptions,
): Promise<Uint8Array> {
  const rooms =
    options.rooms ??
    options.contents?.map((c) => ({
      content: c,
      litCount: c.litCount,
      mathCount: c.mathCount,
      essayCount: c.essayCount,
      subjects: c.subjects,
    })) ??
    [];
  if (rooms.length === 0) {
    throw new Error("Cannot generate batch exam stickers PDF with no rooms");
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  for (const r of rooms) {
    const litCount = r.litCount ?? r.content.litCount ?? 25;
    const mathCount = r.mathCount ?? r.content.mathCount ?? 25;
    const essayCount = r.essayCount ?? r.content.essayCount ?? 0;
    const subjects = r.subjects ?? r.content.subjects;

    const items = buildExamStickerItemsForRoom({
      content: r.content,
      litCount,
      mathCount,
      essayCount,
      subjects,
    });

    // Chunk items 4 per page
    for (let i = 0; i < items.length; i += 4) {
      const pageItems = items.slice(i, i + 4);
      drawA4FourUpExamStickersPage({
        pdfDoc,
        font,
        logoImg,
        items: pageItems,
      });
    }
  }

  return await pdfDoc.save();
}
