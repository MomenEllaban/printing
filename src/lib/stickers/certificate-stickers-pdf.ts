import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";

export interface CertificateStudentData {
  id?: string;
  studentName: string;
  seatNumber?: string;
  nationalId?: string;
  schoolName?: string;
  governorate?: string;
  examName?: string;
  sessionName?: string;
  certificateCode?: string;
  subjects?: string;
  score?: string;
  status?: string;
  notes?: string;
}

export interface CertificateStickersOptions {
  sessionName?: string;
  examName?: string;
  students: CertificateStudentData[];
  layout?: "grid_4_per_a4" | "single_quarter_a4";
}

const COLOR_CHARCOAL = rgb(0.12, 0.12, 0.12);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_GOLD = rgb(0.85, 0.70, 0.08); // EST yellow/gold accent
const COLOR_EMERALD = rgb(0.06, 0.48, 0.32); // Certificate Emerald Green
const COLOR_EMERALD_SOFT = rgb(0.92, 0.97, 0.94);
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97);
const COLOR_BORDER = rgb(0.80, 0.80, 0.80);
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
 * Generates Quarter-A4 Student Certificate Stickers PDF.
 * Arranges 4 stickers per A4 Landscape sheet in a 2x2 grid.
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
          studentName: "Mohamed Ahmed Ali",
          seatNumber: "10245",
          nationalId: "30501011234567",
          schoolName: "Al Alamiya Modern School",
          governorate: "Cairo",
          examName: "EST I",
          sessionName: "December 2026",
          certificateCode: "CERT-2026-0001",
          subjects: "Literacy & Mathematics",
        },
      ];

  // A4 Landscape: 841.89 x 595.28 pt
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

  // Outer Framing Card
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2,
  });

  // Inner Certificate Emerald & Gold Accent Frame
  page.drawRectangle({
    x: x + 3.5,
    y: y + 3.5,
    width: width - 7,
    height: height - 7,
    borderColor: COLOR_EMERALD,
    borderWidth: 1.2,
  });

  // Header Bar
  const headerH = 38;
  const headerY = y + height - headerH - 6;

  // Top decorative bar
  page.drawRectangle({
    x: x + 5,
    y: headerY + headerH - 3,
    width: width - 10,
    height: 3,
    color: COLOR_GOLD,
  });

  // Logo
  const logoH = 26;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = x + 10;
  const logoY = headerY + (headerH - logoH) / 2 - 1;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 8 : x + 10;
  const exam = student.examName || globalOptions.examName || "EST";
  const session = student.sessionName || globalOptions.sessionName || "Official Session";

  page.drawText(`${exam} — OFFICIAL STUDENT CERTIFICATE`, {
    x: textStartX,
    y: headerY + 18,
    size: 9.5,
    font,
    color: COLOR_EMERALD,
  });

  page.drawText(`CERTIFICATE DISPATCH PLACARD • ${session.toUpperCase()}`, {
    x: textStartX,
    y: headerY + 6,
    size: 7,
    font,
    color: COLOR_MUTED,
  });

  // Right Top Badge: Index
  const badgeText = `${stickerIndex} / ${totalStickers}`;
  const badgeW = 60;
  const badgeH = 18;
  const badgeX = x + width - badgeW - 10;
  const badgeY = headerY + 10;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: COLOR_CHARCOAL,
  });

  const bTextW = font.widthOfTextAtSize(badgeText, 7.5);
  page.drawText(badgeText, {
    x: badgeX + (badgeW - bTextW) / 2,
    y: badgeY + 5,
    size: 7.5,
    font,
    color: COLOR_GOLD,
  });

  // Divider
  page.drawLine({
    start: { x: x + 8, y: headerY - 2 },
    end: { x: x + width - 8, y: headerY - 2 },
    thickness: 1,
    color: COLOR_GOLD,
  });

  // 1. Candidate Name Highlight Box
  const nameBoxH = 46;
  const nameBoxY = headerY - 4 - nameBoxH;

  page.drawRectangle({
    x: x + 8,
    y: nameBoxY,
    width: width - 16,
    height: nameBoxH,
    color: COLOR_EMERALD_SOFT,
    borderColor: COLOR_EMERALD,
    borderWidth: 1,
  });

  page.drawText("CANDIDATE NAME / اسم الطالب المعتمد:", {
    x: x + 16,
    y: nameBoxY + nameBoxH - 14,
    size: 7.5,
    font,
    color: COLOR_EMERALD,
  });

  const displayName = student.studentName.toUpperCase();
  const nameFontSize = displayName.length > 28 ? 12 : displayName.length > 20 ? 14 : 16;
  page.drawText(displayName, {
    x: x + 16,
    y: nameBoxY + 10,
    size: nameFontSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. Three Identifiers Row (Seat No, National ID, Certificate Code)
  const idRowH = 38;
  const idRowY = nameBoxY - 6 - idRowH;
  const colW = (width - 16 - 12) / 3;

  // Box A: Seat Number (Prominent!)
  const boxAX = x + 8;
  page.drawRectangle({
    x: boxAX,
    y: idRowY,
    width: colW,
    height: idRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("SEAT NUMBER:", {
    x: boxAX + 8,
    y: idRowY + idRowH - 12,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(student.seatNumber || "—", {
    x: boxAX + 8,
    y: idRowY + 9,
    size: 14,
    font,
    color: COLOR_CHARCOAL,
  });

  // Box B: National ID
  const boxBX = boxAX + colW + 6;
  page.drawRectangle({
    x: boxBX,
    y: idRowY,
    width: colW,
    height: idRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("NATIONAL ID / الرقم القومي:", {
    x: boxBX + 8,
    y: idRowY + idRowH - 12,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(student.nationalId || "—", {
    x: boxBX + 8,
    y: idRowY + 9,
    size: 11,
    font,
    color: COLOR_CHARCOAL,
  });

  // Box C: Certificate Code
  const boxCX = boxBX + colW + 6;
  page.drawRectangle({
    x: boxCX,
    y: idRowY,
    width: colW,
    height: idRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("CERTIFICATE CODE:", {
    x: boxCX + 8,
    y: idRowY + idRowH - 12,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(student.certificateCode || `EST-${student.seatNumber || "CERT"}`, {
    x: boxCX + 8,
    y: idRowY + 9,
    size: 11,
    font,
    color: COLOR_EMERALD,
  });

  // 3. School & Examination Details Grid
  const detailsY = idRowY - 6 - 54;
  const detailsH = 54;

  page.drawRectangle({
    x: x + 8,
    y: detailsY,
    width: width - 16,
    height: detailsH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  const halfW = (width - 16) / 2;

  // School
  page.drawText("SCHOOL / TEST CENTER:", {
    x: x + 14,
    y: detailsY + detailsH - 14,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  const schoolText = student.schoolName || "Official EST Test Center";
  page.drawText(schoolText.slice(0, 36), {
    x: x + 14,
    y: detailsY + detailsH - 26,
    size: 9.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Governorate
  page.drawText("GOVERNORATE:", {
    x: x + halfW + 10,
    y: detailsY + detailsH - 14,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(student.governorate || "All Governorates", {
    x: x + halfW + 10,
    y: detailsY + detailsH - 26,
    size: 9.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Subjects / Notes row
  page.drawText("CERTIFIED SUBJECTS / المواد:", {
    x: x + 14,
    y: detailsY + 12,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  const subjText = student.subjects || `${exam} Certified Curriculum`;
  page.drawText(subjText.slice(0, 38), {
    x: x + 14,
    y: detailsY + 2,
    size: 8.5,
    font,
    color: COLOR_CHARCOAL,
  });

  // Status / Score
  page.drawText("STATUS / SCORE:", {
    x: x + halfW + 10,
    y: detailsY + 12,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });
  const statusText = student.score ? `Score: ${student.score}` : (student.status || "OFFICIALLY CERTIFIED ✓");
  page.drawText(statusText, {
    x: x + halfW + 10,
    y: detailsY + 2,
    size: 8.5,
    font,
    color: COLOR_EMERALD,
  });

  // 4. Bottom Official Dispatch & Verification Footer
  const footerH = 34;
  const footerY = y + 8;

  page.drawRectangle({
    x: x + 8,
    y: footerY,
    width: width - 16,
    height: footerH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });

  // Barcode representation
  const barcodeX = x + 14;
  const barcodeW = 85;
  const barcodeH = 14;
  const barcodeY = footerY + 14;

  // Draw simulated barcode lines
  page.drawRectangle({
    x: barcodeX,
    y: barcodeY,
    width: barcodeW,
    height: barcodeH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 0.5,
  });

  // Draw vertical bars
  const seed = (student.seatNumber || "123456").split("");
  for (let b = 0; b < 24; b++) {
    const isThick = b % 3 === 0 || seed[b % seed.length] === "5";
    page.drawLine({
      start: { x: barcodeX + 4 + b * 3.2, y: barcodeY + 2 },
      end: { x: barcodeX + 4 + b * 3.2, y: barcodeY + barcodeH - 2 },
      thickness: isThick ? 1.6 : 0.8,
      color: COLOR_CHARCOAL,
    });
  }

  page.drawText(`*${student.seatNumber || student.certificateCode || "EST-CERT"}*`, {
    x: barcodeX,
    y: footerY + 4,
    size: 6.5,
    font,
    color: COLOR_MUTED,
  });

  // Official Seal Notice
  const sealX = barcodeX + barcodeW + 14;
  page.drawText("OFFICIAL CERTIFICATE SEAL — DO NOT BREAK", {
    x: sealX,
    y: footerY + 20,
    size: 7,
    font,
    color: COLOR_EMERALD,
  });

  page.drawText("ENSURE INTEGRITY OF PACKET BEFORE HANDING TO STUDENT", {
    x: sealX,
    y: footerY + 9,
    size: 6,
    font,
    color: COLOR_MUTED,
  });

  // Stamp Box on Right
  const stampW = 72;
  const stampH = 26;
  const stampX = x + width - 16 - stampW - 4;
  const stampY = footerY + (footerH - stampH) / 2;

  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    color: COLOR_WHITE,
    borderColor: COLOR_EMERALD,
    borderWidth: 1,
  });

  page.drawText("EST VERIFIED", {
    x: stampX + 8,
    y: stampY + 14,
    size: 7,
    font,
    color: COLOR_EMERALD,
  });
  page.drawText("ISSUANCE 2026", {
    x: stampX + 8,
    y: stampY + 5,
    size: 6,
    font,
    color: COLOR_MUTED,
  });
}
