export type StickerLevel = "root" | "governorate" | "center" | "building" | "floor" | "room" | "custom";

export interface StickerContent {
  level: StickerLevel;
  lines: string[];
  cleanChain: string[];
}

/**
 * Builds the exact lines required for an EST hierarchy sticker:
 *
 * Rule:
 * Every sticker starts with "EST" as the prominent first line.
 * Followed only by the location values for the specific level:
 * - A. Exam Root (e.g. EST 1):
 *      EST
 *      EST 1
 * - B. Governorate (e.g. Alexandria):
 *      EST
 *      Alexandria
 * - C. Test Center (e.g. Abu Qir):
 *      EST
 *      Alexandria
 *      Abu Qir
 * - D. Building (e.g. Pharmacy):
 *      EST
 *      Alexandria
 *      Abu Qir
 *      Pharmacy
 * - E. Floor (e.g. 2nd Floor):
 *      EST
 *      Alexandria
 *      Abu Qir
 *      Pharmacy
 *      2nd Floor
 * - F. Room (e.g. 204):
 *      EST
 *      Alexandria
 *      Abu Qir
 *      Pharmacy
 *      2nd Floor
 *      204
 *
 * Rules:
 * - No level labels (no "Governorate:", "Building:", etc.)
 * - No student counts, no essay counts, no filenames, no dates, no usernames, no barcodes.
 * - Only clean extra whitespace while keeping exact case and wording.
 */
export function buildStickerContent(rawChain: Array<{ name?: string | null } | string>): StickerContent {
  const chain = (rawChain || [])
    .map((item) => (typeof item === "string" ? item : item?.name ?? ""))
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (chain.length === 0) {
    throw new Error("Cannot generate sticker for empty folder hierarchy");
  }

  // Find index of the EST root folder (e.g. "EST 1", "EST 2", "EST")
  const estIndex = chain.findIndex((name) => /^EST(\s*\d+)?$/i.test(name));

  // If an EST root ancestor exists, slice from it downwards
  const relevantChain = estIndex >= 0 ? chain.slice(estIndex) : chain;

  // Case A: The selected folder itself is the EST root folder (e.g. EST 1)
  if (estIndex >= 0 && relevantChain.length === 1) {
    return {
      level: "root",
      lines: ["EST", relevantChain[0]],
      cleanChain: relevantChain,
    };
  }

  // If chain starts with EST folder, location levels start after it
  const locationChain = estIndex >= 0 ? relevantChain.slice(1) : relevantChain;

  let level: StickerLevel = "custom";
  if (locationChain.length === 1) level = "governorate";
  else if (locationChain.length === 2) level = "center";
  else if (locationChain.length === 3) level = "building";
  else if (locationChain.length === 4) level = "floor";
  else if (locationChain.length >= 5) level = "room";

  // Build the lines: "EST" followed by each location name
  const lines = ["EST", ...locationChain];

  return {
    level,
    lines,
    cleanChain: relevantChain,
  };
}

