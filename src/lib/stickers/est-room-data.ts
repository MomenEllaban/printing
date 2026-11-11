import { EST_REFERENCE_DATA, type EstReferenceRow } from "./est-reference-data";

export type EstSubjectKey =
  | "LIT"
  | "MATH"
  | "ESSAY"
  | "MATH1"
  | "MATH2"
  | "BIO"
  | "CHEM"
  | "PHY"
  | string;

export interface RoomSubjectCount {
  code: string;            // e.g. "LIT", "MATH1", "BIO", "CHEM", "PHY"
  name: string;            // e.g. "Literacy", "Math 1", "Biology", "Chemistry", "Physics"
  displayName: string;     // e.g. "EST II – Math 1", "EST I – Literacy"
  count: number;
  copies: number;          // default 2
}

export interface Est1RoomExamCounts {
  room: string;
  examType: "EST 1" | "EST 2" | "EST";
  totalStudents: number;
  subjects: RoomSubjectCount[];
  breakdownText: string;
  litCount: number;
  mathCount: number;
  essayCount: number;
  essayStatus: "YES" | "NO";
  hasEssay: boolean;
  source: "file" | "reference" | "default";
}

/**
 * Standard EST room PDF naming convention regex:
 * Supports multiple delimiters: "|", "_", "-", "–", commas, or spaces.
 * e.g. "E426 _ LIT-33 _ MATH-33 _ ESSAY-YES-12 .pdf"
 * e.g. "M102 _ MATH1-25 _ MATH2-25 _ BIO-25 _ CHEM-20.pdf"
 */
export const EST1_ROOM_FILE_REGEX =
  /^(.+?)\s*[_|–\-]\s*(?:LIT|LITERACY|MATH1|MATH2|MATH|BIO|CHEM|PHY)[-_:\s]*(\d+)/i;

/**
 * Universal EST room file parser for both EST 1 and EST 2.
 * Dynamically detects any combination of exam subjects and student counts:
 * - EST 1: LIT (Literacy), MATH (Math), ESSAY (Essay)
 * - EST 2: MATH1 (Math 1), MATH2 (Math 2), BIO (Biology), CHEM (Chemistry), PHY (Physics)
 *
 * Case-insensitive, supports various delimiters (`_`, `|`, `-`, `,`, `:`, whitespace),
 * and generates 2 identical copies per subject.
 */
