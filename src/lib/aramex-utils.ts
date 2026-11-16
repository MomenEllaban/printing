import * as XLSX from "xlsx";
import type { StudentWithReceipt } from "./certificates-parser";

export const ARAMEX_EGYPT_CITIES: string[] = [
  "Cairo",
  "Giza",
  "Alexandria",
  "6th of October",
  "Cheikh Zayed",
  "Hadayek Alahram",
  "Hadayek October",
  "Haram",
  "Dokki",
  "Zamalek",
  "Maadi",
  "Mokattam",
  "Nasr City",
  "Heliopolis",
  "New Cairo",
  "Rehab City",
  "Madinaty",
  "Shorouk",
  "Badr City",
  "Obour",
  "Helwan",
  "Tura",
  "Nozha",
  "New Nozha",
  "Banha",
  "Qalyub",
  "Qalyubia",
  "10th of Ramadan",
  "Zagazig",
  "Sharkia",
  "Tanta",
  "Gharbiya",
  "Mansoura",
  "Dakahlia",
  "Damietta",
  "Ras El Bar",
  "New Damietta",
  "Port Said",
  "Ismailia",
  "Suez",
  "Alexandria - East",
  "Alexandria - West",
  "Sidi Bishr",
  "Stanley",
  "Borg El Arab",
  "Damanhour",
  "Kafr El Dawar",
  "Beheira",
  "Kafr El Sheikh",
  "Shebin El Kom",
  "Sadat City",
  "Menofia",
  "Fayoum",
  "Beni Suef",
  "Fashn",
  "Minya",
  "Mallawi",
  "Assiut",
  "Sohag",
  "Sohag El Gedida",
  "Qena",
  "Luxor",
  "Aswan",
  "Hurghada",
  "El Gouna",
  "Safaga",
  "Ras Ghareb",
  "Red Sea",
  "Sharm El Sheikh",
  "South Sinai",
  "Marsa Matrouh",
  "Arish",
  "North Sinai",
  "Smart Village",
  "Other / أخرى",
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
  selectedCity: string;
  awb?: string;
}

/**
 * Builds a comprehensive Full Address (فل ادريس) string combining:
 * Street, Floor, Apartment, Landmark, Area, City, Governorate
 */
export function buildFullAddress(item: {
  street?: string;
  apartment?: string | number;
  floor?: string | number;
  landmark?: string;
  area?: string;
  city?: string;
  governorate?: string;
}): string {
  const parts: string[] = [];

  const street = (item.street || "").trim();
  if (street) {
    parts.push(street);
  }

  const floor = item.floor !== undefined && item.floor !== null ? String(item.floor).trim() : "";
  if (floor) {
    parts.push(/دور|floor/i.test(floor) ? floor : `الدور ${floor}`);
  }

  const apt = item.apartment !== undefined && item.apartment !== null ? String(item.apartment).trim() : "";
  if (apt) {
    parts.push(/شقة|شقه|apt|apartment/i.test(apt) ? apt : `شقة ${apt}`);
  }

  const landmark = (item.landmark || "").trim();
  if (landmark) {
    parts.push(/علامة|علامه|بجوار|near|landmark/i.test(landmark) ? landmark : `علامة مميزة: ${landmark}`);
  }

  const area = (item.area || "").trim();
  if (area) {
    parts.push(area);
  }

  const city = (item.city || "").trim();
  if (city && !parts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
    parts.push(city);
  }

  const gov = (item.governorate || "").trim();
  if (gov && !parts.some((p) => p.toLowerCase().includes(gov.toLowerCase()))) {
    parts.push(gov);
  }

  return parts.filter(Boolean).join(" - ");
}

/**
 * Detects the most appropriate Aramex Egypt City based on full address and original fields.
 */
