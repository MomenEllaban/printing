import * as XLSX from "xlsx";
import type { StudentWithReceipt } from "./certificates-parser";
import {
  ARAMEX_CITIES_LIST,
  ARAMEX_MATCH_RULES,
  type AramexCityOption,
} from "./aramex-cities-data";

export { ARAMEX_CITIES_LIST, type AramexCityOption };

export function normalizeCityKey(str: string | undefined | null): string {
  if (!str) return "";
  return String(str).replace(/[\u00A0\s]+/g, " ").trim().toLowerCase();
}

export const ARAMEX_CITY_MAP: Map<string, AramexCityOption> = new Map();
for (const c of ARAMEX_CITIES_LIST) {
  ARAMEX_CITY_MAP.set(normalizeCityKey(c.cityGov), c);
  ARAMEX_CITY_MAP.set(normalizeCityKey(c.city), c);
}

export const DEFAULT_ARAMEX_CITY: AramexCityOption =
  ARAMEX_CITY_MAP.get("cairo - cairo") ||
  ARAMEX_CITIES_LIST[0];

const SORTED_ARAMEX_CITIES = [...ARAMEX_CITIES_LIST].sort(
  (a, b) => b.city.length - a.city.length,
);

const ARABIC_CITY_SYNONYMS: { keywords: string[]; cityGov: string }[] = [
  { keywords: ["حدائق الاهرام", "حدائق الأهرام", "hadayek alahram", "hadayek al ahram", "الاهرام", "الأهرام"], cityGov: "Pyramids Gardens - Giza" },
  { keywords: ["اكتوبر", "أكتوبر", "october"], cityGov: "October City - Giza" },
  { keywords: ["زايد", "zayed"], cityGov: "Sheikh Zayed City - Giza" },
  { keywords: ["مدينة نصر", "nasr city"], cityGov: "Nasr City - Cairo" },
  { keywords: ["التجمع", "القاهرة الجديدة", "new cairo"], cityGov: "New Cairo - Cairo" },
  { keywords: ["الرحاب", "rehab"], cityGov: "El Rehab - Cairo" },
  { keywords: ["مدينتي", "مدينتى", "madinaty"], cityGov: "Madinaty - Cairo" },
  { keywords: ["الشروق", "shorouk"], cityGov: "Al Shorouk - Cairo" },
  { keywords: ["العبور", "obour"], cityGov: "Al Obour City - Qaliubia" },
  { keywords: ["المعادي", "المعادى", "maadi"], cityGov: "Maadi - Cairo" },
  { keywords: ["المقطم", "mokattam"], cityGov: "Mokattam - Cairo" },
  { keywords: ["الفشن", "فشن", "fashn"], cityGov: "Al Fashn - Bani Swif" },
  { keywords: ["الهرم", "haram"], cityGov: "AL Haram - Giza" },
  { keywords: ["الغردقة", "غردقة", "hurghada"], cityGov: "Hurghada - Red Sea" },
  { keywords: ["شرم الشيخ", "sharm"], cityGov: "Sharm El Sheikh - South Sinai" },
  { keywords: ["بني سويف", "بنى سويف", "beni suef", "bani swif"], cityGov: "Bani Swif - Bani Swif" },
  { keywords: ["الاسكندرية", "الإسكندرية", "اسكندرية", "إسكندرية", "alexandria", "سيدي بشر", "ستانلي"], cityGov: "Alexandria - Alexandria" },
  { keywords: ["السويس", "سويس", "suez"], cityGov: "Suez - Suez" },
  { keywords: ["الاسماعيلية", "الإسماعيلية", "اسماعيلية", "ismailia"], cityGov: "Ismailia - Ismailia" },
  { keywords: ["بورسعيد", "بور سعيد", "port said"], cityGov: "Port Said - Port Said" },
  { keywords: ["طنطا", "tanta"], cityGov: "Tanta - AL Gharbia" },
  { keywords: ["المنصورة", "منصورة", "mansoura"], cityGov: "El Mansoura - Daqahlia" },
  { keywords: ["الزقازيق", "زقازيق", "zagazig"], cityGov: "Zagazig - AL Sharqia" },
  { keywords: ["سوهاج", "sohag"], cityGov: "New Sohag City - Sohag City" },
  { keywords: ["اسيوط", "أسيوط", "assiut", "asyut"], cityGov: "Assiut - Assiut" },
  { keywords: ["المنيا", "منيا", "minya", "menia"], cityGov: "Menia City - Menia City" },
  { keywords: ["قنا", "qena"], cityGov: "Qena - Qena" },
  { keywords: ["الاقصر", "الأقصر", "اقصر", "luxor"], cityGov: "Luxor - Luxor" },
  { keywords: ["اسوان", "أسوان", "aswan"], cityGov: "Aswan - Aswan" },
  { keywords: ["كفر الشيخ", "kafr el sheikh"], cityGov: "Kafr El Sheikh - Kafr Al Sheikh" },
  { keywords: ["دمنهور", "damanhur"], cityGov: "Damanhur - El Beheira" },
  { keywords: ["بنها", "banha"], cityGov: "Banha - Qaliubia" },
  { keywords: ["طرة", "طره", "tura", "torah"], cityGov: "Torah - Cairo" },
  { keywords: ["مصر الجديدة", "heliopolis", "النزهة", "nozha"], cityGov: "El Nozha - Cairo" },
  { keywords: ["الدقي", "الدقى", "dokki"], cityGov: "Dokki - Giza" },
  { keywords: ["المهندسين", "mohandessin"], cityGov: "Mohandessin - Giza" },
  { keywords: ["العجوزة", "agouza"], cityGov: "Agouza - Giza" },
  { keywords: ["العاشر من رمضان", "10th of ramadan"], cityGov: "10th of Ramadan City - AL Sharqia" },
  { keywords: ["15 مايو", "١٥ مايو", "15 of may"], cityGov: "15 of May City - Cairo" },
  { keywords: ["بدر", "badr city"], cityGov: "Badr City - Cairo" },
  { keywords: ["راس البر", "رأس البر", "ras el bar"], cityGov: "Ras Elbar - Dommiat" },
  { keywords: ["دمياط الجديدة", "new damietta"], cityGov: "New Damietta City - Dommiat" },
  { keywords: ["دمياط", "damietta"], cityGov: "Damiatta - Dommiat" },
];

