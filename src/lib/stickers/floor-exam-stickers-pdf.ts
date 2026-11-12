import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EST_LOGO_BASE64 } from "./est-logo-base64";
import { getDemoDescendants } from "../demo";
import { OFFICIAL_EST_SCHOOLS } from "./est-reference-data";
import { getRoomExamCounts, parseEstRoomFileName } from "./est-room-data";
import type { StickerContent } from "./sticker-content";

export interface FloorRoomSubjectData {
  roomName: string;
  candidateCount: number;
}

export interface FloorSubjectPlacardData {
  subjectCode: string; // e.g. "LIT", "MATH", "ESSAY", "MATH1", "MATH2", "BIO", "CHEM", "PHY"
  subjectName: string; // e.g. "Literacy 1", "Mathematics 1", "Biology", "Chemistry", "Physics", "Essay"
  examType: "EST 1" | "EST 2" | "EST";
  totalRooms: number;
  totalCandidates: number;
  rooms: FloorRoomSubjectData[];
}

export interface FloorExamStickersOptions {
  floorName: string;
  examName?: string;
  governorate?: string;
  center?: string;
  building?: string;
  date?: string;
  subjects: FloorSubjectPlacardData[];
}

const COLOR_CHARCOAL = rgb(0.12, 0.12, 0.12);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_GOLD = rgb(0.85, 0.70, 0.08); // EST yellow/gold accent
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97);
const COLOR_BORDER = rgb(0.82, 0.82, 0.82);
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
 * Generates official Floor Exam Stickers (A4 Landscape Placards).
 * Each subject tested on this floor gets its own dedicated A4 bag placard.
 * Placed on the outside of the floor bag containing the subject's room envelopes.
 */
export async function generateFloorExamStickersPdf(
  options: FloorExamStickersOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await loadStickerFont(pdfDoc);
  const logoImg = await loadLogoImage(pdfDoc);

  const subjects = options.subjects && options.subjects.length > 0
    ? options.subjects
    : [
        {
          subjectCode: "LIT",
          subjectName: "Literacy 1",
          examType: "EST 1" as const,
          totalRooms: 1,
          totalCandidates: 25,
          rooms: [{ roomName: "Room 101", candidateCount: 25 }],
        },
      ];

  const totalSubjects = subjects.length;

  for (let idx = 0; idx < totalSubjects; idx++) {
    const subj = subjects[idx];
    drawFloorSubjectPlacardPage({
      pdfDoc,
      font,
      logoImg,
      options,
      subject: subj,
      subjectIndex: idx,
      totalSubjects,
    });
  }

  return await pdfDoc.save();
}

function drawFloorSubjectPlacardPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  logoImg: any;
  options: FloorExamStickersOptions;
  subject: FloorSubjectPlacardData;
  subjectIndex: number;
  totalSubjects: number;
}) {
  const { pdfDoc, font, logoImg, options, subject, subjectIndex, totalSubjects } = params;

  // A4 Landscape: 841.89 x 595.28 pt
  const width = 841.89;
  const height = 595.28;
  const page = pdfDoc.addPage([width, height]);

  const margin = 22;
  const cardX = margin;
  const cardY = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Outer framing card
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: COLOR_WHITE,
    borderColor: COLOR_CHARCOAL,
    borderWidth: 2.2,
  });

  // Inner Gold Accent border
  page.drawRectangle({
    x: cardX + 4,
    y: cardY + 4,
    width: cardW - 8,
    height: cardH - 8,
    borderColor: COLOR_GOLD,
    borderWidth: 1.2,
  });

  // Header Bar
  const headerH = 58;
  const headerY = cardY + cardH - headerH - 8;
  const logoH = 40;
  const logoW = logoImg ? logoH * (logoImg.width / logoImg.height) : 0;
  const logoX = cardX + 16;
  const logoY = headerY + (headerH - logoH) / 2;

  if (logoImg) {
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  const textStartX = logoImg ? logoX + logoW + 16 : cardX + 16;
  const rawExam = options.examName || subject.examType || "EST";
  const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(rawExam) || subject.examType === "EST 2";
  const examLabel = isEst2 ? "EST II" : "EST I";
  const sessionText = options.date || "OFFICIAL EXAMINATION SESSION";

  page.drawText(`${examLabel} — OFFICIAL EXAMINATION LOGISTICS`, {
    x: textStartX,
    y: headerY + 32,
    size: 14,
    font,
    color: COLOR_CHARCOAL,
  });

  page.drawText(`FLOOR SUBJECT EXAM BAG PLACARD — ${sessionText.toUpperCase()}`, {
    x: textStartX,
    y: headerY + 15,
    size: 9.5,
    font,
    color: COLOR_MUTED,
  });

  // Right Badge: Subject Bag Index
  const badgeText = `BAG ${subjectIndex + 1} OF ${totalSubjects} — ${subject.subjectCode}`;
  const badgeW = 185;
  const badgeH = 32;
  const badgeX = cardX + cardW - badgeW - 16;
  const badgeY = headerY + (headerH - badgeH) / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: COLOR_CHARCOAL,
  });

  const badgeTextW = font.widthOfTextAtSize(badgeText, 9.5);
  page.drawText(badgeText, {
    x: badgeX + (badgeW - badgeTextW) / 2,
    y: badgeY + 11,
    size: 9.5,
    font,
    color: COLOR_GOLD,
  });

  // Divider Line
  page.drawLine({
    start: { x: cardX + 10, y: headerY },
    end: { x: cardX + cardW - 10, y: headerY },
    thickness: 1.5,
    color: COLOR_GOLD,
  });

  // Location Highlight Ribbon (Governorate - Center - Building - Floor)
  const locRibbonY = headerY - 48;
  const locRibbonH = 42;

  page.drawRectangle({
    x: cardX + 12,
    y: locRibbonY,
    width: cardW - 24,
    height: locRibbonH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  const locColW = (cardW - 24) / 4;

  // 1. Governorate
  page.drawText("GOVERNORATE", {
    x: cardX + 20,
    y: locRibbonY + locRibbonH - 13,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.governorate || "All Governorates", {
    x: cardX + 20,
    y: locRibbonY + 8,
    size: 12,
    font,
    color: COLOR_CHARCOAL,
  });

  // 2. Test Center / School
  page.drawText("TEST CENTER / SCHOOL", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + locRibbonH - 13,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.center || "Main Center", {
    x: cardX + 12 + locColW + 10,
    y: locRibbonY + 8,
    size: 12,
    font,
    color: COLOR_CHARCOAL,
  });

  // 3. Building
  page.drawText("BUILDING", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + locRibbonH - 13,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.building || "Building HQ", {
    x: cardX + 12 + locColW * 2 + 10,
    y: locRibbonY + 8,
    size: 12,
    font,
    color: COLOR_CHARCOAL,
  });

  // 4. Floor
  page.drawText("ASSIGNED FLOOR", {
    x: cardX + 12 + locColW * 3 + 10,
    y: locRibbonY + locRibbonH - 13,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.floorName || "Floor HQ", {
    x: cardX + 12 + locColW * 3 + 10,
    y: locRibbonY + 8,
    size: 13,
    font,
    color: COLOR_CHARCOAL,
  });

  // Body Layout
  const bodyTop = locRibbonY - 10;
  const bodyBottom = cardY + 12;
  const bodyH = bodyTop - bodyBottom;
  const leftW = 215;
  const rightW = cardW - 24 - leftW - 10;
  const leftX = cardX + 12;
  const rightX = leftX + leftW + 10;

  // ----------------------------------------------------
  // LEFT COLUMN: Overview & Key Statistics
  // ----------------------------------------------------
  page.drawRectangle({
    x: leftX,
    y: bodyBottom,
    width: leftW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Header Box for Left
  page.drawRectangle({
    x: leftX + 1,
    y: bodyBottom + bodyH - 24,
    width: leftW - 2,
    height: 23,
    color: COLOR_CHARCOAL,
  });
  page.drawText("BAG SPECIFICATIONS", {
    x: leftX + 12,
    y: bodyBottom + bodyH - 16,
    size: 8,
    font,
    color: COLOR_GOLD,
  });

  // 4 Stat Cards filling the Left Column
  const leftCardsTop = bodyBottom + bodyH - 24 - 8;
  const leftCardsBottom = bodyBottom + 8;
  const leftAvailableH = leftCardsTop - leftCardsBottom;
  const statBoxH = Math.floor((leftAvailableH - 3 * 8) / 4);

  // Card 1: Floor Name
  const s1Y = leftCardsTop - statBoxH;
  page.drawRectangle({
    x: leftX + 8,
    y: s1Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("FLOOR:", {
    x: leftX + 14,
    y: s1Y + statBoxH - 16,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(options.floorName.toUpperCase(), {
    x: leftX + 14,
    y: s1Y + 14,
    size: 16,
    font,
    color: COLOR_CHARCOAL,
  });

  // Card 2: Subject Name & Code
  const s2Y = s1Y - 8 - statBoxH;
  page.drawRectangle({
    x: leftX + 8,
    y: s2Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("EXAM SUBJECT:", {
    x: leftX + 14,
    y: s2Y + statBoxH - 16,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  const subjDisplayName = subject.subjectName.toUpperCase();
  const subjFontSize = subjDisplayName.length > 15 ? 13 : 16;
  page.drawText(subjDisplayName, {
    x: leftX + 14,
    y: s2Y + 14,
    size: subjFontSize,
    font,
    color: COLOR_CHARCOAL,
  });

  // Card 3: Total Enclosed Rooms
  const s3Y = s2Y - 8 - statBoxH;
  page.drawRectangle({
    x: leftX + 8,
    y: s3Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("TOTAL ENCLOSED ROOMS:", {
    x: leftX + 14,
    y: s3Y + statBoxH - 16,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`${subject.totalRooms} ROOMS`, {
    x: leftX + 14,
    y: s3Y + 14,
    size: 18,
    font,
    color: COLOR_CHARCOAL,
  });

  // Card 4: Total Assigned Candidates
  const s4Y = s3Y - 8 - statBoxH;
  page.drawRectangle({
    x: leftX + 8,
    y: s4Y,
    width: leftW - 16,
    height: statBoxH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 0.8,
  });
  page.drawText("ASSIGNED CANDIDATES:", {
    x: leftX + 14,
    y: s4Y + statBoxH - 16,
    size: 7.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(`${subject.totalCandidates} CANDIDATES`, {
    x: leftX + 14,
    y: s4Y + 14,
    size: 18,
    font,
    color: COLOR_CHARCOAL,
  });

  // ----------------------------------------------------
  // RIGHT COLUMN: Enclosed Rooms Directory & Checklist
  // ----------------------------------------------------
  page.drawRectangle({
    x: rightX,
    y: bodyBottom,
    width: rightW,
    height: bodyH,
    color: COLOR_WHITE,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Top header for Right
  page.drawRectangle({
    x: rightX + 1,
    y: bodyBottom + bodyH - 24,
    width: rightW - 2,
    height: 23,
    color: COLOR_CHARCOAL,
  });
  page.drawText(`ENCLOSED ROOMS DIRECTORY — ${subject.subjectName.toUpperCase()}`, {
    x: rightX + 14,
    y: bodyBottom + bodyH - 16,
    size: 8.5,
    font,
    color: COLOR_GOLD,
  });

  const dirSubtitle = "[ CHECK OFF [  ] EACH ROOM PACKET UPON PACKING ]";
  const dirSubW = font.widthOfTextAtSize(dirSubtitle, 7);
  page.drawText(dirSubtitle, {
    x: rightX + rightW - dirSubW - 14,
    y: bodyBottom + bodyH - 16,
    size: 7,
    font,
    color: COLOR_GOLD,
  });

  // Rooms Grid Area (uses full height of right column now that footer is removed)
  const gridTop = bodyBottom + bodyH - 24 - 12;
  const gridBottom = bodyBottom + 12;
  const gridH = gridTop - gridBottom;
  const gridW = rightW - 24;

  const roomItems = subject.rooms || [];
  const numRooms = roomItems.length;

  if (numRooms === 0) {
    page.drawText("No room packets assigned for this subject on this floor.", {
      x: rightX + 24,
      y: gridTop - 40,
      size: 13,
      font,
      color: COLOR_MUTED,
    });
    return;
  }

  // Dynamic grid column calculation:
  // <= 6 rooms: 2 columns
  // <= 18 rooms: 3 columns
  // > 18 rooms: 4 columns
  const gridCols = numRooms <= 6 ? 2 : numRooms <= 18 ? 3 : 4;
  const gridRows = Math.ceil(numRooms / gridCols);
  const gapX = 10;
  const gapY = 10;
  const rCardW = (gridW - (gridCols - 1) * gapX) / gridCols;
  const rCardH = Math.min(56, Math.max(38, (gridH - (gridRows - 1) * gapY) / gridRows));

  for (let ri = 0; ri < numRooms; ri++) {
    const rItem = roomItems[ri];
    const c = ri % gridCols;
    const r = Math.floor(ri / gridCols);
    const rx = rightX + 12 + c * (rCardW + gapX);
    const ry = gridTop - (r + 1) * rCardH - r * gapY;

    // Room card box
    page.drawRectangle({
      x: rx,
      y: ry,
      width: rCardW,
      height: rCardH,
      color: COLOR_LIGHT_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 1,
    });

    // Checkbox square
    const boxSize = Math.min(18, Math.max(15, Math.round(rCardH * 0.35)));
    const boxX = rx + 10;
    const boxY = ry + (rCardH - boxSize) / 2;

    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxSize,
      height: boxSize,
      color: COLOR_WHITE,
      borderColor: COLOR_CHARCOAL,
      borderWidth: 1.5,
    });

    // Room Name & Count text - larger and bolder!
    const textX = boxX + boxSize + 10;
    const maxTextW = rCardW - (textX - rx) - 10;

    const rName = rItem.roomName;
    const rCount = rItem.candidateCount;
    const countLong = `(${rCount} ${rCount === 1 ? "Candidate" : "Candidates"})`;
    const countShort = `(${rCount})`;

    // Larger font sizes for Enclosed Rooms
    const nameSize = rCardH >= 46 ? 14 : 12.5;
    const countSize = rCardH >= 46 ? 11.5 : 10.5;

    const longW =
      font.widthOfTextAtSize(rName + "   ", nameSize) + font.widthOfTextAtSize(countLong, countSize);
    const shortW =
      font.widthOfTextAtSize(rName + "   ", nameSize) + font.widthOfTextAtSize(countShort, countSize);

    if (longW <= maxTextW) {
      // Single line with full "(X Candidates)"
      const textY = ry + (rCardH - nameSize) / 2 + 1;
      page.drawText(rName, {
        x: textX,
        y: textY,
        size: nameSize,
        font,
        color: COLOR_CHARCOAL,
      });
      const nameSpacingW = font.widthOfTextAtSize(rName + "   ", nameSize);
      page.drawText(countLong, {
        x: textX + nameSpacingW,
        y: textY + 0.5,
        size: countSize,
        font,
        color: COLOR_MUTED,
      });
    } else if (shortW <= maxTextW) {
      // Single line with short count e.g. "(25)"
      const textY = ry + (rCardH - nameSize) / 2 + 1;
      page.drawText(rName, {
        x: textX,
        y: textY,
        size: nameSize,
        font,
        color: COLOR_CHARCOAL,
      });
      const nameSpacingW = font.widthOfTextAtSize(rName + "   ", nameSize);
      page.drawText(countShort, {
        x: textX + nameSpacingW,
        y: textY + 0.5,
        size: countSize,
        font,
        color: COLOR_MUTED,
      });
    } else {
      // Two lines if narrow: Room name on top, candidates on bottom
      page.drawText(rName, {
        x: textX,
        y: ry + rCardH / 2 + 2,
        size: nameSize,
        font,
        color: COLOR_CHARCOAL,
      });
      page.drawText(countLong, {
        x: textX,
        y: ry + rCardH / 2 - countSize - 1,
        size: countSize,
        font,
        color: COLOR_MUTED,
      });
    }
  }
}

/**
 * Resolves floor rooms and their subjects by inspecting:
 * 1. Room subfolders and their uploaded register PDF files (using parseEstRoomFileName).
 * 2. Fallback to EST reference data or default EST 1/2 subjects.
 */
export async function resolveFloorSubjectsData(params: {
  resolvedFolderId: string;
  floorName: string;
  stickerContent: StickerContent;
  drive?: any;
  isDemo?: boolean;
}): Promise<FloorSubjectPlacardData[]> {
  const { resolvedFolderId, floorName, stickerContent, drive, isDemo } = params;

  interface RoomFolderItem {
    id: string;
    name: string;
    files: Array<{ name: string }>;
  }
  const roomsList: RoomFolderItem[] = [];

  // Query subfolders and their files
  if (isDemo || resolvedFolderId.startsWith("demo-")) {
    try {
      const desc = getDemoDescendants([resolvedFolderId]);
      const directRooms = desc.folders.filter((f) => f.parentId === resolvedFolderId);
      for (const r of directRooms) {
        const rFiles = desc.files.filter((f) => f.parentId === r.id);
        roomsList.push({ id: r.id, name: r.name, files: rFiles.map((f) => ({ name: f.name })) });
      }
    } catch (err) {
      console.warn("[floor-stickers] Demo descendants error:", err);
    }
  } else if (drive) {
    try {
      const subRes = await drive.files.list({
        q: `'${resolvedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const directRooms = subRes.data.files || [];
      await Promise.all(
        directRooms.map(async (r: any) => {
          try {
            const fRes = await drive.files.list({
              q: `'${r.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
              fields: "files(id, name)",
              pageSize: 50,
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
            });
            roomsList.push({
              id: r.id,
              name: r.name,
              files: (fRes.data.files || []).map((f: any) => ({ name: f.name || "" })),
            });
          } catch {
            roomsList.push({ id: r.id, name: r.name, files: [] });
          }
        }),
      );
    } catch (err) {
      console.warn("[floor-stickers] Drive query error:", err);
    }
  }

  // If no room folders found on drive, look up in OFFICIAL_EST_SCHOOLS
  if (roomsList.length === 0) {
    const centerOrBuilding = (stickerContent.center || stickerContent.building || "").toLowerCase();
    const school = OFFICIAL_EST_SCHOOLS.find(
      (s) =>
        s.schoolName.toLowerCase() === centerOrBuilding ||
        centerOrBuilding.includes(s.schoolName.toLowerCase()) ||
        s.fullFolderName.toLowerCase().includes(centerOrBuilding),
    );
    const cleanFloor = floorName.toLowerCase().replace(/^(floor|دور|الدور)\s*/i, "").trim();
    const matchedFloor = school?.floors.find(
      (fl) => fl.floorName.toLowerCase().includes(cleanFloor) || cleanFloor.includes(fl.floorName.toLowerCase()),
    );
    if (matchedFloor && matchedFloor.rooms.length > 0) {
      for (const rm of matchedFloor.rooms) {
        roomsList.push({ id: rm, name: rm, files: [] });
      }
    }
  }

  // Sort rooms naturally (e.g. 101, 102, or AD3A, AD4A)
  roomsList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

  // Subject aggregation map
  const subjectMap = new Map<
    string,
    {
      subjectCode: string;
      subjectName: string;
      examType: "EST 1" | "EST 2" | "EST";
      rooms: FloorRoomSubjectData[];
    }
  >();

  const isEst2Context = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(stickerContent.examName || "");

  for (const r of roomsList) {
    let parsedRoomData: any = null;

    // 1. Try to parse from any room file
    for (const file of r.files) {
      const parsed = parseEstRoomFileName(file.name);
      if (parsed && parsed.subjects && parsed.subjects.length > 0) {
        parsedRoomData = parsed;
        break;
      }
    }

    // 2. Fall back to getRoomExamCounts (which checks EST_REFERENCE_DATA)
    if (!parsedRoomData) {
      const refCounts = getRoomExamCounts({
        room: r.name,
        building: stickerContent.building,
        center: stickerContent.center,
        governorate: stickerContent.governorate,
        floor: floorName,
        folderFiles: r.files,
        examName: stickerContent.examName,
      });
      if (refCounts && refCounts.subjects && refCounts.subjects.length > 0) {
        parsedRoomData = refCounts;
      }
    }

    // 3. Fall back to standard defaults if nothing was specified
    if (!parsedRoomData || !parsedRoomData.subjects || parsedRoomData.subjects.length === 0) {
      parsedRoomData = {
        room: r.name,
        examType: isEst2Context ? ("EST 2" as const) : ("EST 1" as const),
        totalStudents: 25,
        subjects: isEst2Context
          ? [
              { code: "MATH1", name: "Math 1", displayName: "EST II – Math 1", count: 25, copies: 2 },
              { code: "BIO", name: "Biology", displayName: "EST II – Biology", count: 25, copies: 2 },
            ]
          : [
              { code: "LIT", name: "Literacy", displayName: "EST I – Literacy", count: 25, copies: 2 },
              { code: "MATH", name: "Math", displayName: "EST I – Math", count: 25, copies: 2 },
            ],
      };
    }

    // Accumulate each subject for this room
    for (const subj of parsedRoomData.subjects) {
      const count = typeof subj.count === "number" && subj.count > 0 ? subj.count : 25;
      let sEntry = subjectMap.get(subj.code);
      if (!sEntry) {
        sEntry = {
          subjectCode: subj.code,
          subjectName: subj.name,
          examType: parsedRoomData.examType || (isEst2Context ? "EST 2" : "EST 1"),
          rooms: [],
        };
        subjectMap.set(subj.code, sEntry);
      }
      sEntry.rooms.push({
        roomName: r.name,
        candidateCount: count,
      });
    }
  }

  // If no rooms at all were found, create a placeholder floor subject
  if (subjectMap.size === 0) {
    if (isEst2Context) {
      subjectMap.set("MATH1", {
        subjectCode: "MATH1",
        subjectName: "Math 1",
        examType: "EST 2",
        rooms: [{ roomName: "Room 1", candidateCount: 25 }],
      });
      subjectMap.set("BIO", {
        subjectCode: "BIO",
        subjectName: "Biology",
        examType: "EST 2",
        rooms: [{ roomName: "Room 1", candidateCount: 25 }],
      });
    } else {
      subjectMap.set("LIT", {
        subjectCode: "LIT",
        subjectName: "Literacy 1",
        examType: "EST 1",
        rooms: [{ roomName: "Room 1", candidateCount: 25 }],
      });
      subjectMap.set("MATH", {
        subjectCode: "MATH",
        subjectName: "Mathematics 1",
        examType: "EST 1",
        rooms: [{ roomName: "Room 1", candidateCount: 25 }],
      });
    }
  }

  return Array.from(subjectMap.values()).map((s) => ({
    subjectCode: s.subjectCode,
    subjectName: s.subjectName,
    examType: s.examType,
    totalRooms: s.rooms.length,
    totalCandidates: s.rooms.reduce((acc, r) => acc + r.candidateCount, 0),
    rooms: s.rooms,
  }));
}
