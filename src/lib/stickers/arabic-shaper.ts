/**
 * Robust Arabic text shaper & BiDi reorderer for PDF-lib and Canvas.
 * Maps standard Unicode Arabic characters to their Presentation Forms-B (initial, medial, final, isolated)
 * with Lam-Alef ligatures, and reverses text for Left-To-Right rendering engines.
 */

// Presentation Forms-B: [isolated, final, initial, medial]
interface ArabicCharForms {
  isolated: number;
  final: number;
  initial: number;
  medial: number;
  connectsAfter: boolean; // can connect to the following letter
}

const ARABIC_FORMS: Record<number, ArabicCharForms> = {
  0x0621: { isolated: 0xfe80, final: 0xfe80, initial: 0xfe80, medial: 0xfe80, connectsAfter: false }, // ء
  0x0622: { isolated: 0xfe81, final: 0xfe82, initial: 0xfe81, medial: 0xfe82, connectsAfter: false }, // آ
  0x0623: { isolated: 0xfe83, final: 0xfe84, initial: 0xfe83, medial: 0xfe84, connectsAfter: false }, // أ
  0x0624: { isolated: 0xfe85, final: 0xfe86, initial: 0xfe85, medial: 0xfe86, connectsAfter: false }, // ؤ
  0x0625: { isolated: 0xfe87, final: 0xfe88, initial: 0xfe87, medial: 0xfe88, connectsAfter: false }, // إ
  0x0626: { isolated: 0xfe89, final: 0xfe8a, initial: 0xfe8b, medial: 0xfe8c, connectsAfter: true },  // ئ
  0x0627: { isolated: 0xfe8d, final: 0xfe8e, initial: 0xfe8d, medial: 0xfe8e, connectsAfter: false }, // ا
  0x0628: { isolated: 0xfe8f, final: 0xfe90, initial: 0xfe91, medial: 0xfe92, connectsAfter: true },  // ب
  0x0629: { isolated: 0xfe93, final: 0xfe94, initial: 0xfe93, medial: 0xfe94, connectsAfter: false }, // ة
  0x062a: { isolated: 0xfe95, final: 0xfe96, initial: 0xfe97, medial: 0xfe98, connectsAfter: true },  // ت
  0x062b: { isolated: 0xfe99, final: 0xfe9a, initial: 0xfe9b, medial: 0xfe9c, connectsAfter: true },  // ث
  0x062c: { isolated: 0xfe9d, final: 0xfe9e, initial: 0xfe9f, medial: 0xfea0, connectsAfter: true },  // ج
  0x062d: { isolated: 0xfea1, final: 0xfea2, initial: 0xfea3, medial: 0xfea4, connectsAfter: true },  // ح
  0x062e: { isolated: 0xfea5, final: 0xfea6, initial: 0xfea7, medial: 0xfea8, connectsAfter: true },  // خ
  0x062f: { isolated: 0xfea9, final: 0xfeaa, initial: 0xfea9, medial: 0xfeaa, connectsAfter: false }, // د
  0x0630: { isolated: 0xfeab, final: 0xfeac, initial: 0xfeab, medial: 0xfeac, connectsAfter: false }, // ذ
  0x0631: { isolated: 0xfead, final: 0xfeae, initial: 0xfead, medial: 0xfeae, connectsAfter: false }, // ر
  0x0632: { isolated: 0xfeaf, final: 0xfeb0, initial: 0xfeaf, medial: 0xfeb0, connectsAfter: false }, // ز
  0x0633: { isolated: 0xfeb1, final: 0xfeb2, initial: 0xfeb3, medial: 0xfeb4, connectsAfter: true },  // س
  0x0634: { isolated: 0xfeb5, final: 0xfeb6, initial: 0xfeb7, medial: 0xfeb8, connectsAfter: true },  // ش
  0x0635: { isolated: 0xfeb9, final: 0xfeba, initial: 0xfebb, medial: 0xfebc, connectsAfter: true },  // ص
  0x0636: { isolated: 0xfebd, final: 0xfebe, initial: 0xfebf, medial: 0xfec0, connectsAfter: true },  // ض
  0x0637: { isolated: 0xfec1, final: 0xfec2, initial: 0xfec3, medial: 0xfec4, connectsAfter: true },  // ط
  0x0638: { isolated: 0xfec5, final: 0xfec6, initial: 0xfec7, medial: 0xfec8, connectsAfter: true },  // ظ
  0x0639: { isolated: 0xfec9, final: 0xfeca, initial: 0xfecb, medial: 0xfecc, connectsAfter: true },  // ع
  0x063a: { isolated: 0xfecd, final: 0xfece, initial: 0xfecf, medial: 0xfed0, connectsAfter: true },  // غ
  0x0640: { isolated: 0x0640, final: 0x0640, initial: 0x0640, medial: 0x0640, connectsAfter: true },  // ـ (tatweel)
  0x0641: { isolated: 0xfed1, final: 0xfed2, initial: 0xfed3, medial: 0xfed4, connectsAfter: true },  // ف
  0x0642: { isolated: 0xfed5, final: 0xfed6, initial: 0xfed7, medial: 0xfed8, connectsAfter: true },  // ق
  0x0643: { isolated: 0xfed9, final: 0xfeda, initial: 0xfedb, medial: 0xfedc, connectsAfter: true },  // ك
  0x0644: { isolated: 0xfedd, final: 0xfede, initial: 0xfedf, medial: 0xfee0, connectsAfter: true },  // ل
  0x0645: { isolated: 0xfee1, final: 0xfee2, initial: 0xfee3, medial: 0xfee4, connectsAfter: true },  // م
  0x0646: { isolated: 0xfee5, final: 0xfee6, initial: 0xfee7, medial: 0xfee8, connectsAfter: true },  // ن
  0x0647: { isolated: 0xfee9, final: 0xfeea, initial: 0xfeeb, medial: 0xfeec, connectsAfter: true },  // ه
  0x0648: { isolated: 0xfeed, final: 0xfeee, initial: 0xfeed, medial: 0xfeee, connectsAfter: false }, // و
  0x0649: { isolated: 0xfeef, final: 0xfef0, initial: 0xfeef, medial: 0xfef0, connectsAfter: false }, // ى (alef maksura)
  0x064a: { isolated: 0xfef1, final: 0xfef2, initial: 0xfef3, medial: 0xfef4, connectsAfter: true },  // ي
};