export function detectAramexCity(item: {
  governorate?: string;
  city?: string;
  area?: string;
  street?: string;
  fullAddress?: string;
}): string {
  const text = [
    item.city || "",
    item.area || "",
    item.fullAddress || "",
    item.street || "",
    item.governorate || "",
  ]
    .join(" ")
    .toLowerCase();

  // Exact matching against city list
  if (item.city) {
    const rawCity = item.city.trim();
    const foundDirect = ARAMEX_EGYPT_CITIES.find(
      (c) => c.toLowerCase() === rawCity.toLowerCase(),
    );
    if (foundDirect) return foundDirect;
  }

  // Specific district and area keywords
  if (text.includes("hadayek alahram") || text.includes("حدائق الاهرام") || text.includes("حدائق الأهرام")) {
    return "Hadayek Alahram";
  }
  if (text.includes("hadayek october") || text.includes("حدائق اكتوبر") || text.includes("حدائق أكتوبر")) {
    return "Hadayek October";
  }
  if (text.includes("zayed") || text.includes("زايد") || text.includes("cheikh zayed") || text.includes("الشيخ زايد")) {
    return "Cheikh Zayed";
  }
  if (text.includes("october") || text.includes("اكتوبر") || text.includes("أكتوبر") || text.includes("6 october")) {
    return "6th of October";
  }
  if (text.includes("rehab") || text.includes("الرحاب")) {
    return "Rehab City";
  }
  if (text.includes("madinaty") || text.includes("مدينتي") || text.includes("مدينتى")) {
    return "Madinaty";
  }
  if (text.includes("shorouk") || text.includes("الشروق")) {
    return "Shorouk";
  }
  if (text.includes("badr") || text.includes("مدينة بدر") || text.includes("بدر")) {
    return "Badr City";
  }
  if (text.includes("obour") || text.includes("العبور")) {
    return "Obour";
  }
  if (text.includes("new cairo") || text.includes("التجمع") || text.includes("القاهرة الجديدة") || text.includes("fifth settlement")) {
    return "New Cairo";
  }
  if (text.includes("nasr city") || text.includes("مدينة نصر")) {
    return "Nasr City";
  }
  if (text.includes("heliopolis") || text.includes("مصر الجديدة")) {
    return "Heliopolis";
  }
  if (text.includes("new nozha") || text.includes("النزهة الجديدة")) {
    return "New Nozha";
  }
  if (text.includes("nozha") || text.includes("النزهة") || text.includes("النزهه")) {
    return "Nozha";
  }
  if (text.includes("maadi") || text.includes("المعادي") || text.includes("المعادى")) {
    return "Maadi";
  }
  if (text.includes("mokattam") || text.includes("المقطم")) {
    return "Mokattam";
  }
  if (text.includes("haram") || text.includes("الهرم")) {
    return "Haram";
  }
  if (text.includes("dokki") || text.includes("الدقي") || text.includes("الدقى")) {
    return "Dokki";
  }
  if (text.includes("zamalek") || text.includes("الزمالك")) {
    return "Zamalek";
  }
  if (text.includes("helwan") || text.includes("حلوان")) {
    return "Helwan";
  }
  if (text.includes("tura") || text.includes("طرة") || text.includes("طره")) {
    return "Tura";
  }
  if (text.includes("10th of ramadan") || text.includes("العاشر من رمضان")) {
    return "10th of Ramadan";
  }
  if (text.includes("sidi bishr") || text.includes("سيدي بشر")) {
    return "Sidi Bishr";
  }
  if (text.includes("stanley") || text.includes("ستانلي")) {
    return "Stanley";
  }
  if (text.includes("borg el arab") || text.includes("برج العرب")) {
    return "Borg El Arab";
  }
  if (text.includes("alexandria") || text.includes("alex") || text.includes("اسكندرية") || text.includes("الإسكندرية")) {
    return "Alexandria";
  }
  if (text.includes("ras el bar") || text.includes("رأس البر") || text.includes("راس البر")) {
    return "Ras El Bar";
  }
  if (text.includes("new damietta") || text.includes("دمياط الجديدة")) {
    return "New Damietta";
  }
  if (text.includes("damietta") || text.includes("دمياط")) {
    return "Damietta";
  }
  if (text.includes("mansoura") || text.includes("المنصورة")) {
    return "Mansoura";
  }
  if (text.includes("tanta") || text.includes("طنطا")) {
    return "Tanta";
  }
  if (text.includes("zagazig") || text.includes("الزقازيق")) {
    return "Zagazig";
  }
  if (text.includes("banha") || text.includes("بنها")) {
    return "Banha";
  }
  if (text.includes("qalyub") || text.includes("قليوب")) {
    return "Qalyub";
  }
  if (text.includes("qalyubia") || text.includes("قليوبية") || text.includes("القليوبية") || text.includes("qaliubiya")) {
    return "Qalyubia";
  }
  if (text.includes("ismailia") || text.includes("الإسماعيلية") || text.includes("الاسماعيلية")) {
    return "Ismailia";
  }
  if (text.includes("suez") || text.includes("السويس")) {
    return "Suez";
  }
  if (text.includes("port said") || text.includes("بورسعيد")) {
    return "Port Said";
  }
  if (text.includes("el gouna") || text.includes("الجونة")) {
    return "El Gouna";
  }
  if (text.includes("hurghada") || text.includes("الغردقة")) {
    return "Hurghada";
  }
  if (text.includes("sharm") || text.includes("شرم الشيخ")) {
    return "Sharm El Sheikh";
  }
  if (text.includes("fashn") || text.includes("الفشن")) {
    return "Fashn";
  }
  if (text.includes("beni suef") || text.includes("بني سويف")) {
    return "Beni Suef";
  }
  if (text.includes("minya") || text.includes("المنيا")) {
    return "Minya";
  }
  if (text.includes("mallawi") || text.includes("ملوي")) {
    return "Mallawi";
  }
  if (text.includes("assiut") || text.includes("أسيوط") || text.includes("اسيوط")) {
    return "Assiut";
  }
  if (text.includes("sohag el gedida") || text.includes("سوهاج الجديدة")) {
    return "Sohag El Gedida";
  }
  if (text.includes("sohag") || text.includes("سوهاج")) {
    return "Sohag";
  }
  if (text.includes("qena") || text.includes("قنا")) {
    return "Qena";
  }
  if (text.includes("luxor") || text.includes("الأقصر") || text.includes("الاقصر")) {
    return "Luxor";
  }
  if (text.includes("aswan") || text.includes("أسوان") || text.includes("اسوان")) {
    return "Aswan";
  }
  if (text.includes("damanhour") || text.includes("دمنهور")) {
    return "Damanhour";
  }
  if (text.includes("shebin el kom") || text.includes("شبين الكوم")) {
    return "Shebin El Kom";
  }
  if (text.includes("sadat") || text.includes("السادات")) {
    return "Sadat City";
  }
  if (text.includes("fayoum") || text.includes("الفيوم")) {
    return "Fayoum";
  }
  if (text.includes("smart village") || text.includes("القرية الذكية")) {
    return "Smart Village";
  }
  if (text.includes("giza") || text.includes("الجيزة")) {
    return "Giza";
  }
  if (text.includes("cairo") || text.includes("القاهرة")) {
    return "Cairo";
  }

  // Fallback to governorate if matched
  if (item.governorate) {
    const govFound = ARAMEX_EGYPT_CITIES.find(
      (c) => c.toLowerCase() === item.governorate!.trim().toLowerCase(),
    );
    if (govFound) return govFound;
  }

  return "Cairo"; // Default fallback
}

