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
 * e.g. "E426 | LIT-35 | MATH-28 | ESSAY-YES-12.pdf"
 * e.g. "204 | LIT-30 | MATH-30 | ESSAY-NO-0.pdf"
 */
export const EST1_ROOM_FILE_REGEX =
  /^(.+?)\s*\|\s*LIT-(\d+)\s*\|\s*MATH-(\d+)\s*\|\s*ESSAY-(YES|NO)-(\d+)(?:\.pdf)?$/i;

/**
 * Parses an EST I room filename according to the official naming convention:
 * `ROOM | LIT-XX | MATH-YY | ESSAY-YES/NO-ZZ.pdf`
 */
export function parseEst1FileName(fileName: string): Est1RoomExamCounts | null {
  if (!fileName) return null;
  const match = fileName.trim().match(EST1_ROOM_FILE_REGEX);
  if (!match) return null;

  const room = match[1].trim();
  const litCount = parseInt(match[2], 10);
  const mathCount = parseInt(match[3], 10);
  const rawStatus = match[4].toUpperCase();
  const essayCount = parseInt(match[5], 10);
  const hasEssay = rawStatus === "YES" && essayCount > 0;
  const essayStatus: "YES" | "NO" = hasEssay ? "YES" : "NO";
  // The room total population is the max assigned exam roster (Literacy or Math)
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
  if (folderFiles && folderFiles.length > 0) {
    for (const f of folderFiles) {
      const parsed = parseEst1FileName(f.name);
      if (parsed) {
        return parsed;
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
