import * as XLSX from "xlsx";
import type { CertificateStudentData } from "./stickers/certificate-stickers-pdf";

export type StudentWithReceipt = CertificateStudentData & {
  received?: boolean;
  receivedAt?: string | null;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-#:()]+/g, "");
}

/**
 * Builds an Arabic name lookup map from all secondary/checklist sheets in the workbook.
 */
export function buildCrossSheetArabicMap(workbook: XLSX.WorkBook): {
  byId: Map<string, string>;
  byEmail: Map<string, string>;
  byName: Map<string, string>;
} {
  const byId = new Map<string, string>();
  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rawRows) || rawRows.length < 2) continue;

    let headerIdx = -1;
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r] || [];
      const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
      if (
        (joined.includes("name") || joined.includes("student") || joined.includes("اسم")) &&
        (joined.includes("ar") || joined.includes("arabic") || joined.includes("عربي") || joined.includes("report") || joined.includes("id"))
      ) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx < 0) continue;

    const headers = (rawRows[headerIdx] || []).map((h) => normalizeHeader(String(h || "")));
    let arIdx = -1;
    let enIdx = -1;
    let idIdx = -1;
    let emailIdx = -1;

    headers.forEach((h, col) => {
      if (
        h.includes("namear") ||
        h.includes("arabic") ||
        h.includes("عربي") ||
        h.includes("بالعربي") ||
        h.includes("الاسمبالعربي") ||
        h.includes("اسمالطالببالعربي")
      ) {
        arIdx = col;
      } else if (
        h.includes("nameen") ||
        h.includes("english") ||
        h.includes("انجليزي") ||
        h.includes("إنجليزي") ||
        h.includes("بالانجليزي") ||
        h.includes("بالإنجليزي")
      ) {
        enIdx = col;
      } else if (h === "name" || h === "student" || h.includes("studentname") || h === "اسم" || h === "الاسم") {
        if (enIdx < 0) enIdx = col;
      }

      if (h.includes("id") || h.includes("national") || h.includes("nid") || h.includes("رقمقومي") || h.includes("بطاقة")) {
        if (idIdx < 0) idIdx = col;
      }
      if (h.includes("email") || h.includes("mail") || h.includes("ايميل") || h.includes("بريد")) {
        if (emailIdx < 0) emailIdx = col;
      }
    });

    if (arIdx < 0) continue;

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawAr = row[arIdx];
      if (!rawAr || typeof rawAr !== "string" && typeof rawAr !== "number") continue;
      const arName = String(rawAr).trim();
      if (!arName || !/[\u0600-\u06FF]/.test(arName)) continue;

      if (idIdx >= 0 && row[idIdx]) {
        const id = String(row[idIdx]).trim();
        if (id) byId.set(id, arName);
      }
      if (emailIdx >= 0 && row[emailIdx]) {
        const email = String(row[emailIdx]).trim().toLowerCase();
        if (email) byEmail.set(email, arName);
      }
      if (enIdx >= 0 && row[enIdx]) {
        const en = String(row[enIdx]).trim().toLowerCase();
        if (en) byName.set(en, arName);
      }
    }
  }

  return { byId, byEmail, byName };
}

/**
 * Cross-sheet address structure for enriching records when addresses reside in a secondary sheet.
 */
export interface CrossSheetAddressRecord {
  governorate?: string;
  city?: string;
  area?: string;
  street?: string;
  apartment?: string;
  floor?: string;
  landmark?: string;
  recipient?: string;
  phone?: string;
  phone2?: string;
  awb?: string;
}