export function parseEstRoomFileName(fileName: string): Est1RoomExamCounts | null {
  if (!fileName || typeof fileName !== "string") return null;

  // Clean filename: remove extension and trailing/leading whitespace
  const cleanName = fileName.replace(/\s*\.pdf\s*$/i, "").trim();
  if (!cleanName) return null;

  interface DetectedSubject {
    code: string;
    name: string;
    category: "EST 1" | "EST 2";
    count: number;
    matchIndex: number;
  }

  const detected: DetectedSubject[] = [];

  // 1. Math 1 (EST 2): MATH1, MATH 1, MATHEMATICS 1
  const m1 = cleanName.match(/\b(?:MATH[-_\s]*1|MATH1|MATHEMATICS[-_\s]*1)\b[-_:\s]*(\d+)\b/i);
  if (m1 && m1.index !== undefined) {
    detected.push({
      code: "MATH1",
      name: "Math 1",
      category: "EST 2",
      count: parseInt(m1[1], 10),
      matchIndex: m1.index,
    });
  }

  // 2. Math 2 (EST 2): MATH2, MATH 2, MATHEMATICS 2
  const m2 = cleanName.match(/\b(?:MATH[-_\s]*2|MATH2|MATHEMATICS[-_\s]*2)\b[-_:\s]*(\d+)\b/i);
  if (m2 && m2.index !== undefined) {
    detected.push({
      code: "MATH2",
      name: "Math 2",
      category: "EST 2",
      count: parseInt(m2[1], 10),
      matchIndex: m2.index,
    });
  }

  // 3. Biology (EST 2): BIO, BIOLOGY
  const bio = cleanName.match(/\b(?:BIO|BIOLOGY)[-_:\s]*(\d+)\b/i);
  if (bio && bio.index !== undefined) {
    detected.push({
      code: "BIO",
      name: "Biology",
      category: "EST 2",
      count: parseInt(bio[1], 10),
      matchIndex: bio.index,
    });
  }

  // 4. Chemistry (EST 2): CHEM, CHEMISTRY
  const chem = cleanName.match(/\b(?:CHEM|CHEMISTRY)[-_:\s]*(\d+)\b/i);
  if (chem && chem.index !== undefined) {
    detected.push({
      code: "CHEM",
      name: "Chemistry",
      category: "EST 2",
      count: parseInt(chem[1], 10),
      matchIndex: chem.index,
    });
  }

  // 5. Physics (EST 2): PHY, PHYSICS
  const phy = cleanName.match(/\b(?:PHY|PHYSICS)[-_:\s]*(\d+)\b/i);
  if (phy && phy.index !== undefined) {
    detected.push({
      code: "PHY",
      name: "Physics",
      category: "EST 2",
      count: parseInt(phy[1], 10),
      matchIndex: phy.index,
    });
  }

  // 6. Literacy (EST 1): LIT, LITERACY
  const lit = cleanName.match(/\b(?:LIT|LITERACY)[-_:\s]*(\d+)\b/i);
  if (lit && lit.index !== undefined) {
    detected.push({
      code: "LIT",
      name: "Literacy",
      category: "EST 1",
      count: parseInt(lit[1], 10),
      matchIndex: lit.index,
    });
  }

  // 7. General Math (EST 1): only when neither MATH1 nor MATH2 is present
  if (!m1 && !m2) {
    const mathGen = cleanName.match(/\b(?:MATH|MATHEMATICS)[-_:\s]*(\d+)\b/i);
    if (mathGen && mathGen.index !== undefined) {
      detected.push({
        code: "MATH",
        name: "Math",
        category: "EST 1",
        count: parseInt(mathGen[1], 10),
        matchIndex: mathGen.index,
      });
    }
  }

  // 8. Essay (EST 1):
  let essayCount = 0;
  let hasEssay = false;
  let essayStatus: "YES" | "NO" = "NO";
  let essayIndex = -1;

  const essayFullMatch = cleanName.match(/\bESSAY[-_:\s]*(YES|NO)[-_:\s]*(\d+)\b/i);
  if (essayFullMatch && essayFullMatch.index !== undefined) {
    essayIndex = essayFullMatch.index;
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
    if (essayNumericMatch && essayNumericMatch.index !== undefined) {
      essayIndex = essayNumericMatch.index;
      const count = parseInt(essayNumericMatch[1], 10);
      if (count > 0) {
        hasEssay = true;
        essayStatus = "YES";
        essayCount = count;
      }
    } else {
      const essayNoMatch = cleanName.match(/\bESSAY[-_:\s]*(NO|NONE|0)\b/i);
      if (essayNoMatch && essayNoMatch.index !== undefined) {
        essayIndex = essayNoMatch.index;
        hasEssay = false;
        essayStatus = "NO";
        essayCount = 0;
      }
    }
  }

  // If no subject matched and no essay matched, not an EST room filename
  if (detected.length === 0 && essayIndex === -1) {
    return null;
  }

  // Sort subjects by order of appearance in filename
  detected.sort((a, b) => a.matchIndex - b.matchIndex);

  // Determine examType
  const hasEst2Subject = detected.some((d) => d.category === "EST 2");
  const examType: "EST 1" | "EST 2" = hasEst2Subject ? "EST 2" : "EST 1";
  const examPrefix = examType === "EST 2" ? "EST II" : "EST I";

  // Build subjects list with 2 copies each
  const subjects: RoomSubjectCount[] = detected.map((d) => ({
    code: d.code,
    name: d.name,
    displayName: `${examPrefix} – ${d.name}`,
    count: d.count,
    copies: 2,
  }));

  // If EST 1 and essay has students, append Essay subject (2 copies)
  if (hasEssay && essayCount > 0) {
    subjects.push({
      code: "ESSAY",
      name: "Essay",
      displayName: `${examPrefix} – Essay`,
      count: essayCount,
      copies: 2,
    });
  }

  // Determine room prefix: substring before the earliest subject/essay token
  const allIndices = [...detected.map((d) => d.matchIndex)];
  if (essayIndex >= 0) allIndices.push(essayIndex);
  const minIndex = Math.min(...allIndices);

  let room = "";
  if (minIndex > 0) {
    room = cleanName
      .slice(0, minIndex)
      .replace(/[\s_|–\-:,]+$/, "")
      .trim();
  }

  // Total students: max among all assigned subjects
  const totalStudents = subjects.length > 0 ? Math.max(...subjects.map((s) => s.count), 0) : 0;

  // Breakdown text
  let breakdownText = "";
  if (subjects.length > 0) {
    breakdownText = subjects.map((s) => `${s.code}: ${s.count}`).join("  |  ");
  }

  // Backward-compatibility fields
  const litMatch = detected.find((d) => d.code === "LIT");
  const mathMatch = detected.find((d) => d.code === "MATH");
  const litCount = litMatch ? litMatch.count : 0;
  const mathCount = mathMatch ? mathMatch.count : (examType === "EST 1" ? litCount : 0);

  return {
    room,
    examType,
    totalStudents,
    subjects,
    breakdownText,
    litCount,
    mathCount,
    essayCount: hasEssay ? essayCount : 0,
    essayStatus,
    hasEssay,
    source: "file",
  };
}

