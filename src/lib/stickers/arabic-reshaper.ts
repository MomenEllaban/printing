/**
 * Arabic Reshaper & Bidirectional Reorderer for PDF Rendering.
 * Converts Unicode Arabic characters (U+0600 - U+06FF) into connected
 * Arabic Presentation Forms-B (U+FE70 - U+FEFC), handles Lam-Alef ligatures,
 * and reverses text for proper Right-to-Left (RTL) drawing in LTR engines (like pdf-lib).
 */

interface CharForms {
  isolated: string;
  final: string;
  initial: string;
  medial: string;
}

// Map each basic Arabic letter to its [isolated, final, initial, medial] forms
const ARABIC_FORMS: Record<string, [string, string, string, string]> = {
  "\u0621": ["\uFE80", "\uFE80", "\uFE80", "\uFE80"], // ء
  "\u0622": ["\uFE81", "\uFE82", "\uFE81", "\uFE82"], // آ
  "\u0623": ["\uFE83", "\uFE84", "\uFE83", "\uFE84"], // أ
  "\u0624": ["\uFE85", "\uFE86", "\uFE85", "\uFE86"], // ؤ
  "\u0625": ["\uFE87", "\uFE88", "\uFE87", "\uFE88"], // إ
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"], // ئ
  "\u0627": ["\uFE8D", "\uFE8E", "\uFE8D", "\uFE8E"], // ا
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"], // ب
  "\u0629": ["\uFE93", "\uFE94", "\uFE93", "\uFE94"], // ة
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"], // ت
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"], // ث
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"], // ج
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"], // ح
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"], // خ
  "\u062F": ["\uFEA9", "\uFEAA", "\uFEA9", "\uFEAA"], // د
  "\u0630": ["\uFEAB", "\uFEAC", "\uFEAB", "\uFEAC"], // ذ
  "\u0631": ["\uFEAD", "\uFEAE", "\uFEAD", "\uFEAE"], // ر
  "\u0632": ["\uFEAF", "\uFEB0", "\uFEAF", "\uFEB0"], // ز
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"], // س
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"], // ش
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"], // ص
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"], // ض
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"], // ط
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"], // ظ
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"], // ع
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"], // غ
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"], // ف
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"], // ق
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"], // ك
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"], // ل
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"], // م
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"], // ن
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"], // ه
  "\u0648": ["\uFEED", "\uFEEE", "\uFEED", "\uFEEE"], // و
  "\u0649": ["\uFEEF", "\uFEF0", "\uFEEF", "\uFEF0"], // ى
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"], // ي
};

// Letters that can only connect from the right (preceding character)
const RIGHT_JOINING = new Set([
  "\u0622", "\u0623", "\u0624", "\u0625", "\u0627", "\u062F", "\u0630",
  "\u0631", "\u0632", "\u0648", "\u0629", "\u0649"
]);

// Lam-Alef ligatures
const LAM_ALEF_MAP: Record<string, [string, string]> = {
  "\u0622": ["\uFEF5", "\uFEF6"], // لآ
  "\u0623": ["\uFEF7", "\uFEF8"], // لأ
  "\u0625": ["\uFEF9", "\uFEFA"], // لإ
  "\u0627": ["\uFEFB", "\uFEFC"], // لا
};

function isArabicChar(c: string): boolean {
  return (c >= "\u0600" && c <= "\u06FF") || (c >= "\u0750" && c <= "\u077F") || (c >= "\uFB50" && c <= "\uFDFF") || (c >= "\uFE70" && c <= "\uFEFC");
}

function canConnectPrevious(c: string): boolean {
  if (!isArabicChar(c)) return false;
  return Boolean(ARABIC_FORMS[c]);
}

function canConnectNext(c: string): boolean {
  if (!isArabicChar(c)) return false;
  if (!ARABIC_FORMS[c]) return false;
  return !RIGHT_JOINING.has(c);
}

/**
 * Shapes a contiguous Arabic word into connected presentation glyphs.
 */
function shapeArabicWord(word: string): string {
  const chars = Array.from(word);
  const result: string[] = [];
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const cur = chars[i];

    // Lam-Alef combination check
    if (cur === "\u0644" && i + 1 < len && LAM_ALEF_MAP[chars[i + 1]]) {
      const alef = chars[i + 1];
      const prevCanConnect = i > 0 && canConnectNext(chars[i - 1]);
      const ligatureForms = LAM_ALEF_MAP[alef];
      result.push(prevCanConnect ? ligatureForms[1] : ligatureForms[0]);
      i++; // Skip Alef
      continue;
    }

    const forms = ARABIC_FORMS[cur];
    if (!forms) {
      result.push(cur);
      continue;
    }

    const prevCan = i > 0 && canConnectNext(chars[i - 1]);
    const nextCan = i + 1 < len && canConnectPrevious(chars[i + 1]);

    if (prevCan && nextCan && !RIGHT_JOINING.has(cur)) {
      result.push(forms[3]); // Medial
    } else if (prevCan) {
      result.push(forms[1]); // Final
    } else if (nextCan && !RIGHT_JOINING.has(cur)) {
      result.push(forms[2]); // Initial
    } else {
      result.push(forms[0]); // Isolated
    }
  }

  return result.join("");
}

/**
 * Reshapes Arabic text and reverses it for RTL rendering in LTR PDF canvases.
 * Leaves Latin words and numbers in their natural LTR direction.
 */
export function reshapeArabic(text: string | null | undefined): string {
  if (!text) return "";

  // Tokenize into runs of Arabic words, spaces, numbers, Latin words, and punctuation
  const tokens = text.match(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]+|[0-9]+|[a-zA-Z\-_#.:/]+|\s+|[^\s\w\u0600-\u06FF]/g) || [text];

  const processedTokens = tokens.map((token) => {
    if (isArabicChar(token[0])) {
      // Shape Arabic connected forms, then reverse characters of this Arabic word
      const shaped = shapeArabicWord(token);
      return Array.from(shaped).reverse().join("");
    }
    // Return numbers, Latin words, and spaces unchanged
    return token;
  });

  // If text contains Arabic, reverse the overall token sequence so RTL words read right-to-left
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasArabic) {
    return processedTokens.reverse().join("");
  }

  return text;
}