export function buildCrossSheetAddressMap(workbook: XLSX.WorkBook): {
  byId: Map<string, CrossSheetAddressRecord>;
  byEmail: Map<string, CrossSheetAddressRecord>;
  byName: Map<string, CrossSheetAddressRecord>;
} {
  const byId = new Map<string, CrossSheetAddressRecord>();
  const byEmail = new Map<string, CrossSheetAddressRecord>();
  const byName = new Map<string, CrossSheetAddressRecord>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rawRows) || rawRows.length < 2) continue;

    let headerIdx = -1;
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r] || [];
      const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
      if (joined.includes("street") || joined.includes("governorate") || joined.includes("city") || joined.includes("شارع") || joined.includes("عنوان")) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx < 0) continue;

    const headers = (rawRows[headerIdx] || []).map((h) => normalizeHeader(String(h || "")));

    let idIdx = -1;
    let emailIdx = -1;
    let nameIdx = -1;
    let govIdx = -1;
    let cityIdx = -1;
    let areaIdx = -1;
    let streetIdx = -1;
    let aptIdx = -1;
    let floorIdx = -1;
    let landmarkIdx = -1;
    let recipientIdx = -1;
    let phoneNumIdx = -1;
    let phoneIdx = -1;
    let awbIdx = -1;

    headers.forEach((h, col) => {
      if (h.includes("id") || h.includes("national") || h.includes("nid")) idIdx = col;
      if (h.includes("email") || h.includes("mail")) emailIdx = col;
      if (h.includes("name") || h.includes("student") || h.includes("طالب") || h.includes("اسم")) nameIdx = col;

      if (h === "governorate" || h.includes("governorate") || h.includes("محافظ") || h === "gov") govIdx = col;
      if (h === "city" || h.includes("city") || h.includes("مدين")) cityIdx = col;
      if (h === "area" || h.includes("area") || h.includes("منطق") || h.includes("حي")) areaIdx = col;
      if (h === "street" || h.includes("street") || h.includes("شارع") || h.includes("address") || h.includes("عنوان")) streetIdx = col;
      if (h === "apartment" || h.includes("apartment") || h.includes("apt") || h.includes("شقة") || h.includes("شقه")) aptIdx = col;
      if (h === "floor" || h.includes("floor") || h.includes("الدور") || h.includes("دور")) floorIdx = col;
      if (h === "landmark" || h.includes("landmark") || h.includes("علام") || h.includes("مميز")) landmarkIdx = col;
      if (h.includes("recipient") || h.includes("مستلم")) recipientIdx = col;
      if (h === "phonenumber" || h.includes("studentphone")) phoneNumIdx = col;
      if (h === "phone" || h.includes("recipientphone") || h.includes("mobile") || h.includes("موبايل")) phoneIdx = col;
      if (h.includes("awb") || h.includes("بوليصة")) awbIdx = col;
    });

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const record: CrossSheetAddressRecord = {
        governorate: govIdx >= 0 && row[govIdx] ? String(row[govIdx]).trim() : undefined,
        city: cityIdx >= 0 && row[cityIdx] ? String(row[cityIdx]).trim() : undefined,
        area: areaIdx >= 0 && row[areaIdx] ? String(row[areaIdx]).trim() : undefined,
        street: streetIdx >= 0 && row[streetIdx] ? String(row[streetIdx]).trim() : undefined,
        apartment: aptIdx >= 0 && row[aptIdx] ? String(row[aptIdx]).trim() : undefined,
        floor: floorIdx >= 0 && row[floorIdx] ? String(row[floorIdx]).trim() : undefined,
        landmark: landmarkIdx >= 0 && row[landmarkIdx] ? String(row[landmarkIdx]).trim() : undefined,
        recipient: recipientIdx >= 0 && row[recipientIdx] ? String(row[recipientIdx]).trim() : undefined,
        phone: phoneIdx >= 0 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined,
        phone2: phoneNumIdx >= 0 && row[phoneNumIdx] ? String(row[phoneNumIdx]).trim() : undefined,
        awb: awbIdx >= 0 && row[awbIdx] ? String(row[awbIdx]).trim() : undefined,
      };

      const hasAddress = Boolean(record.governorate || record.city || record.street || record.area);
      if (!hasAddress) continue;

      if (idIdx >= 0 && row[idIdx]) byId.set(String(row[idIdx]).trim(), record);
      if (emailIdx >= 0 && row[emailIdx]) byEmail.set(String(row[emailIdx]).trim().toLowerCase(), record);
      if (nameIdx >= 0 && row[nameIdx]) byName.set(String(row[nameIdx]).trim().toLowerCase(), record);
    }
  }

  return { byId, byEmail, byName };
}

/**
 * Parses an entire Excel workbook into an array of student certificate records.
 * Prioritizes shipping/Aramex sheets that contain delivery address columns.
 */