export interface AramexRowItem {
  id: string;
  serialNumber?: string | number;
  newRequestId?: string;
  studentNameEn: string;
  studentNameAr?: string;
  nationalId?: string;
  phone?: string;
  phone2?: string;
  recipient?: string;
  totalReports?: number | string;
  reportList?: string;
  governorate?: string;
  originalCity?: string;
  area?: string;
  street?: string;
  apartment?: string | number;
  floor?: string | number;
  landmark?: string;
  fullAddress: string;
  selectedCityGov: string; // e.g. "Pyramids Gardens - Giza"
  cityOption: AramexCityOption;
  awb?: string;
}

/**
 * Converts Western digits to Arabic-Indic digits (٠-٩).
 */
export function toArabicDigits(val: string | number | undefined | null): string {
  const str = String(val ?? "").trim();
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/\d/g, (d) => arabicDigits[Number(d)] ?? d);
}

/**
 * Translates floor number into standard Arabic representation:
 * 0 -> "الدور الأرضي"
 * 1 -> "الدور الأول"
 * 2 -> "الدور الثاني"
 * ...
 * 211 -> "الدور رقم ٢١١"
 */
export function translateFloorToArabic(floorVal: string | number | undefined | null): string {
  if (floorVal === undefined || floorVal === null) return "";
  const raw = String(floorVal).trim();
  if (!raw || raw === "-") return "";

  // If already starts with الدور, keep it
  if (/^الدور/i.test(raw)) return raw;

  // Check for textual mentions of ground or ordinals
  if (/ارضي|أرضي|ground/i.test(raw)) return "الدور الأرضي";
  if (/^(الأول|الاول|أول|اول|first)$/i.test(raw)) return "الدور الأول";
  if (/^(الثاني|التاني|ثاني|تاني|second)$/i.test(raw)) return "الدور الثاني";
  if (/^(الثالث|التالت|ثالث|تالت|third)$/i.test(raw)) return "الدور الثالث";
  if (/^(الرابع|رابع|fourth)$/i.test(raw)) return "الدور الرابع";
  if (/^(الخامس|خامس|fifth)$/i.test(raw)) return "الدور الخامس";
  if (/^(السادس|سادس|sixth)$/i.test(raw)) return "الدور السادس";
  if (/^(السابع|سابع|seventh)$/i.test(raw)) return "الدور السابع";
  if (/^(الثامن|التامن|ثامن|تامن|eighth)$/i.test(raw)) return "الدور الثامن";
  if (/^(التاسع|تاسع|ninth)$/i.test(raw)) return "الدور التاسع";
  if (/^(العاشر|عاشر|tenth)$/i.test(raw)) return "الدور العاشر";

  const num = parseInt(raw, 10);
  if (isNaN(num)) {
    return `الدور ${raw}`;
  }

  const ordinalMap: Record<number, string> = {
    0: "الدور الأرضي",
    1: "الدور الأول",
    2: "الدور الثاني",
    3: "الدور الثالث",
    4: "الدور الرابع",
    5: "الدور الخامس",
    6: "الدور السادس",
    7: "الدور السابع",
    8: "الدور الثامن",
    9: "الدور التاسع",
    10: "الدور العاشر",
    11: "الدور الحادي عشر",
    12: "الدور الثاني عشر",
    13: "الدور الثالث عشر",
    14: "الدور الرابع عشر",
    15: "الدور الخامس عشر",
    16: "الدور السادس عشر",
    17: "الدور السابع عشر",
    18: "الدور الثامن عشر",
    19: "الدور التاسع عشر",
    20: "الدور العشرون",
  };

  if (ordinalMap[num]) return ordinalMap[num];

  // For numbers above 20 (like 211), it says "الدور رقم ٢١١"
  return `الدور رقم ${toArabicDigits(raw)}`;
}

