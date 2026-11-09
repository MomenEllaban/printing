export type StickerLevel = "root" | "governorate" | "center" | "building" | "floor" | "room" | "custom";

export interface StickerFieldItem {
  key: "exam" | "governorate" | "center" | "building" | "floor" | "room";
  label: string;       // e.g. "Center", "Building", "Floor", "Room"
  labelAr: string;     // e.g. "السنتر", "المبنى", "الدور", "القاعة"
  value: string;
}

export interface StickerContent {
  level: StickerLevel;
  lines: string[];
  rawLines: string[];
  cleanChain: string[];
  examName: string;
  governorate?: string;
  center?: string;
  building?: string;
  floor?: string;
  room?: string;
  fields: StickerFieldItem[];
}

/**
 * Builds the structured content and lines required for an EST hierarchy sticker:
 *
 * Each level contains clear labels:
 * - Center : [Center Name]
 * - Building : [Building Name]
 * - Floor : [Floor]
 * - Room : [Room Number]
 * - Governorate : [Governorate Name]
 *
 * With the official EST Logo at the top of the sticker.
 */
export function buildStickerContent(rawChain: Array<{ name?: string | null } | string>): StickerContent {
  let chain = (rawChain || [])
    .map((item) => (typeof item === "string" ? item : item?.name ?? ""))
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (chain.length === 0) {
    throw new Error("Cannot generate sticker for empty folder hierarchy");
  }

  // Drop generic root folder names if they appear at the top
  const GENERIC_ROOTS = /^(root|my drive|drive|demo drive|google drive|file manager app|december\s*2026)$/i;
  
  // Find index of the EST root folder (e.g. "EST 1", "EST 2", "EST - 1", "EST I", "EST")
  const isEstRoot = (name: string) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s]+))?$/i.test(name.trim());
  const estIndex = chain.findIndex((name) => isEstRoot(name));

  // If an EST root ancestor exists, slice from it downwards
  let relevantChain = estIndex >= 0 ? chain.slice(estIndex) : chain.filter((c) => !GENERIC_ROOTS.test(c));
  if (relevantChain.length === 0) {
    relevantChain = chain;
  }

  const examName = isEstRoot(relevantChain[0]) ? relevantChain[0] : "EST 1";

  // Case A: The selected folder itself is the EST root folder (e.g. EST 1)
  if (isEstRoot(relevantChain[0]) && relevantChain.length === 1) {
    return {
      level: "root",
      lines: ["EST", examName],
      rawLines: ["EST", examName],
      cleanChain: relevantChain,
      examName,
      fields: [{ key: "exam", label: "Exam", labelAr: "الاختبار", value: examName }],
    };
  }

  // If chain starts with EST folder, location levels start after it
  const locationChain = isEstRoot(relevantChain[0]) ? relevantChain.slice(1) : relevantChain;

  let level: StickerLevel = "custom";
  let governorate: string | undefined;
  let center: string | undefined;
  let building: string | undefined;
  let floor: string | undefined;
  let room: string | undefined;

  if (locationChain.length === 1) {
    level = "governorate";
    governorate = locationChain[0];
  } else if (locationChain.length === 2) {
    level = "center";
    governorate = locationChain[0];
    center = locationChain[1];
  } else if (locationChain.length === 3) {
    level = "building";
    governorate = locationChain[0];
    center = locationChain[1];
    building = locationChain[2];
  } else if (locationChain.length === 4) {
    level = "floor";
    governorate = locationChain[0];
    center = locationChain[1];
    building = locationChain[2];
    floor = locationChain[3];
  } else if (locationChain.length >= 5) {
    level = "room";
    governorate = locationChain[0];
    center = locationChain[1];
    building = locationChain[2];
    floor = locationChain[3];
    room = locationChain[4];
  }

  const fields: StickerFieldItem[] = [];
  if (governorate) {
    fields.push({ key: "governorate", label: "Governorate", labelAr: "المحافظة", value: governorate });
  }
  if (center) {
    fields.push({ key: "center", label: "Center", labelAr: "السنتر", value: center });
  }
  if (building) {
    fields.push({ key: "building", label: "Building", labelAr: "المبنى", value: building });
  }
  if (floor) {
    fields.push({ key: "floor", label: "Floor", labelAr: "الدور", value: floor });
  }
  if (room) {
    fields.push({ key: "room", label: "Room", labelAr: "القاعة", value: room });
  }

  // Labeled lines with clean format: "Center : Abu Qir", "Floor : 2nd Floor", etc.
  const lines = ["EST", ...fields.map((f) => `${f.label} : ${f.value}`)];
  const rawLines = ["EST", ...locationChain];

  return {
    level,
    lines,
    rawLines,
    cleanChain: relevantChain,
    examName,
    governorate,
    center,
    building,
    floor,
    room,
    fields,
  };
}
