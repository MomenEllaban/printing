export type ExamRegisterType = "student" | "proctor";
export type ExamLevel = "EST 1" | "EST 2";

export interface ExamUploadMeta {
  registerType?: ExamRegisterType;
  institution?: string;
  examType?: ExamLevel;
  floor?: string;
  room?: string;
  autoFolder?: boolean;
}

export function buildExamFileName(originalName: string, meta?: ExamUploadMeta): string {
  if (!meta) return originalName;
  const hasMeta = meta.institution?.trim() || meta.floor?.trim() || meta.room?.trim() || meta.registerType;
  if (!hasMeta) return originalName;

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

  if (meta.registerType === "proctor") {
    parts.push("Proctor Register");
  } else {
    const rm = meta.room?.trim();
    if (rm) {
      const roomLabel = /^روم|قاعة|room/i.test(rm) ? rm : `روم ${rm}`;
      parts.push(roomLabel);
    }
    parts.push("Student Register");
  }

  return `${parts.join(" - ")}${ext}`;
}

export function parseExamInfoFromFileName(name: string): {
  examType?: ExamLevel;
  registerType?: ExamRegisterType;
  floor?: string;
  room?: string;
} | null {
  const isEst1 = /\[EST\s*1\]/i.test(name);
  const isEst2 = /\[EST\s*2\]/i.test(name);
  const isProctor = /proctor\s*register|كشف\s*مراقبين|ملاحظين/i.test(name);
  const isStudent = /student\s*register|كشف\s*طلاب|كشف\s*لجان/i.test(name);

  if (!isEst1 && !isEst2 && !isProctor && !isStudent) {
    return null;
  }

  const floorMatch = name.match(/(?:الدور|دور|floor)\s*([^\s\-_]+)/i);
  const roomMatch = name.match(/(?:روم|قاعة|room)\s*([^\s\-_]+)/i);

  return {
    examType: isEst1 ? "EST 1" : isEst2 ? "EST 2" : undefined,
    registerType: isProctor ? "proctor" : isStudent ? "student" : undefined,
    floor: floorMatch ? floorMatch[1] : undefined,
    room: roomMatch ? roomMatch[1] : undefined,
  };
}