/**
 * Translates apartment into standard Arabic representation:
 * 424 -> "الشقة رقم ٤٢٤"
 */
export function translateApartmentToArabic(aptVal: string | number | undefined | null): string {
  if (aptVal === undefined || aptVal === null) return "";
  const raw = String(aptVal).trim();
  if (!raw || raw === "-") return "";

  // If already starts with الشقة or شقة, return formatted
  if (/^الشقة/i.test(raw)) return raw;
  if (/^شقة/i.test(raw)) return `ال${raw}`;

  return `الشقة رقم ${toArabicDigits(raw)}`;
}

/**
 * Builds Full Address (فل ادريس) combining:
 * Governorate، City، Area، Street، Apartment (translated)، Floor (translated)، Landmark
 * Joined strictly by Arabic comma "، ".
 */
export function buildFullAddress(item: {
  governorate?: string;
  city?: string;
  area?: string;
  street?: string;
  apartment?: string | number;
  floor?: string | number;
  landmark?: string;
}): string {
  const gov = (item.governorate || "").trim();
  const city = (item.city || "").trim();
  const area = (item.area || "").trim();
  const street = (item.street || "").trim();
  const apt = translateApartmentToArabic(item.apartment);
  const floor = translateFloorToArabic(item.floor);
  const landmark = (item.landmark || "").trim();

  // Exactly in this order:
  // Governorate، City، Area، Street، Apartment (translated)، Floor (translated)، Landmark
  const parts: string[] = [gov, city, area, street, apt, floor, landmark].filter(Boolean);
  return parts.join("، ");
}