/**
 * Backward-compatible alias for parseEstRoomFileName.
 */
export const parseEst1FileName = parseEstRoomFileName;

/**
 * Formats an EST I room filename following the exact official naming convention:
 * `ROOM | LIT-XX | MATH-YY | ESSAY-YES/NO-ZZ.pdf`
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
 * Formats an EST II room filename:
 * `ROOM | MATH1-XX | MATH2-YY | BIO-ZZ | CHEM-WW | PHY-VV.pdf`
 */
export function formatEst2FileName(
  room: string,
  subjectCounts: Record<string, number>,
): string {
  const cleanRoom = room.trim();
  const parts: string[] = [cleanRoom];
  const order = ["MATH1", "MATH2", "BIO", "CHEM", "PHY"];
  for (const code of order) {
    if (typeof subjectCounts[code] === "number") {
      parts.push(`${code}-${Math.max(0, Math.round(subjectCounts[code]))}`);
    }
  }
  return `${parts.join(" | ")}.pdf`;
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
 * 1. Existing folder file matching the EST naming pattern (EST 1 or EST 2)
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
  examName?: string;
}): Est1RoomExamCounts {
  const { room, building, center, governorate, folderFiles, examName } = params;

  // 1. Check folderFiles for existing file matching pattern (EST 1 or EST 2)
  // Check from newest/last-added to oldest so user-uploaded files take priority over default sample files
  if (folderFiles && folderFiles.length > 0) {
    for (let i = folderFiles.length - 1; i >= 0; i--) {
      const f = folderFiles[i];
      const parsed = parseEstRoomFileName(f.name);
      if (parsed) {
        return {
          ...parsed,
          room: parsed.room || room,
        };
      }
    }

    // Secondary check: look for any student register or PDF file with student numbers
    const cleanRoomDigits = room.replace(/\D/g, "");
    for (let i = folderFiles.length - 1; i >= 0; i--) {
      const f = folderFiles[i];
      if (f.name.toLowerCase().endsWith(".pdf")) {
        const matches = Array.from(f.name.matchAll(/\b(\d{1,3})\b/g));
        for (const m of matches) {
          const count = parseInt(m[1], 10);
          if (cleanRoomDigits && m[1] === cleanRoomDigits) continue;
          if (count > 0 && count < 200) {
            const isEst2 = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName || "");
            const defaultSubject: RoomSubjectCount = isEst2
              ? { code: "MATH1", name: "Math 1", displayName: "EST II – Math 1", count, copies: 2 }
              : { code: "LIT", name: "Literacy", displayName: "EST I – Literacy", count, copies: 2 };

            return {
              room,
              examType: isEst2 ? "EST 2" : "EST 1",
              totalStudents: count,
              subjects: [defaultSubject],
              breakdownText: `${defaultSubject.code}: ${count}`,
              litCount: isEst2 ? 0 : count,
              mathCount: isEst2 ? 0 : count,
              essayCount: 0,
              essayStatus: "NO",
              hasEssay: false,
              source: "file",
            };
          }
        }
      }
    }
  }

  // 2. Lookup in EST_REFERENCE_DATA (primarily for EST 1 reference data)
  const isEst2Context = /EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName || "");
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

  if (matchedRow && !isEst2Context) {
    const litCount = matchedRow.studentsEst1;
    const mathCount = matchedRow.studentsEst1;
    const essayCount = matchedRow.studentsWithEssay;
    const hasEssay = essayCount > 0;
    const subjects: RoomSubjectCount[] = [
      { code: "LIT", name: "Literacy", displayName: "EST I – Literacy", count: litCount, copies: 2 },
      { code: "MATH", name: "Math", displayName: "EST I – Math", count: mathCount, copies: 2 },
    ];
    if (hasEssay) {
      subjects.push({
        code: "ESSAY",
        name: "Essay",
        displayName: "EST I – Essay",
        count: essayCount,
        copies: 2,
      });
    }

    return {
      room: params.room,
      examType: "EST 1",
      totalStudents: matchedRow.studentsEst1,
      subjects,
      breakdownText: subjects.map((s) => `${s.code}: ${s.count}`).join("  |  "),
      litCount,
      mathCount,
      essayCount,
      essayStatus: hasEssay ? "YES" : "NO",
      hasEssay,
      source: "reference",
    };
  }

  // 3. Clean default fallback
  if (isEst2Context) {
    const subjects: RoomSubjectCount[] = [
      { code: "MATH1", name: "Math 1", displayName: "EST II – Math 1", count: 25, copies: 2 },
      { code: "MATH2", name: "Math 2", displayName: "EST II – Math 2", count: 25, copies: 2 },
      { code: "BIO", name: "Biology", displayName: "EST II – Biology", count: 25, copies: 2 },
      { code: "CHEM", name: "Chemistry", displayName: "EST II – Chemistry", count: 25, copies: 2 },
      { code: "PHY", name: "Physics", displayName: "EST II – Physics", count: 25, copies: 2 },
    ];
    return {
      room: params.room,
      examType: "EST 2",
      totalStudents: 25,
      subjects,
      breakdownText: "MATH1: 25  |  MATH2: 25  |  BIO: 25  |  CHEM: 25  |  PHY: 25",
      litCount: 0,
      mathCount: 0,
      essayCount: 0,
      essayStatus: "NO",
      hasEssay: false,
      source: "default",
    };
  }

  const defaultEst1Subjects: RoomSubjectCount[] = [
    { code: "LIT", name: "Literacy", displayName: "EST I – Literacy", count: 25, copies: 2 },
    { code: "MATH", name: "Math", displayName: "EST I – Math", count: 25, copies: 2 },
  ];
  return {
    room: params.room,
    examType: "EST 1",
    totalStudents: 25,
    subjects: defaultEst1Subjects,
    breakdownText: "LIT: 25  |  MATH: 25",
    litCount: 25,
    mathCount: 25,
    essayCount: 0,
    essayStatus: "NO",
    hasEssay: false,
    source: "default",
  };
}