export function parseCertificateWorkbook(
  workbook: XLSX.WorkBook,
  defaultBatchName: string,
): StudentWithReceipt[] {
  if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
    return [];
  }

  // 1. Cross-sheet lookup maps for Arabic names and Shipping addresses
  const { byId: arabicById, byEmail: arabicByEmail, byName: arabicByName } = buildCrossSheetArabicMap(workbook);
  const { byId: addressById, byEmail: addressByEmail, byName: addressByName } = buildCrossSheetAddressMap(workbook);

  // 2. Select the BEST primary sheet: prioritize sheets containing Aramex / Shipping addresses
  let bestSheetName = "";
  let bestScore = -1;

  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes("summary")) continue;
    const s = workbook.Sheets[name];
    if (!s) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(s, { header: 1 });
    if (!Array.isArray(rawRows) || rawRows.length < 2) continue;

    let score = 0;
    const lowerName = name.toLowerCase();
    if (lowerName.includes("aramex")) score += 60;
    if (lowerName.includes("shipping")) score += 50;
    if (lowerName.includes("06-")) score += 30;
    if (lowerName.includes("report")) score += 10;

    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r] || [];
      const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
      if (joined.includes("street") || joined.includes("شارع")) score += 35;
      if (joined.includes("governorate") || joined.includes("محافظ")) score += 25;
      if (joined.includes("apartment") || joined.includes("شقة") || joined.includes("شقه")) score += 20;
      if (joined.includes("floor") || joined.includes("دور")) score += 20;
      if (joined.includes("landmark") || joined.includes("علامة")) score += 20;
      if (joined.includes("city") || joined.includes("مدين")) score += 10;
      if (joined.includes("area") || joined.includes("منطق")) score += 15;
      if (joined.includes("name") || joined.includes("طالب") || joined.includes("student")) score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestSheetName = name;
    }
  }

  const primarySheetName = bestSheetName || workbook.SheetNames[0];
  const mainSheet = workbook.Sheets[primarySheetName];
  if (!mainSheet) return [];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  // Find header row in first 6 rows
  let headerIdx = 0;
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
    if (joined.includes("name") || joined.includes("student") || joined.includes("report") || joined.includes("طالب")) {
      headerIdx = r;
      break;
    }
  }

  const headers = (rawRows[headerIdx] || []).map((h) => normalizeHeader(String(h || "")));
  const results: StudentWithReceipt[] = [];

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    let serial = "";
    let nameAr = "";
    let nameEn = "";
    let nationalId = "";
    let email = "";
    let totalReports: number | string = 1;
    let reportList = "";
    let school = "";
    let gov = "";
    let reqId = "";
    let batchName = defaultBatchName;

    // Aramex / Delivery shipping fields
    let recipient = "";
    let city = "";
    let area = "";
    let street = "";
    let apartment = "";
    let floor = "";
    let landmark = "";
    let studentPhone = "";
    let recipientPhone = "";
    let awb = "";

    row.forEach((val: any, colIdx: number) => {
      if (val === undefined || val === null || String(val).trim() === "") return;
      const v = String(val).trim();
      const h = headers[colIdx] || "";

      if (h === "sn" || h === "serial" || h === "no" || (colIdx === 0 && !isNaN(Number(v)))) {
        if (!serial) serial = v;
      }

      if (
        h.includes("namear") ||
        h.includes("arabic") ||
        h.includes("عربي") ||
        h.includes("بالعربي") ||
        h.includes("الاسمبالعربي") ||
        h.includes("اسمالطالببالعربي")
      ) {
        nameAr = v;
      } else if (
        h.includes("nameen") ||
        h.includes("english") ||
        h.includes("انجليزي") ||
        h.includes("إنجليزي") ||
        h.includes("بالانجليزي") ||
        h.includes("بالإنجليزي")
      ) {
        nameEn = v;
      } else if (h.includes("name") || h.includes("student") || h.includes("طالب") || h.includes("اسم")) {
        if (/[\u0600-\u06FF]/.test(v)) {
          if (!nameAr) nameAr = v;
        } else {
          if (!nameEn) nameEn = v;
        }
      }

      if (h.includes("recipient") || h.includes("المستلم") || h.includes("مستلم")) {
        recipient = v;
      }

      // Exact phone column distinctions: Phone Number (Student Phone) vs Phone (Recipient / Mobile)
      if (h === "phonenumber" || h.includes("studentphone")) {
        studentPhone = v;
      } else if (h === "phone" || h.includes("recipientphone") || h.includes("mobile") || h.includes("هاتف") || h.includes("تليفون") || h.includes("موبايل")) {
        recipientPhone = v;
      }

      if (h.includes("national") || h.includes("nid") || h.includes("idnumber") || (h === "id" && !reqId)) {
        nationalId = v;
      }
      if (h.includes("email") || h.includes("mail")) {
        email = v;
      }
      if (h.includes("totalreport") || h.includes("nbofreport")) {
        totalReports = v;
      }
      if (h.includes("reportlist") || h.includes("reports") || h.includes("report")) {
        if (!h.includes("total") && !h.includes("nb")) {
          reportList = v;
        }
      }
      if (h.includes("school") || h.includes("مدرسة") || h.includes("مدرسه")) {
        school = v;
      }

      // Address Fields
      if (h === "governorate" || h.includes("governorate") || h.includes("محافظ") || h === "gov") {
        gov = v;
      }
      if (h === "city" || h.includes("city") || h.includes("مدين")) {
        city = v;
      }
      if (h === "area" || h.includes("area") || h.includes("منطق") || h.includes("حي") || h.includes("district")) {
        area = v;
      }
      if (h === "street" || h.includes("street") || h.includes("شارع") || h.includes("address") || h.includes("عنوان")) {
        street = v;
      }
      if (h === "apartment" || h.includes("apartment") || h.includes("apt") || h.includes("شقة") || h.includes("شقه") || h.includes("flat")) {
        apartment = v;
      }
      if (h === "floor" || h.includes("floor") || h.includes("الدور") || h.includes("دور")) {
        floor = v;
      }
      if (h === "landmark" || h.includes("landmark") || h.includes("علام") || h.includes("مميز")) {
        landmark = v;
      }
      if (h.includes("awb") || h.includes("بوليصة") || h.includes("بوليصه")) {
        awb = v;
      }

      if (h.includes("requestid") || h.includes("newrequestid")) {
        reqId = v;
      }
      if (h.includes("batch")) {
        batchName = v;
      }
    });

    const cleanId = nationalId.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanEn = nameEn.trim().toLowerCase();

    // Cross-sheet fallback for Arabic name if not on the main sheet
    if (!nameAr) {
      nameAr =
        (cleanId && arabicById.get(cleanId)) ||
        (cleanEmail && arabicByEmail.get(cleanEmail)) ||
        (cleanEn && arabicByName.get(cleanEn)) ||
        "";
    }

    // Cross-sheet fallback for Address fields if missing from primary sheet
    if (!street && !gov && !area) {
      const crossAddr =
        (cleanId && addressById.get(cleanId)) ||
        (cleanEmail && addressByEmail.get(cleanEmail)) ||
        (cleanEn && addressByName.get(cleanEn));

      if (crossAddr) {
        if (!gov && crossAddr.governorate) gov = crossAddr.governorate;
        if (!city && crossAddr.city) city = crossAddr.city;
        if (!area && crossAddr.area) area = crossAddr.area;
        if (!street && crossAddr.street) street = crossAddr.street;
        if (!apartment && crossAddr.apartment) apartment = crossAddr.apartment;
        if (!floor && crossAddr.floor) floor = crossAddr.floor;
        if (!landmark && crossAddr.landmark) landmark = crossAddr.landmark;
        if (!recipient && crossAddr.recipient) recipient = crossAddr.recipient;
        if (!recipientPhone && crossAddr.phone) recipientPhone = crossAddr.phone;
        if (!studentPhone && crossAddr.phone2) studentPhone = crossAddr.phone2;
        if (!awb && crossAddr.awb) awb = crossAddr.awb;
      }
    }

    const studentName = nameEn || nameAr;
    if (!studentName) continue;

    // Determine Mobile Number (starts with 01) vs Tel Number
    let mobile = recipientPhone || studentPhone || "";
    let tel = studentPhone || recipientPhone || "";

    if (studentPhone && recipientPhone) {
      if (recipientPhone.startsWith("01")) {
        mobile = recipientPhone;
        tel = studentPhone;
      } else if (studentPhone.startsWith("01")) {
        mobile = studentPhone;
        tel = recipientPhone;
      } else {
        mobile = recipientPhone;
        tel = studentPhone;
      }
    }

    const finalSerial = serial || String(results.length + 1);
    results.push({
      id: `row-${r}`,
      serialNumber: finalSerial,
      studentName,
      studentNameAr: nameAr || undefined,
      seatNumber: "",
      nationalId,
      schoolName: school,
      governorate: gov,
      city: city || undefined,
      area: area || undefined,
      street: street || undefined,
      apartment: apartment || undefined,
      floor: floor || undefined,
      landmark: landmark || undefined,
      recipient: recipient || undefined,
      phone: mobile || undefined,
      phone2: tel || undefined,
      awb: awb || undefined,
      totalReports: totalReports || 1,
      reportsList: reportList || "Official EST Score Report",
      certificateCode: reqId || `EST-REP-${String(finalSerial).padStart(4, "0")}`,
      batchName,
      received: false,
      receivedAt: null,
    });
  }

  return results;
}