/**
 * Detects the most appropriate Aramex Egypt City option from official Aramex list.
 */
export function detectAramexCity(item: {
  governorate?: string;
  city?: string;
  area?: string;
  street?: string;
  fullAddress?: string;
}): AramexCityOption {
  const gov = (item.governorate || "").trim().toLowerCase();
  const city = (item.city || "").trim().toLowerCase();
  const area = (item.area || "").trim().toLowerCase();
  const street = (item.street || "").trim().toLowerCase();
  const fullAddress = (item.fullAddress || "").trim().toLowerCase();

  const combined = `${gov} ${city} ${area} ${street} ${fullAddress}`.toLowerCase();

  // 1. Direct rule pattern checks (e.g. "Giza، Hadayek Alahram" -> "Pyramids Gardens - Giza")
  for (const rule of ARAMEX_MATCH_RULES) {
    const pat = rule.pattern.toLowerCase().replace(/[,،]/g, " ").trim();
    const patWords = pat.split(/\s+/).filter(Boolean);
    if (patWords.length > 0 && patWords.every((w) => combined.includes(w))) {
      const match = ARAMEX_CITY_MAP.get(normalizeCityKey(rule.cityGov));
      if (match) return match;
    }
  }

  // 2. Arabic & English common synonym matching
  for (const item of ARABIC_CITY_SYNONYMS) {
    if (item.keywords.some((k) => combined.includes(k))) {
      const match = ARAMEX_CITY_MAP.get(normalizeCityKey(item.cityGov));
      if (match) return match;
    }
  }

  // 3. Match against all 346 official Aramex cities (longest first)
  for (const c of SORTED_ARAMEX_CITIES) {
    const rawCity = c.city.toLowerCase().trim();
    if (rawCity.length >= 3 && combined.includes(rawCity)) {
      return c;
    }
  }

  // 4. Direct city match in ARAMEX_CITIES_LIST
  if (item.city) {
    const rawCity = item.city.trim().toLowerCase();
    const exactOption = ARAMEX_CITIES_LIST.find(
      (c) =>
        c.city.toLowerCase() === rawCity ||
        c.cityGov.toLowerCase() === rawCity ||
        c.cityGov.toLowerCase().startsWith(`${rawCity} -`),
    );
    if (exactOption) return exactOption;
  }

  // 5. Fallback matching on governorate
  if (item.governorate) {
    const rawGov = item.governorate.trim().toLowerCase();
    const govOption = ARAMEX_CITIES_LIST.find((c) => c.gov.toLowerCase() === rawGov);
    if (govOption) return govOption;
  }

  return DEFAULT_ARAMEX_CITY;
}

/**
 * Transforms StudentWithReceipt objects from a certificate batch into AramexRowItem array.
 */
export function convertStudentsToAramexRows(students: StudentWithReceipt[]): AramexRowItem[] {
  return students.map((s, idx) => {
    const fullAddress = buildFullAddress({
      governorate: s.governorate,
      city: s.city,
      area: s.area,
      street: s.street,
      apartment: s.apartment,
      floor: s.floor,
      landmark: s.landmark,
    });

    const detectedCityOption = detectAramexCity({
      governorate: s.governorate,
      city: s.city,
      area: s.area,
      street: s.street,
      fullAddress,
    });

    const p1 = String(s.phone || "").trim();
    const p2 = String(s.phone2 || "").trim();
    let mobile = p1;
    let tel = p2;

    if (p2.startsWith("01") && !p1.startsWith("01")) {
      mobile = p2;
      tel = p1;
    } else if (p1 && p2 && p1.startsWith("20") && p2.startsWith("01")) {
      mobile = p2;
      tel = p1;
    }

    return {
      id: s.id || String(s.serialNumber || idx + 1),
      serialNumber: s.serialNumber || idx + 1,
      newRequestId: s.certificateCode || "",
      studentNameEn: s.studentName,
      studentNameAr: s.studentNameAr,
      nationalId: s.nationalId,
      phone: mobile,
      phone2: tel,
      recipient: s.recipient || s.studentNameAr || s.studentName,
      totalReports: s.totalReports || 1,
      reportList: s.reportsList || "",
      governorate: s.governorate || "",
      originalCity: s.city || "",
      area: s.area || "",
      street: s.street || "",
      apartment: s.apartment || "",
      floor: s.floor || "",
      landmark: s.landmark || "",
      fullAddress,
      selectedCityGov: detectedCityOption.cityGov,
      cityOption: detectedCityOption,
      awb: s.awb || "",
    };
  });
}

