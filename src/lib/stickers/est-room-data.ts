import { EST_REFERENCE_DATA, type EstReferenceRow } from "./est-reference-data";

export interface Est1RoomExamCounts {
  room: string;
  litCount: number;
  mathCount: number;
  essayCount: number;
  essayStatus: "YES" | "NO";
  hasEssay: boolean;
  totalStudents: number;
  source: "file" | "reference" | "default";
}

/**
 * Standard EST I room PDF naming convention regex:
 * Supports multiple delimiters: "|", "_", "-", "–", commas, or spaces.
 * e.g. "E426 _ LIT-33 _ MATH-33 _ ESSAY-YES-12 .pdf"
 * e.g. "E426 | LIT-35 | MATH-28 | ESSAY-YES-12.pdf"
 * e.g. "204 | LIT-30 | MATH-30 | ESSAY-NO-0.pdf"
 */
export const EST1_ROOM_FILE_REGEX =
  /^(.+?)\s*[_|–\-]\s*(?:LIT|LITERACY)[-_:\s]*(\d+)\s*[_|–\-]\s*(?:MATH|MATHEMATICS)[-_:\s]*(\d+)(?:\s*[_|–\-]\s*ESSAY[-_:\s]*(YES|NO)[-_:\s]*(\d+))?\s*(?:\.pdf)?$/i;

/**
 * Parses an EST I room filename according to the official naming convention:
 * `ROOM | LIT-XX | MATH-YY | ESSAY-YES/NO-ZZ.pdf`
 * Also gracefully handles user variations such as underscores (`_`), hyphens (`-`),
 * spaces before extension (` .pdf`), colons (`LIT: 33`), etc.
 */
export function parseEst1FileName(fileName: string): Est1RoomExamCounts | null {
  if (!fileName || typeof fileName !== "string") return null;

  // Clean filename: remove extension and trailing/leading whitespace
  const cleanName = fileName.replace(/\s*\.pdf$/i, "").trim();

  // Match LIT count: e.g. "LIT-33", "LIT_33", "LIT: 33", "LIT 33", "LITERACY-33"
  const litMatch = cleanName.match(/\b(?:LIT|LITERACY)[-_:\s]*(\d+)\b/i);

  // Match MATH count: e.g. "MATH-33", "MATH_33", "MATH: 33", "MATH 33", "MATHEMATICS-33"
  const mathMatch = cleanName.match(/\b(?:MATH|MATHEMATICS)[-_:\s]*(\d+)\b/i);

  if (!litMatch && !mathMatch) {
    return null;
  }

  const litCount = litMatch ? parseInt(litMatch[1], 10) : 0;
  const mathCount = mathMatch ? parseInt(mathMatch[1], 10) : litCount;

  // Match ESSAY:
  // e.g. "ESSAY-YES-12", "ESSAY_YES_12", "ESSAY-NO-0", "ESSAY-12", "ESSAY: 12", "ESSAY-NO"
  let essayCount = 0;
  let hasEssay = false;
  let essayStatus: "YES" | "NO" = "NO";

  const essayFullMatch = cleanName.match(/\bESSAY[-_:\s]*(YES|NO)[-_:\s]*(\d+)\b/i);
  if (essayFullMatch) {
    const status = essayFullMatch[1].toUpperCase();
    const count = parseInt(essayFullMatch[2], 10);
    if (status === "YES" && count > 0) {
      hasEssay = true;
      essayStatus = "YES";
      essayCount = count;
    } else {
      hasEssay = false;
      essayStatus = "NO";
      essayCount = 0;
    }
  } else {
    const essayNumericMatch = cleanName.match(/\bESSAY[-_:\s]*(\d+)\b/i);
    if (essayNumericMatch) {
      const count = parseInt(essayNumericMatch[1], 10);
      if (count > 0) {
        hasEssay = true;
        essayStatus = "YES";
        essayCount = count;
      }
    } else {
      const essayNoMatch = cleanName.match(/\bESSAY[-_:\s]*(NO|NONE|0)\b/i);
      if (essayNoMatch) {
        hasEssay = false;
        essayStatus = "NO";
        essayCount = 0;
      }
    }
  }

  // Room extraction from filename prefix
  let room = "";
  const roomPrefixMatch = cleanName.match(/^([^|_–\-:,]+?)(?:\s*[_|–\-:,]\s*|\s+)(?:LIT|MATH|ESSAY)/i);
  if (roomPrefixMatch) {
    room = roomPrefixMatch[1].trim();
  }

  const totalStudents = Math.max(litCount, mathCount);

  return {
    room,
    litCount,
    mathCount,
    essayCount: hasEssay ? essayCount : 0,
    essayStatus,
    hasEssay,
    totalStudents,
    source: "file",
  };
}