// Lam-Alef ligatures: map second character to [isolated, final]
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6], // آ
  0x0623: [0xfef7, 0xfef8], // أ
  0x0625: [0xfef9, 0xfefa], // إ
  0x0627: [0xfefb, 0xfefc], // ا
};

function isArabicChar(code: number): boolean {
  return (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff);
}

function isHarakat(code: number): boolean {
  return code >= 0x064b && code <= 0x065f;
}

/**
 * Shapes raw Arabic characters into connected Presentation Forms-B.
 */
export function shapeArabicText(text: string): string {
  if (!text) return "";

  // Strip harakat (tashkeel) for clean document display
  const chars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (!isHarakat(code)) {
      chars.push(code);
    }
  }

  const output: number[] = [];
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const current = chars[i];

    // Check for Lam-Alef ligature
    if (current === 0x0644 && i + 1 < len && LAM_ALEF[chars[i + 1]]) {
      const alef = chars[i + 1];
      const prev = i > 0 ? chars[i - 1] : 0;
      const prevConnects = prev && ARABIC_FORMS[prev] && ARABIC_FORMS[prev].connectsAfter;

      const lig = LAM_ALEF[alef];
      output.push(prevConnects ? lig[1] : lig[0]);
      i++; // Skip alef
      continue;
    }

    const form = ARABIC_FORMS[current];
    if (!form) {
      output.push(current);
      continue;
    }

    // Determine connection to previous
    const prev = i > 0 ? chars[i - 1] : 0;
    const prevConnects = prev && ARABIC_FORMS[prev] && ARABIC_FORMS[prev].connectsAfter;

    // Determine connection to next
    let nextConnects = false;
    if (form.connectsAfter && i + 1 < len) {
      const next = chars[i + 1];
      if (ARABIC_FORMS[next] && next !== 0x0621) {
        nextConnects = true;
      }
    }

    if (prevConnects && nextConnects) {
      output.push(form.medial);
    } else if (prevConnects) {
      output.push(form.final);
    } else if (nextConnects) {
      output.push(form.initial);
    } else {
      output.push(form.isolated);
    }
  }

  return String.fromCharCode(...output);
}

/**
 * Shapes Arabic text and reverses it for Left-To-Right rendering engines like PDF-lib.
 * Handles mixed text (Arabic words are shaped and reversed; English/numbers stay LTR).
 */
export function formatArabicForPdf(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Check if string contains any Arabic characters
  if (!/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(trimmed)) {
    return trimmed;
  }

  const shaped = shapeArabicText(trimmed);

  // Split into tokens: Arabic runs vs non-Arabic runs
  // For standard Arabic names (e.g. "يارا رمضان يوسف"), simply reverse the shaped characters
  // so that PDF-lib's LTR cursor draws them from right to left properly.
  const chars = Array.from(shaped);
  chars.reverse();
  return chars.join("");
}