/**
 * Generates the official Aramex Excel Workbook matching the carrier's exact template.
 * Includes:
 * - 4 empty header rows
 * - Customer Details & Shipper Details section banners
 * - Official column headers
 * - Auto-populated Remarks: "تم تسليم عدد * X   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى"
 */
export function generateAramexWorkbook(rows: AramexRowItem[], sheetTitle = "Sheet1"): XLSX.WorkBook {
  const row0 = Array(17).fill("");
  const row1 = Array(17).fill("");
  const row2 = Array(17).fill("");
  const row3 = Array(17).fill("");

  const row4 = Array(17).fill("");
  row4[0] = "Customer Details";
  row4[12] = "Shipper Details";

  const row5Headers = [
    "HAWB",
    "Name",
    "Attention",
    "Full Address",
    "City - Governorate (Please select from the list)",
    "City",
    "Destination",
    "Government",
    "Reference / Unique",
    "Mobile Number",
    "Tel Number",
    "Landline Number",
    "Origin City (Please select from the list)",
    "Account Number",
    "Shipper Reference",
    "Commodity Description",
    "Remarks",
  ];

  const excelRows: (string | number | null)[][] = [
    row0,
    row1,
    row2,
    row3,
    row4,
    row5Headers,
  ];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const cityOpt = r.cityOption || ARAMEX_CITY_MAP.get(r.selectedCityGov.toLowerCase()) || DEFAULT_ARAMEX_CITY;
    const attentionNum = r.serialNumber !== undefined && r.serialNumber !== "" ? r.serialNumber : idx + 1;
    const nameVal = r.studentNameAr || r.studentNameEn || "";
    const totalReports = r.totalReports !== undefined && r.totalReports !== "" ? r.totalReports : 1;
    const remarksText = `تم تسليم عدد * ${totalReports}   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى`;

    excelRows.push([
      "", // HAWB
      nameVal, // Name (Arabic candidate name preferred)
      attentionNum, // Attention
      r.fullAddress, // Full Address
      cityOpt.cityGov, // City - Governorate (Please select from the list)
      cityOpt.city, // City
      cityOpt.code, // Destination
      cityOpt.gov, // Government
      r.originalCity || r.area || "", // Reference / Unique
      r.phone || "", // Mobile Number
      r.phone2 || r.phone || "", // Tel Number
      "", // Landline Number
      "Alexandria", // Origin City (Please select from the list)
      "233677", // Account Number
      "3930356", // Shipper Reference
      "", // Commodity Description
      remarksText, // Remarks
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set official column widths for Aramex sheet
  ws["!cols"] = [
    { wch: 12 }, // HAWB
    { wch: 32 }, // Name
    { wch: 10 }, // Attention
    { wch: 65 }, // Full Address
    { wch: 30 }, // City - Governorate
    { wch: 22 }, // City
    { wch: 12 }, // Destination
    { wch: 15 }, // Government
    { wch: 20 }, // Reference / Unique
    { wch: 16 }, // Mobile Number
    { wch: 16 }, // Tel Number
    { wch: 16 }, // Landline Number
    { wch: 18 }, // Origin City
    { wch: 16 }, // Account Number
    { wch: 18 }, // Shipper Reference
    { wch: 20 }, // Commodity Description
    { wch: 75 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
  return wb;
}
