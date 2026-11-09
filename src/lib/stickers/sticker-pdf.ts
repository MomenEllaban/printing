import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface StickerPdfOptions {
  lines: string[];
  widthMm?: number;
  heightMm?: number;
  paperMode?: "custom" | "a4";
}

const MM_TO_PT = 2.83464567;
const DEFAULT_WIDTH_MM = 100;
const DEFAULT_HEIGHT_MM = 50;

/**
 * Generates a clean, official, print-ready sticker PDF:
 * - Simple, bold, high-contrast black on white.
 * - "EST" is prominent and largest at the top.
 * - Location lines underneath, centered horizontally and vertically.
 * - Auto-scales and fits long text gracefully without clipping.
 * - Exact page dimensions matching the sticker size (e.g. 100mm x 50mm).
 */
export async function generateStickerPdf(options: StickerPdfOptions): Promise<Uint8Array> {
  const lines = (options.lines || []).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error("Cannot generate sticker PDF with no text lines");
  }

  const widthMm = Math.max(30, Math.min(300, options.widthMm ?? DEFAULT_WIDTH_MM));
  const heightMm = Math.max(20, Math.min(200, options.heightMm ?? DEFAULT_HEIGHT_MM));
  const paperMode = options.paperMode ?? "custom";

  const stickerWidthPt = widthMm * MM_TO_PT;
  const stickerHeightPt = heightMm * MM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load custom font supporting both English and Arabic (Arial-Bold.ttf)
  let font: any;
  const fontPath = path.join(process.cwd(), "src", "assets", "fonts", "Arial-Bold.ttf");
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    font = await pdfDoc.embedFont(fontBytes, { subset: true });
  } else {
    // Fallback to standard Helvetica-Bold if custom font file is absent
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Page dimensions
  let pageWidthPt = stickerWidthPt;
  let pageHeightPt = stickerHeightPt;
  let stickerOriginX = 0;
  let stickerOriginY = 0;

  if (paperMode === "a4") {
    // A4 dimensions: 210mm x 297mm in points
    pageWidthPt = 595.28;
    pageHeightPt = 841.89;
    stickerOriginX = (pageWidthPt - stickerWidthPt) / 2;
    stickerOriginY = (pageHeightPt - stickerHeightPt) / 2;
  }

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Safe internal padding (approx 5mm)
  const paddingX = 14;
  const paddingY = 12;
  const availWidth = stickerWidthPt - paddingX * 2;
  const availHeight = stickerHeightPt - paddingY * 2;

  // Determine base font sizes according to number of lines
  const locCount = Math.max(1, lines.length - 1);
  let estFontSize = 26;
  let locFontSize = 14;

  if (locCount === 1) {
    estFontSize = 28;
    locFontSize = 18;
  } else if (locCount === 2) {
    estFontSize = 26;
    locFontSize = 16;
  } else if (locCount === 3) {
    estFontSize = 24;
    locFontSize = 14;
  } else if (locCount === 4) {
    estFontSize = 22;
    locFontSize = 12.5;
  } else {
    estFontSize = 20;
    locFontSize = 11;
  }

  // Calculate size for each line and scale down if line is wider than available width
  const lineItems: Array<{ text: string; size: number; width: number; height: number }> = [];

  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    let size = index === 0 ? estFontSize : locFontSize;
    let width = font.widthOfTextAtSize(text, size);

    if (width > availWidth) {
      const scale = (availWidth * 0.95) / width;
      size = Math.max(7, Math.floor(size * scale * 10) / 10);
      width = font.widthOfTextAtSize(text, size);
    }

    lineItems.push({
      text,
      size,
      width,
      height: size,
    });
  }

  // Calculate total height needed with line spacing
  const lineSpacing = lines.length <= 3 ? 6 : lines.length <= 4 ? 4.5 : 3.5;
  let totalHeight = lineItems.reduce((acc, item) => acc + item.size, 0) + (lines.length - 1) * lineSpacing;

  // If total height exceeds available height, scale down all lines proportionally
  if (totalHeight > availHeight) {
    const scale = (availHeight * 0.95) / totalHeight;
    for (const item of lineItems) {
      item.size = Math.max(6.5, Math.floor(item.size * scale * 10) / 10);
      item.width = font.widthOfTextAtSize(item.text, item.size);
    }
    totalHeight = lineItems.reduce((acc, item) => acc + item.size, 0) + (lines.length - 1) * (lineSpacing * scale);
  }

  // Center vertically inside the sticker area
  const startY = stickerOriginY + (stickerHeightPt + totalHeight) / 2;
  let currentY = startY;

  // Draw lines centered horizontally
  for (let index = 0; index < lineItems.length; index++) {
    const item = lineItems[index];
    const textX = stickerOriginX + (stickerWidthPt - item.width) / 2;
    const textY = currentY - item.size;

    page.drawText(item.text, {
      x: Math.max(stickerOriginX + paddingX / 2, textX),
      y: textY,
      size: item.size,
      font,
      color: rgb(0, 0, 0),
    });

    currentY = textY - lineSpacing;
  }

  return await pdfDoc.save();
}