/**
 * Transforms StudentWithReceipt objects from a certificate batch into AramexRowItem array.
 */
export function convertStudentsToAramexRows(students: StudentWithReceipt[]): AramexRowItem[] {
  return students.map((s, idx) => {
    const fullAddress = buildFullAddress({
      street: s.street,
      apartment: s.apartment,
      floor: s.floor,
      landmark: s.landmark,
      area: s.area,
      city: s.city,
      governorate: s.governorate,
    });

    const detectedCity = detectAramexCity({
      governorate: s.governorate,
      city: s.city,
      area: s.area,
      street: s.street,
      fullAddress,
    });

    return {
      id: s.id || String(s.serialNumber || idx + 1),
      serialNumber: s.serialNumber || idx + 1,
      newRequestId: s.certificateCode || "",
      studentNameEn: s.studentName,
      studentNameAr: s.studentNameAr,
      nationalId: s.nationalId,
      phone: s.phone,
      phone2: s.phone2,
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
      selectedCity: detectedCity,
      awb: s.awb || "",
    };
  });
}

/**
 * Generates an Excel workbook from AramexRowItem array with all required columns.
 */
export function generateAramexWorkbook(rows: AramexRowItem[], sheetTitle = "Aramex-Shipments"): XLSX.WorkBook {
  const headers = [
    "No.",
    "New Request ID",
    "Student Name EN",
    "Student Name AR",
    "National ID",
    "Phone Number",
    "Phone 2",
    "Recipient",
    "Governorate",
    "Original City",
    "Area",
    "Street",
    "Apartment",
    "Floor",
    "Landmark",
    "Full Address", // العامود الجديد
    "City", // عامود سيتى المختار لأرامكس
    "Total Reports",
    "Report List",
    "AWB",
  ];

  const excelRows: (string | number | null)[][] = [headers];

  for (const r of rows) {
    excelRows.push([
      r.serialNumber || "",
      r.newRequestId || "",
      r.studentNameEn || "",
      r.studentNameAr || "",
      r.nationalId || "",
      r.phone || "",
      r.phone2 || "",
      r.recipient || "",
      r.governorate || "",
      r.originalCity || "",
      r.area || "",
      r.street || "",
      r.apartment !== undefined && r.apartment !== null ? String(r.apartment) : "",
      r.floor !== undefined && r.floor !== null ? String(r.floor) : "",
      r.landmark || "",
      r.fullAddress || "",
      r.selectedCity || "",
      r.totalReports || 1,
      r.reportList || "",
      r.awb || "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Column widths
  ws["!cols"] = [
    { wch: 6 }, // No
    { wch: 16 }, // Request ID
    { wch: 32 }, // Name EN
    { wch: 28 }, // Name AR
    { wch: 18 }, // National ID
    { wch: 16 }, // Phone
    { wch: 16 }, // Phone 2
    { wch: 26 }, // Recipient
    { wch: 14 }, // Gov
    { wch: 16 }, // Original City
    { wch: 16 }, // Area
    { wch: 35 }, // Street
    { wch: 10 }, // Apartment
    { wch: 8 },  // Floor
    { wch: 35 }, // Landmark
    { wch: 55 }, // Full Address
    { wch: 20 }, // City (Aramex)
    { wch: 12 }, // Total Reports
    { wch: 35 }, // Report List
    { wch: 16 }, // AWB
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
  return wb;
}

