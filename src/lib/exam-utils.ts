export type ExamRegisterType = "student" | "proctor" | "control";
export type ExamLevel = "EST 1" | "EST 2";

export interface ExamUploadMeta {
  enabled?: boolean;
  registerType?: ExamRegisterType;
  institution?: string;
  examType?: ExamLevel;
  floor?: string;
  room?: string;
  autoFolder?: boolean;
}

export function buildExamFileName(originalName: string, meta?: ExamUploadMeta): string {
  if (!meta || meta.enabled === false) return originalName;

  const hasSubstance =
    meta.enabled &&
    Boolean(
      meta.registerType ||
      meta.examType ||
      meta.institution?.trim() ||
      meta.floor?.trim() ||
      meta.room?.trim(),
    );

  if (!hasSubstance) return originalName;

  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot) : "";

  const parts: string[] = [];
  if (meta.examType) {
    parts.push(`[${meta.examType}]`);
  }

  const inst = meta.institution?.trim();
  if (inst) {
    parts.push(inst);
  }

  const flr = meta.floor?.trim();
  if (flr) {
    const floorLabel = /^دور|floor/i.test(flr) ? flr : `الدور ${flr}`;
    parts.push(floorLabel);
  }

  const rm = meta.room?.trim();
  if (rm) {
    const roomLabel = /^روم|قاعة|room/i.test(rm) ? rm : `روم ${rm}`;
    parts.push(roomLabel);
  }

  if (meta.registerType === "proctor") {
    parts.push("Proctor Register");
  } else if (meta.registerType === "control") {
    parts.push("Control Register");
  } else if (meta.registerType === "student") {
    parts.push("Student Register");
  }

  if (parts.length === 0) return originalName;

  return `${parts.join(" - ")}${ext}`;
}

import { parseEstRoomFileName } from "./stickers/est-room-data";

export function parseExamInfoFromFileName(name: string): {
  examType?: ExamLevel;
  registerType?: ExamRegisterType;
  floor?: string;
  room?: string;
} | null {
  const isEst1 = /\[EST\s*1\]|\bEST\s*[-_]?\s*1\b|\bLIT-\d+|\bESSAY-(?:YES|NO)-\d+/i.test(name);
  const isEst2 = /\[EST\s*2\]|\bEST\s*[-_]?\s*2\b|\bMATH1-\d+|\bMATH2-\d+|\bBIO-\d+|\bCHEM-\d+|\bPHY-\d+/i.test(name);
  const isProctor = /proctor\s*register|كشف\s*مراقبين|ملاحظين/i.test(name);
  const isControl = /control\s*register|كشف\s*كنترول|كنترول/i.test(name);
  const isStudent =
    /student\s*register|كشف\s*طلاب|كشف\s*لجان|students/i.test(name) ||
    /LIT-\d+|MATH\d?-\d+|BIO-\d+|CHEM-\d+|PHY-\d+/i.test(name) ||
    Boolean(parseEstRoomFileName(name));

  if (!isEst1 && !isEst2 && !isProctor && !isControl && !isStudent) {
    return null;
  }

  const floorMatch = name.match(/(?:الدور|دور|floor)\s*([^\s\-_]+)/i);
  let roomMatch = name.match(/(?:روم|قاعة|room)\s*([^\s\-_]+)/i);

  let room = roomMatch ? roomMatch[1] : undefined;
  if (!room) {
    const estParsed = parseEstRoomFileName(name);
    if (estParsed?.room) {
      room = estParsed.room;
    }
  }

  return {
    examType: isEst2 ? "EST 2" : isEst1 ? "EST 1" : undefined,
    registerType: isStudent ? "student" : isProctor ? "proctor" : isControl ? "control" : undefined,
    floor: floorMatch ? floorMatch[1] : undefined,
    room,
  };
}

