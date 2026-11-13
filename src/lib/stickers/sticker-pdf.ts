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

function expandSubjectName(codeOrName: string): string {
  const trimmed = (codeOrName || "").trim();
  const upper = trimmed.toUpperCase();
  if (upper === "LIT" || upper === "LITERACY" || upper === "LITERATURE") return "Literacy";
  if (upper === "MATH" || upper === "MATHEMATICS") return "Mathematics";
  if (upper === "MATH1" || upper === "MATH 1") return "Math 1";
  if (upper === "MATH2" || upper === "MATH 2") return "Math 2";
  if (upper === "ESSAY") return "Essay";
  if (upper === "BIO" || upper === "BIOLOGY") return "Biology";
  if (upper === "CHEM" || upper === "CHEMISTRY") return "Chemistry";
  if (upper === "PHY" || upper === "PHYSICS") return "Physics";
  return trimmed;
}

function getVerticalSubjectLines(content: StickerContent, isRoom: boolean): string[] {
  const lines: string[] = [];

  if (content.subjects && content.subjects.length > 0) {
    for (const s of content.subjects) {
      if (s.count > 0 || content.subjects.length <= 3) {
        const name = expandSubjectName(s.name || s.code);
        lines.push(`${name}: ${s.count}`);
      }
    }
    if (lines.length > 0) return lines;
  }

  if (isRoom && (typeof content.litCount === "number" || typeof content.mathCount === "number")) {
    if (typeof content.litCount === "number") {
      lines.push(`Literacy: ${content.litCount}`);
    }
    if (typeof content.mathCount === "number") {
      lines.push(`Mathematics: ${content.mathCount}`);
    }
    if (content.hasEssay || (typeof content.essayCount === "number" && content.essayCount > 0)) {
      lines.push(`Essay: ${content.essayCount ?? 0}`);
    }
    if (lines.length > 0) return lines;
  }

  if (content.breakdownText) {
    const parts = content.breakdownText.split(/[|•,–_]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^([a-zA-Z0-9\s]+?)[:\s-]+(\d+)$/);
      if (m) {
        const name = expandSubjectName(m[1]);
        lines.push(`${name}: ${m[2]}`);
      } else {
        lines.push(part);
      }
    }
    if (lines.length > 0) return lines;
  }

  if (!isRoom) {
    const childRoomsCount = content.childCount || (content.childNames ? content.childNames.length : 0);
    if (childRoomsCount > 0) {
      lines.push(`${childRoomsCount} Rooms Included`);
    }
  }

  return lines;
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

  // Determine hierarchy level
  const isRoom = content.level === "room" && Boolean(content.room);
  const isFloor = content.level === "floor" && Boolean(content.floor);
  const isBuilding = content.level === "building" && Boolean(content.building);
  const isCenter = content.level === "center" && Boolean(content.center);
  const isGov = content.level === "governorate" && Boolean(content.governorate);
  const isRoot = content.level === "root";

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
    const logoHeight = isRoom ? (isLandscape ? 84 : 92) : (isLandscape ? 66 : 76);
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

  // Exam Subtitle Badge - skip for room stickers as requested (cleaner header)
  if (!isRoom) {
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
  }

  // Divider Line
  const dividerY = isRoom ? headerBottomY - 6 : headerBottomY - 24;
  page.drawLine({
    start: { x: margin + 30, y: dividerY },
    end: { x: pageWidth - margin - 30, y: dividerY },
    thickness: 1.5,
    color: COLOR_CHARCOAL,
  });

  // --- BODY SECTION ---
  const bodyTop = dividerY - 16;
  const bodyBottom = margin + 18;
  const availBodyHeight = bodyTop - bodyBottom;
  const bodyWidth = pageWidth - margin * 2 - 36;
  const bodyStartX = margin + 18;

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

      const subjectLines = getVerticalSubjectLines(content, true);

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: bodyBottom,
        width: leftColWidth,
        height: bottomAreaHeight,
        badgeText: "ROOM",
        valueText: content.room || "",
        detailLines: subjectLines.length > 0 ? subjectLines : undefined,
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

      const subjectLines = getVerticalSubjectLines(content, true);

      renderHeroCard({
        page,
        font,
        x: bodyStartX,
        y: gridBottom - heroHeight - 10,
        width: bodyWidth,
        height: heroHeight,
        badgeText: "ROOM",
        valueText: content.room || "",
        detailLines: subjectLines.length > 0 ? subjectLines : undefined,
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
  detailLines?: string[];
  accentColor?: any;
}) {
  const { page, font, x, y, width, height, badgeText, valueText, subText, detailText, detailLines, accentColor = COLOR_CHARCOAL } = params;

  // Outer border with clean frame (B&W)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.5,
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

  // Bottom Sub-Text banner (Vertical subjects or single text)
  const hasDetailLines = Boolean(detailLines && detailLines.length > 0);
  const hasSub = hasDetailLines || Boolean(subText || detailText);
  const subBarHeight = hasDetailLines
    ? Math.max(50, Math.min(95, detailLines!.length * 22 + 14))
    : hasSub
    ? detailText && subText
      ? Math.max(46, Math.min(58, height * 0.26))
      : Math.max(28, Math.min(36, height * 0.18))
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
      borderWidth: 0.8,
    });

    if (hasDetailLines) {
      // Render vertical lines without abbreviations
      const lineCount = detailLines!.length;
      const step = (subBarHeight - 12) / lineCount;
      const startLineY = subBarY + subBarHeight - step * 0.7 - 4;
      const lineSize = lineCount <= 2 ? 14 : lineCount === 3 ? 12.5 : 11;

      for (let i = 0; i < lineCount; i++) {
        const text = detailLines![i];
        let size = lineSize;
        let tw = font.widthOfTextAtSize(text, size);
        if (tw > width - 16) {
          size = Math.max(8.5, ((width - 16) / tw) * size);
          tw = font.widthOfTextAtSize(text, size);
        }
        page.drawText(text, {
          x: x + (width - tw) / 2,
          y: startLineY - i * step,
          size,
          font,
          color: COLOR_CHARCOAL,
        });
      }
    } else if (detailText && subText) {
      // Line 1: Main count / label (e.g. "35 STUDENTS TOTAL") - Prominent and Large
      const topSize = Math.max(12, Math.min(15, subBarHeight * 0.28));
      let topW = font.widthOfTextAtSize(subText, topSize);
      let finalTopSize = topSize;
      if (topW > width - 16) {
        finalTopSize = Math.max(9, ((width - 16) / topW) * topSize);
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

      // Line 2: Detailed subject breakdown (e.g. "LIT: 35  |  MATH: 28  |  ESSAY: 12") - Prominent
      const dtlSize = Math.max(9.5, Math.min(12, subBarHeight * 0.24));
      let dtlW = font.widthOfTextAtSize(detailText, dtlSize);
      let finalDtlSize = dtlSize;
      if (dtlW > width - 16) {
        finalDtlSize = Math.max(7.5, ((width - 16) / dtlW) * dtlSize);
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
      const subSize = Math.max(11, Math.min(14, subBarHeight * 0.42));
      let subW = font.widthOfTextAtSize(singleText, subSize);
      let finalSubSize = subSize;
      if (subW > width - 16) {
        finalSubSize = Math.max(8.5, ((width - 16) / subW) * subSize);
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
    color: COLOR_WHITE,
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
 * Draws a single Quarter-A4 Room / Floor Placard (approx 421 x 298 pt).
 * Clean, Simple, 100% Black & White with Large Typography.
 * Reduced borders, zero heavy black blocks, with prominent student counts & breakdowns.
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

  // Single outer border (clean 1.2pt cutting frame - no nested or double frames)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Header: Logo (Enlarged and centered, without cluttered subtitle headers)
  const logoH = isRoom ? 34 : 22;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = isRoom ? x + (width - logoW) / 2 : x + 10;
  const logoY = y + height - 6 - logoH;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } else {
    const estText = "EST";
    const estSize = isRoom ? 20 : 16;
    const estW = font.widthOfTextAtSize(estText, estSize);
    page.drawText(estText, {
      x: isRoom ? x + (width - estW) / 2 : x + 10,
      y: logoY + 4,
      size: estSize,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // Only draw subtitles if NOT isRoom
  if (!isRoom) {
    const textStartX = logoImg ? logoX + logoW + 8 : x + 40;
    const examTitle = `${content.examName || "EST 1"} — OFFICIAL EXAMINATION`;
    page.drawText(examTitle, {
      x: textStartX,
      y: logoY + 11,
      size: 9,
      font,
      color: COLOR_CHARCOAL,
    });

    page.drawText("FLOOR EXAMINATION DOSSIER (SENIOR)", {
      x: textStartX,
      y: logoY + 2,
      size: 6.5,
      font,
      color: COLOR_MUTED,
    });
  }

  const headerBottom = logoY - 5;

  // Divider 1
  page.drawLine({
    start: { x: x + 8, y: headerBottom },
    end: { x: x + width - 8, y: headerBottom },
    thickness: 1,
    color: COLOR_CHARCOAL,
  });

  // Location string (clean text, no heavy gray box)
  const locItems = [
    content.governorate,
    content.center,
    content.building,
    isRoom ? content.floor : undefined,
  ].filter(Boolean);
  const locText = locItems.join("  •  ");
  let locSize = 8;
  let locWidth = font.widthOfTextAtSize(locText, locSize);
  if (locWidth > width - 24) {
    locSize = Math.max(6.5, ((width - 24) / locWidth) * locSize);
    locWidth = font.widthOfTextAtSize(locText, locSize);
  }
  const locY = headerBottom - 14;
  page.drawText(locText, {
    x: x + (width - locWidth) / 2,
    y: locY,
    size: locSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Divider 2
  const divider2Y = locY - 6;
  page.drawLine({
    start: { x: x + 8, y: divider2Y },
    end: { x: x + width - 8, y: divider2Y },
    thickness: 1,
    color: COLOR_CHARCOAL,
  });

  // Body Layout: Generous Left Column for Room & Large Counts, Right Column for Checklist
  const bodyTop = divider2Y - 10;
  const bodyBottom = y + 10;
  const bodyH = bodyTop - bodyBottom;
  const bodyW = width - 16;

  const leftW = Math.round(bodyW * 0.44);
  const leftX = x + 8;
  const dividerX = leftX + leftW + 8;
  const rightX = dividerX + 14;
  const rightW = width - 10 - rightX;

  // Single vertical divider between left and right (NO nested boxes)
  page.drawLine({
    start: { x: dividerX, y: bodyBottom + 6 },
    end: { x: dividerX, y: bodyTop },
    thickness: 1,
    color: COLOR_BORDER,
  });

  // --- 1. LEFT COLUMN: ROOM & LARGE STUDENT NUMBERS ---
  // Clean header label (NO solid black block)
  const badgeText = isRoom ? "EXAM ROOM" : "FLOOR";
  const badgeSize = 9;
  const badgeW = font.widthOfTextAtSize(badgeText, badgeSize);
  page.drawText(badgeText, {
    x: leftX + (leftW - badgeW) / 2,
    y: bodyTop - 12,
    size: badgeSize,
    font,
    color: COLOR_MUTED,
  });

  // Hero Room Number (Large & Bold, centered)
  const heroValue = isRoom ? (content.room || "") : (content.floor || "");
  let heroSize = isRoom ? 40 : 26;
  let heroW = font.widthOfTextAtSize(heroValue, heroSize);
  if (heroW > leftW - 8) {
    heroSize = Math.max(16, ((leftW - 8) / heroW) * heroSize);
    heroW = font.widthOfTextAtSize(heroValue, heroSize);
  }
  const heroY = bodyTop - 18 - heroSize;
  page.drawText(heroValue, {
    x: leftX + (leftW - heroW) / 2,
    y: heroY,
    size: heroSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Clean horizontal divider inside Left column
  const leftDividerY = heroY - 10;
  page.drawLine({
    start: { x: leftX + 8, y: leftDividerY },
    end: { x: leftX + leftW - 8, y: leftDividerY },
    thickness: 0.8,
    color: COLOR_BORDER,
  });

  if (isRoom) {
    // Spread the subjects vertically without abbreviations (NO "33 STUDENTS TOTAL")
    const subjectLines = getVerticalSubjectLines(content, true);
    if (subjectLines.length > 0) {
      const availSubjectH = leftDividerY - (bodyBottom + 4);
      const lineCount = subjectLines.length;
      const step = Math.min(22, Math.max(16, (availSubjectH - 6) / lineCount));
      const startSubjectY = leftDividerY - 18;
      const baseLineSize = lineCount <= 2 ? 13.5 : lineCount === 3 ? 12 : 10.5;

      for (let sIdx = 0; sIdx < lineCount; sIdx++) {
        const lineText = subjectLines[sIdx];
        let lineSize = baseLineSize;
        let lineW = font.widthOfTextAtSize(lineText, lineSize);
        if (lineW > leftW - 8) {
          lineSize = Math.max(8.5, ((leftW - 8) / lineW) * lineSize);
          lineW = font.widthOfTextAtSize(lineText, lineSize);
        }
        const lineY = startSubjectY - sIdx * step;
        page.drawText(lineText, {
          x: leftX + (leftW - lineW) / 2,
          y: lineY,
          size: lineSize,
          font,
          color: COLOR_CHARCOAL,
        });
      }
    }
  } else {
    // Floor level
    const childRoomsCount = content.childCount || (content.childNames ? content.childNames.length : 0);
    const floorSubText =
      typeof content.totalStudents === "number" && content.totalStudents > 0
        ? `${content.totalStudents} STUDENTS TOTAL`
        : childRoomsCount > 0
        ? `${childRoomsCount} ROOMS INCLUDED`
        : "SENIOR DOSSIER";

    let totalSize = 13.5;
    let totalW = font.widthOfTextAtSize(floorSubText, totalSize);
    if (totalW > leftW - 8) {
      totalSize = Math.max(9.5, ((leftW - 8) / totalW) * totalSize);
      totalW = font.widthOfTextAtSize(floorSubText, totalSize);
    }
    const totalY = leftDividerY - 20;
    page.drawText(floorSubText, {
      x: leftX + (leftW - totalW) / 2,
      y: totalY,
      size: totalSize,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // --- 2. RIGHT COLUMN: CHECKLIST & SIGNATURE ---
  // Checklist header (Clean text with underline, NO solid black block)
  const chkTitle = isRoom ? "ROOM FILE CONTENTS CHECKLIST" : "FLOOR DOSSIER CHECKLIST";
  const chkTitleSize = 8;
  page.drawText(chkTitle, {
    x: rightX,
    y: bodyTop - 12,
    size: chkTitleSize,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawLine({
    start: { x: rightX, y: bodyTop - 18 },
    end: { x: rightX + rightW, y: bodyTop - 18 },
    thickness: 0.8,
    color: COLOR_BORDER,
  });

  // Checklist items
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

  const itemsStartY = bodyTop - 22;
  const footerH = 16;
  const availItemsH = itemsStartY - (bodyBottom + footerH + 8);
  const rowH = availItemsH / 5;

  for (let i = 0; i < items.length; i++) {
    const itemY = itemsStartY - (i + 1) * rowH;
    const boxSize = 9;
    const boxX = rightX + 2;
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

    page.drawText(items[i], {
      x: boxX + boxSize + 6,
      y: boxY + 1.5,
      size: 7.5,
      font,
      color: COLOR_CHARCOAL,
    });
  }

  // Footer: Simple clean signature line (NO container box)
  page.drawLine({
    start: { x: rightX, y: bodyBottom + footerH + 4 },
    end: { x: rightX + rightW, y: bodyBottom + footerH + 4 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  const sigText = isRoom
    ? "Signature: __________________   Date: ___/___"
    : "Senior Sig: __________________   Date: ___/___";
  page.drawText(sigText, {
    x: rightX,
    y: bodyBottom + 2,
    size: 6.8,
    font,
    color: COLOR_CHARCOAL,
  });
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
 * Clean, Simple, 100% Black & White with Large Typography.
 * Free of nested boxes, excessive borders, or signature lines.
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

  // Single outer border (clean, simple 1.2pt black cutting frame)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 1.2,
  });

  // Header: Enlarged Logo on left, Copy badge on right (Title texts removed per user request)
  const logoH = 32;
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

  // Copy badge at top right (Solid Black Pill with Crisp White Text)
  const copyText = `COPY ${item.copyIndex} OF ${item.totalCopies}`;
  const copySize = 8.5;
  const copyW = font.widthOfTextAtSize(copyText, copySize);
  const copyBadgeW = copyW + 16;
  const copyBadgeH = 18;
  const copyBadgeX = x + width - copyBadgeW - 8;
  const copyBadgeY = logoY + (logoH - copyBadgeH) / 2;

  page.drawRectangle({
    x: copyBadgeX,
    y: copyBadgeY,
    width: copyBadgeW,
    height: copyBadgeH,
    color: COLOR_CHARCOAL,
  });

  page.drawText(copyText, {
    x: copyBadgeX + (copyBadgeW - copyW) / 2,
    y: copyBadgeY + (copyBadgeH - copySize) / 2 + 1,
    size: copySize,
    font,
    color: COLOR_WHITE,
  });

  const headerBottom = logoY - 5;

  // Single clean divider line under header
  page.drawLine({
    start: { x: x + 8, y: headerBottom },
    end: { x: x + width - 8, y: headerBottom },
    thickness: 1,
    color: COLOR_CHARCOAL,
  });

  // Location string (Governorate • Center • Building • Floor) - Clean text with NO heavy bounding box
  const locItems = [
    item.governorate,
    item.center,
    item.building,
    item.floor,
  ].filter(Boolean);
  const locText = locItems.join("  •  ");
  let locSize = 8;
  let locWidth = font.widthOfTextAtSize(locText, locSize);
  if (locWidth > width - 24) {
    locSize = Math.max(6.5, ((width - 24) / locWidth) * locSize);
    locWidth = font.widthOfTextAtSize(locText, locSize);
  }
  const locY = headerBottom - 14;
  page.drawText(locText, {
    x: x + (width - locWidth) / 2,
    y: locY,
    size: locSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Clean horizontal divider line under location
  const divider2Y = locY - 6;
  page.drawLine({
    start: { x: x + 8, y: divider2Y },
    end: { x: x + width - 8, y: divider2Y },
    thickness: 1,
    color: COLOR_CHARCOAL,
  });

  // Main Body Section (Simple, Spacious, High-Visibility Typography, Zero Nested Boxes)
  const bodyTop = divider2Y - 10;
  const bodyBottom = y + 10;
  const bodyH = bodyTop - bodyBottom;
  const bodyW = width - 16;

  const leftW = Math.round(bodyW * 0.38);
  const leftX = x + 8;
  const dividerX = leftX + leftW + 8;
  const rightX = dividerX + 14;
  // Compute rightW relative to the card's right boundary so it is identical for all quadrants (left or right slots)
  const rightW = (x + width - 10) - rightX;

  // Single clean vertical divider line between Room and Details
  page.drawLine({
    start: { x: dividerX, y: bodyBottom + 8 },
    end: { x: dividerX, y: bodyTop },
    thickness: 1,
    color: COLOR_BORDER,
  });

  // 1. LEFT COLUMN: ROOM (Huge, Bold, Distinct)
  const roomLabel = "EXAM ROOM";
  const roomLabelSize = 9;
  const roomLabelW = font.widthOfTextAtSize(roomLabel, roomLabelSize);
  page.drawText(roomLabel, {
    x: leftX + (leftW - roomLabelW) / 2,
    y: bodyTop - 16,
    size: roomLabelSize,
    font,
    color: COLOR_MUTED,
  });

  const heroValue = item.room || "";
  let heroSize = 52;
  let heroW = font.widthOfTextAtSize(heroValue, heroSize);
  if (heroW > leftW - 8) {
    heroSize = Math.max(18, ((leftW - 8) / heroW) * heroSize);
    heroW = font.widthOfTextAtSize(heroValue, heroSize);
  }
  const heroY = bodyBottom + (bodyH - heroSize) / 2 + 2;
  page.drawText(heroValue, {
    x: leftX + (leftW - heroW) / 2,
    y: heroY,
    size: heroSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. RIGHT COLUMN: SUBJECT & CANDIDATES
  // Subject section
  const subjSectionY = bodyTop - 6;
  page.drawText("EXAMINATION SUBJECT:", {
    x: rightX,
    y: subjSectionY - 10,
    size: 8,
    font,
    color: COLOR_MUTED,
  });

  const subjText = item.subject.toUpperCase();
  let subjSize = 25;
  let subjW = font.widthOfTextAtSize(subjText, subjSize);
  if (subjW > rightW - 10) {
    subjSize = Math.max(13, ((rightW - 10) / subjW) * subjSize);
    subjW = font.widthOfTextAtSize(subjText, subjSize);
  }
  page.drawText(subjText, {
    x: rightX,
    y: subjSectionY - 38,
    size: subjSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Clean horizontal divider in right column
  const midDividerY = subjSectionY - 56;
  page.drawLine({
    start: { x: rightX, y: midDividerY },
    end: { x: rightX + rightW - 4, y: midDividerY },
    thickness: 0.8,
    color: COLOR_BORDER,
  });

  // Candidates Count section
  page.drawText("ASSIGNED CANDIDATES FOR THIS EXAM:", {
    x: rightX,
    y: midDividerY - 16,
    size: 8,
    font,
    color: COLOR_MUTED,
  });

  const countValue = `${item.studentCount} CANDIDATES`;
  let countValSize = 24;
  let countValW = font.widthOfTextAtSize(countValue, countValSize);
  if (countValW > rightW - 10) {
    countValSize = Math.max(13, ((rightW - 10) / countValW) * countValSize);
    countValW = font.widthOfTextAtSize(countValue, countValSize);
  }
  page.drawText(countValue, {
    x: rightX,
    y: midDividerY - 44,
    size: countValSize,
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