/**
 * Formats an EST I room filename following the exact official naming convention:
 * `ROOM | LIT-XX | MATH-YY | ESSAY-YES/NO-ZZ.pdf`
 *
 * Rules:
 * - Literacy and Math have their own student counts.
 * - If students are staying for Essay (essayCount > 0): `ESSAY-YES-${essayCount}`
 * - If no students are taking Essay (essayCount == 0): `ESSAY-NO-0`
 */
export function formatEst1FileName(
  room: string,
  litCount: number,
  mathCount: number,
  essayCount: number,
): string {
  const cleanRoom = room.trim();
  const safeLit = Math.max(0, Math.round(litCount));
  const safeMath = Math.max(0, Math.round(mathCount));
  const safeEssay = Math.max(0, Math.round(essayCount));
  const essayPart = safeEssay > 0 ? `ESSAY-YES-${safeEssay}` : `ESSAY-NO-0`;
  return `${cleanRoom} | LIT-${safeLit} | MATH-${safeMath} | ${essayPart}.pdf`;
}

/**
 * Normalizes room/building/center strings for fuzzy matching across reference data.
 */
function normalizeString(value?: string | null): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(room|قاعة|لجنة|حجرة)\s*/i, "");
}

/**
 * Resolves room exam counts dynamically from:
 * 1. Existing folder file matching the EST I naming pattern
 * 2. Official EST_REFERENCE_DATA (with matching room, building, center, governorate)
 * 3. Reasonable room defaults
 */
export function getRoomExamCounts(params: {
  room: string;
  building?: string;
  center?: string;
  governorate?: string;
  floor?: string;
  folderFiles?: Array<{ name: string }>;
}): Est1RoomExamCounts {
  const { room, building, center, governorate, folderFiles } = params;

  // 1. Check folderFiles for existing file matching pattern
  // Check from newest/last-added to oldest so user-uploaded files take priority over default sample files
  if (folderFiles && folderFiles.length > 0) {
    for (let i = folderFiles.length - 1; i >= 0; i--) {
      const f = folderFiles[i];
      const parsed = parseEst1FileName(f.name);
      if (parsed) {
        return {
          ...parsed,
          room: parsed.room || room,
        };
      }
    }

    // Secondary check: look for any student register or PDF file with student numbers
    for (let i = folderFiles.length - 1; i >= 0; i--) {
      const f = folderFiles[i];
      if (f.name.toLowerCase().endsWith(".pdf")) {
        const numMatch = f.name.match(/\b(\d{1,3})\b/);
        if (numMatch) {
          const count = parseInt(numMatch[1], 10);
          if (count > 0 && count < 200) {
            return {
              room,
              litCount: count,
              mathCount: count,
              essayCount: 0,
              essayStatus: "NO",
              hasEssay: false,
              totalStudents: count,
              source: "file",
            };
          }
        }
      }
    }
  }

  // 2. Lookup in EST_REFERENCE_DATA
  const targetRoom = normalizeString(room);

  const matchedRow =
    EST_REFERENCE_DATA.find((r) => {
      const rRoom = normalizeString(r.room);
      if (rRoom !== targetRoom) return false;
      if (building && normalizeString(r.building) !== normalizeString(building)) return false;
      if (center && normalizeString(r.testCenter) !== normalizeString(center)) return false;
      if (governorate && normalizeString(r.governorate) !== normalizeString(governorate)) return false;
      return true;
    }) ||
    EST_REFERENCE_DATA.find((r) => normalizeString(r.room) === targetRoom);

  if (matchedRow) {
    const litCount = matchedRow.studentsEst1;
    const mathCount = matchedRow.studentsEst1;
    const essayCount = matchedRow.studentsWithEssay;
    const hasEssay = essayCount > 0;
    return {
      room: params.room,
      litCount,
      mathCount,
      essayCount,
      essayStatus: hasEssay ? "YES" : "NO",
      hasEssay,
      totalStudents: matchedRow.studentsEst1,
      source: "reference",
    };
  }

  // 3. Clean default fallback (e.g. standard room capacity 25, no essay)
  return {
    room: params.room,
    litCount: 25,
    mathCount: 25,
    essayCount: 0,
    essayStatus: "NO",
    hasEssay: false,
    totalStudents: 25,
    source: "default",
  };
}

