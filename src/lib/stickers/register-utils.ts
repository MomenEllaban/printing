import type { DriveItem, Breadcrumb } from "@/lib/types";
import { OFFICIAL_ROOMS_SET, OFFICIAL_EST_SCHOOLS } from "./est-reference-data";

export type RegisterCategory = "building_excel" | "student" | "control" | "proctor" | null;

export interface RegisterTheme {
  category: "building_excel" | "control" | "proctor" | "student";
  nameAr: string;
  nameEn: string;
  shortAr: string;
  shortEn: string;
  addLabelAr: string;
  addLabelEn: string;
  ownerAr: string;
  ownerEn: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  hoverBgClass: string;
  chipBorderClass: string;
  chipBgClass: string;
  chipHoverClass: string;
  iconColorClass: string;
}

/**
 * Checks whether a user profile is authorized to upload/add a specific register category:
 * - "printing": Full admin, can add building excel and student registers.
 * - "dina": Can add building excel (and legacy control/proctor).
 * - "nabil": Can add student register (rooms).
 */
export function canProfileAddRegister(profileId: string | undefined | null, category: RegisterCategory): boolean {
  if (!category) return false;
  if (!profileId || profileId === "printing") return true;
  if (profileId === "dina") return category === "building_excel" || category === "control" || category === "proctor";
  if (profileId === "nabil") return category === "student";
  return false;
}

/**
 * Returns distinct visual styling and labels for each register category:
 * - building_excel: Emerald / Green Excel theme (Buildings / دينا + طباعة)
 * - student: Purple / Violet (Rooms / نبيل + طباعة)
 * - control: Sky Blue (Legacy Building Control)
 * - proctor: Teal / Slate (Legacy Floor Proctor)
 */
export function getRegisterTheme(category: "building_excel" | "control" | "proctor" | "student"): RegisterTheme {
  if (category === "building_excel") {
    return {
      category: "building_excel",
      nameAr: "ريجستر المبنى (Excel)",
      nameEn: "Building Register (Excel)",
      shortAr: "ريجستر المبنى",
      shortEn: "Building Excel",
      addLabelAr: "+ إضافة ريجستر (Excel)",
      addLabelEn: "+ Add Register (Excel)",
      ownerAr: "دينا",
      ownerEn: "Dina",
      textClass: "text-emerald-700 dark:text-emerald-300",
      bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderClass: "border-emerald-500/35",
      hoverBgClass: "hover:bg-emerald-500/20",
      chipBorderClass: "border-emerald-500/30",
      chipBgClass: "bg-emerald-500/10",
      chipHoverClass: "hover:bg-emerald-500/20",
      iconColorClass: "text-emerald-600 dark:text-emerald-400",
    };
  }

  if (category === "student") {
    return {
      category: "student",
      nameAr: "ريجستر الطلاب",
      nameEn: "Student Register",
      shortAr: "ريجستر الطلاب",
      shortEn: "Student Reg",
      addLabelAr: "+ إضافة ريجستر (طلاب)",
      addLabelEn: "+ Student Reg",
      ownerAr: "نبيل",
      ownerEn: "Nabil",
      textClass: "text-purple-700 dark:text-purple-300",
      bgClass: "bg-purple-500/10 dark:bg-purple-500/20",
      borderClass: "border-purple-500/35",
      hoverBgClass: "hover:bg-purple-500/20",
      chipBorderClass: "border-purple-500/30",
      chipBgClass: "bg-purple-500/10",
      chipHoverClass: "hover:bg-purple-500/20",
      iconColorClass: "text-purple-600 dark:text-purple-400",
    };
  }

  if (category === "control") {
    return {
      category: "control",
      nameAr: "كشف الكنترول",
      nameEn: "Control Register",
      shortAr: "كنترول",
      shortEn: "Control",
      addLabelAr: "+ كشف كنترول",
      addLabelEn: "+ Control Reg",
      ownerAr: "دينا",
      ownerEn: "Dina",
      textClass: "text-sky-700 dark:text-sky-300",
      bgClass: "bg-sky-500/10 dark:bg-sky-500/20",
      borderClass: "border-sky-500/35",
      hoverBgClass: "hover:bg-sky-500/20",
      chipBorderClass: "border-sky-500/30",
      chipBgClass: "bg-sky-500/10",
      chipHoverClass: "hover:bg-sky-500/20",
      iconColorClass: "text-sky-600 dark:text-sky-400",
    };
  }

  // Default: proctor
  return {
    category: "proctor",
    nameAr: "كشف المراقبين",
    nameEn: "Proctor Register",
    shortAr: "مراقبين",
    shortEn: "Proctors",
    addLabelAr: "+ كشف مراقبين",
    addLabelEn: "+ Proctor Reg",
    ownerAr: "دينا",
    ownerEn: "Dina",
    textClass: "text-teal-700 dark:text-teal-300",
    bgClass: "bg-teal-500/10 dark:bg-teal-500/20",
    borderClass: "border-teal-500/35",
    hoverBgClass: "hover:bg-teal-500/20",
    chipBorderClass: "border-teal-500/30",
    chipBgClass: "bg-teal-500/10",
    chipHoverClass: "hover:bg-teal-500/20",
    iconColorClass: "text-teal-600 dark:text-teal-400",
  };
}

/**
 * Checks whether an item is a valid Building Excel file (.xlsx, .xls, .csv).
 */
export function isBuildingExcelFile(item: { id?: string; name: string; isFolder?: boolean; mimeType?: string }): boolean {
  if (item.isFolder) return false;
  const name = item.name.toLowerCase();
  const isExcelExt = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
  const isExcelMime =
    item.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    item.mimeType === "application/vnd.ms-excel" ||
    item.mimeType === "text/csv";
  return isExcelExt || isExcelMime;
}

/**
 * Checks whether an item is a valid Proctor Register PDF.
 */
export function isProctorRegisterFile(item: { id?: string; name: string; isFolder?: boolean; mimeType?: string }): boolean {
  if (item.isFolder) return false;
  const isPdf = item.mimeType === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return false;
  return (
    /proctor\s*register|كشف\s*مراقبين|كشف\s*المراقبين|ملاحظين/i.test(item.name) ||
    item.name.toLowerCase().includes("proctor")
  );
}

/**
 * Checks whether an item is a valid Control Register PDF.
 */
export function isControlRegisterFile(item: { id?: string; name: string; isFolder?: boolean; mimeType?: string }): boolean {
  if (item.isFolder) return false;
  const isPdf = item.mimeType === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return false;
  return (
    /control\s*register|كشف\s*كنترول|كشف\s*الكنترول|كنترول/i.test(item.name) ||
    item.name.toLowerCase().includes("control")
  );
}

export {
  EST1_ROOM_FILE_REGEX,
  parseEst1FileName,
  parseEstRoomFileName,
  formatEst1FileName,
  formatEst2FileName,
  getRoomExamCounts,
  type Est1RoomExamCounts,
  type RoomSubjectCount,
  type EstSubjectKey,
} from "./est-room-data";

import { parseEstRoomFileName } from "./est-room-data";

/**
 * Checks whether an item is a valid Student Register PDF.
 * Recognizes traditional names as well as the official EST room file formats (EST 1 and EST 2):
 * - EST 1: `ROOM | LIT-XX | MATH-YY | ESSAY-YES/NO-ZZ.pdf`
 * - EST 2: `ROOM | MATH1-XX | MATH2-YY | BIO-ZZ | CHEM-WW | PHY-VV.pdf`
 */
export function isStudentRegisterFile(item: { id?: string; name: string; isFolder?: boolean; mimeType?: string }): boolean {
  if (item.isFolder) return false;
  const isPdf = item.mimeType === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return false;

  // Direct match using universal parser for EST 1 & EST 2
  if (parseEstRoomFileName(item.name)) {
    return true;
  }

  return (
    /student\s*register|كشف\s*طلاب|كشف\s*الطلاب|كشف\s*لجان|لجنة/i.test(item.name) ||
    /LIT-\d+|MATH\d?-\d+|BIO-\d+|CHEM-\d+|PHY-\d+/i.test(item.name) ||
    item.name.toLowerCase().includes("student")
  );
}

export function findBuildingExcelFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;
  // Prioritize spreadsheets with keywords in their name
  const prioritized = items.find(
    (item) =>
      isBuildingExcelFile(item) &&
      /building|control|details|excel|مبنى|كنترول|تفاصيل|شيت/i.test(item.name),
  );
  if (prioritized) return prioritized;
  return items.find(isBuildingExcelFile);
}

export function findProctorFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;
  return items.find(isProctorRegisterFile);
}

export function findControlFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;
  return items.find(isControlRegisterFile);
}

export function findStudentFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;

  // 1. Prioritize files matching official EST Room naming convention (EST 1 & EST 2) or explicit student register names
  const matched = items.find(isStudentRegisterFile);
  if (matched) return matched;

  // 2. Next prioritize any PDF file inside the room folder
  const anyPdf = items.find(
    (item) => !item.isFolder && (item.mimeType === "application/pdf" || item.name.toLowerCase().endsWith(".pdf")),
  );
  if (anyPdf) return anyPdf;

  // 3. ANY non-folder file inside a room folder is considered the Student Register
  return items.find((item) => !item.isFolder);
}

/**
 * Helper to check whether a folder name matches a floor pattern.
 */
export function isFloorFolderName(name?: string | null): boolean {
  if (!name) return false;
  return /floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b|\bground(\s*floor)?\b|\bأرضي\b|\bbasement\b|\bبدروم\b|\bmezzanine\b|\bميزانين\b/i.test(
    name.trim(),
  );
}

/**
 * Helper to check whether a folder name matches a room pattern.
 */
export function isRoomFolderName(name?: string | null): boolean {
  if (!name) return false;
  const folderName = name.trim();

  // 0. Match official EST reference rooms immediately (e.g. Nebraska, California, MathsClass, Senior1, G5-C)
  if (OFFICIAL_ROOMS_SET.has(folderName.toLowerCase())) {
    return true;
  }

  // 1. Exclude exam roots, months/dates, governorates, drive roots
  if (
    /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s,._-]+))?$/i.test(folderName) ||
    /^(december|october|november|january|february|march|april|may|june|july|august|september|oct|nov|dec)\s*\d{4}/i.test(
      folderName,
    ) ||
    /^(cairo|alexandria|giza|qalyubia|dakahlia|menofia|suez|mansoura|tanta|ismailia|port said|القاهرة|الإسكندرية|الجيزة|القليوبية|الدقهلية|المنوفية|السويس|المنصورة|طنطا|الإسماعيلية|بورسعيد|root|drive|my drive|home|file manager app|schools)$/i.test(
      folderName,
    )
  ) {
    return false;
  }
  // 2. Exclude floors
  if (
    /floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b|\bground(\s*floor)?\b|\bأرضي\b|\bbasement\b|\bبدروم\b|\bmezzanine\b|\bميزانين\b/i.test(
      folderName,
    ) ||
    /^(ground|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s*(floor)?$/i.test(folderName)
  ) {
    return false;
  }
  // 3. Exclude buildings, centers, control, management
  if (
    /building|مبنى|قسم|faculty|كلية|center|سنتر|campus|academy|أكاديمية|جامعة|مجمع|school|مدرسة|institute|معهد|control|كنترول|proctor|إدارة|admin/i.test(
      folderName,
    )
  ) {
    return false;
  }
  // 4. Room patterns: M102, G5-C, 102, 204B, Room 1, Room 1.1, Room-102, قاعة 5, لجنة 1, Senior1, MathsClass, etc.
  if (
    /^([A-Za-z]{1,4}[-_\s]?\d{1,4}[-_\s]?[A-Za-z]?|\d{1,4}[-_\s]?[A-Za-z]?|(?:room|قاعة|لجنة|committee|lab|معمل)[-_\s]*\d+(\.\d+)?[-_\s]?[A-Za-z]?|(?:senior|grade|class|gr)[-_\s]*\d+[-_\s]?[A-Za-z]?|mathsclass)$/i.test(
      folderName,
    )
  ) {
    return true;
  }
  if (
    /room|قاعة|لجنة|معمل/i.test(folderName) &&
    !/control|proctor|floor|building|management|pharmacy|center|faculty|school|سنتر|مبنى|إدارة/i.test(folderName)
  ) {
    return true;
  }
  return false;
}

export function findRegisterFileInItems(category: RegisterCategory, items?: DriveItem[]): DriveItem | undefined {
  if (!category || !items || !items.length) return undefined;
  if (category === "building_excel") return findBuildingExcelFileInItems(items);
  if (category === "student") return findStudentFileInItems(items);
  if (category === "control") return findControlFileInItems(items) || findBuildingExcelFileInItems(items);
  if (category === "proctor") return findProctorFileInItems(items);
  return undefined;
}

/**
 * Determines whether a folder qualifies for a register:
 * - "building_excel" (for Buildings only: one unified Excel file with multiple tabs)
 * - "student" (for Rooms only: Student Attendance & Seating Register PDF)
 * - null (for Floors: no proctor register uploaded per floor)
 * - null (for City/Governorate, Test Centers, Roots)
 */
export function getFolderRegisterCategory(params: {
  folder: { id: string; name: string; isFolder?: boolean };
  breadcrumbs?: Breadcrumb[];
  depth?: number;
  isCurrentFolder?: boolean;
}): RegisterCategory {
  const { folder, breadcrumbs, isCurrentFolder } = params;
  if (folder.isFolder === false) return null;

  const folderName = folder.name.trim();

  // 1. Explicit Floor detection by name -> ALWAYS null (no register upload for floors)
  if (
    /floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b|\bground(\s*floor)?\b|\bأرضي\b|\bbasement\b|\bبدروم\b|\bmezzanine\b|\bميزانين\b/i.test(
      folderName,
    ) ||
    /^(ground|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s*(floor)?$/i.test(folderName)
  ) {
    return null;
  }

  // 2. Exam Root / Drive Root / Governorate detection -> ALWAYS null
  if (
    /^(cairo|alexandria|giza|qalyubia|mansoura|tanta|ismailia|suez|port said|القاهرة|الإسكندرية|الجيزة|القليوبية|المنصورة|طنطا|الإسماعيلية|السويس|بورسعيد|root|drive|my drive|home|file manager app)$/i.test(
      folderName,
    ) ||
    /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s,._-]+))?$/i.test(folderName) ||
    /^(december|october|november|january|february|march|april|may|june|july|august|september|oct|nov|dec)\s*\d{4}/i.test(
      folderName,
    ) ||
    /^est\s*numbers/i.test(folderName)
  ) {
    return null;
  }

  // 3. Explicit Room detection by name (e.g. M102, 204, Room 1, قاعة 5, لجنة 1) -> ALWAYS student
  if (isRoomFolderName(folderName)) {
    return "student";
  }

  // 4. Center check helper
  const isCenterName = (n: string) =>
    /center|سنتر|مركز|campus|aast|academy|أكاديمية|جامعة|مجمع/i.test(n) &&
    !/building|مبنى|faculty|كلية|management|pharmacy|engineering|قسم/i.test(n);

  // 5. Official EST Schools or College / Building detection by name -> Building Excel!
  const isOfficialEstSchool = OFFICIAL_EST_SCHOOLS.some(
    (s) =>
      s.fullFolderName.toLowerCase() === folderName.toLowerCase() ||
      s.schoolName.toLowerCase() === folderName.toLowerCase() ||
      folderName.toLowerCase().includes(s.schoolName.toLowerCase()) ||
      folderName.toLowerCase().includes("integrated thebes"),
  );
  if (isOfficialEstSchool) {
    return "building_excel";
  }

  if (
    /building|مبنى|قسم|faculty|college|كلية|pharmacy|dentistry|engineering|management|technology|campus|architecture|business|صيدلة|هندسة|إدارة|طب|أسنان|علوم|تجارة|حقوق|ألسن|science|arts|commerce|law|languages|nursing|computer|it\b|ai\b|school|مدرسة|academy|أكاديمية|institute|معهد|hall|block|جناح|tower|برج|main|رئيسي|annex|ملحق|administration|admin\b|primary|secondary|prep|high\s*school|ابتدائي|إعدادي|ثانوي|بنين|بنات|girls|boys/i.test(
      folderName,
    )
  ) {
    return "building_excel";
  }

  // 6. Parent Folder Analysis:
  // If parent folder is "Schools" or a Center, then ANY subfolder inside it (that is not a floor or room) is a Building/School!
  const parentFolder = isCurrentFolder
    ? breadcrumbs && breadcrumbs.length >= 2
      ? breadcrumbs[breadcrumbs.length - 2]
      : null
    : breadcrumbs && breadcrumbs.length >= 1
    ? breadcrumbs[breadcrumbs.length - 1]
    : null;

  if (parentFolder) {
    const parentName = (parentFolder.name || "").trim().toLowerCase();
    if (
      parentName === "schools" ||
      parentName.includes("school") ||
      isCenterName(parentName) ||
      /center|سنتر|مركز|sheraton|abu\s*qir/i.test(parentName)
    ) {
      // Child of Schools or a Center is a School / Building!
      return "building_excel";
    }
  }

  // 7. Breadcrumbs check: if anywhere in path we are inside "Schools"
  if (breadcrumbs && breadcrumbs.some((b) => (b.name || "").trim().toLowerCase() === "schools")) {
    if (!isFloorFolderName(folderName) && !isRoomFolderName(folderName)) {
      return "building_excel";
    }
  }

  // 7. Full hierarchy analysis
  if (breadcrumbs && breadcrumbs.length > 0) {
    const chain = isCurrentFolder
      ? breadcrumbs.map((b) => b.name)
      : [...breadcrumbs.map((b) => b.name), folderName];

    const level = resolveFolderLevelFromChain(chain);
    if (level === "building") return "building_excel";
    if (level === "room") return "student";
    if (level === "floor" || level === "center" || level === "governorate" || level === "root") {
      return null;
    }

    // Relative depth from EST Root
    const isEst = (n?: string | null) =>
      /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s,._-]+))?$/i.test((n || "").trim());
    const estIdx = breadcrumbs.findIndex((b) => isEst(b.name));

    if (estIdx >= 0) {
      const currentFolderEstDepth = breadcrumbs.length - 1 - estIdx;
      if (isCurrentFolder) {
        if (currentFolderEstDepth === 3) return "building_excel";
        if (currentFolderEstDepth === 4) return null;
        if (currentFolderEstDepth >= 5) return "student";
      } else {
        if (currentFolderEstDepth === 2) return "building_excel";
        if (currentFolderEstDepth === 3) return null;
        if (currentFolderEstDepth === 4) return "student";
      }
    }
  }

  return null;
}

/**
 * Pure, client-safe resolution of folder hierarchy level without any server dependencies.
 */
function resolveFolderLevelFromChain(
  chain: string[],
): "root" | "governorate" | "center" | "building" | "floor" | "room" | "custom" {
  const clean = chain
    .map((s) => (s || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (clean.length === 0) return "custom";

  const GENERIC_ROOTS =
    /^(root|my drive|drive|demo drive|google drive|file manager app|december\s*2026|october\s*2026|november\s*2026|est\s*numbers.*|\b(oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s*\d{4}\b)$/i;

  const isEstRoot = (name: string) =>
    /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s,._-]+))?$/i.test(name.trim());

  const estIndex = clean.findIndex((name) => isEstRoot(name));
  const relevantChain =
    estIndex >= 0 ? clean.slice(estIndex) : clean.filter((c) => !GENERIC_ROOTS.test(c));
  if (relevantChain.length === 0) return "custom";

  if (isEstRoot(relevantChain[0]) && relevantChain.length === 1) {
    return "root";
  }

  const locationChain = isEstRoot(relevantChain[0]) ? relevantChain.slice(1) : relevantChain;

  if (locationChain.length === 1) return "governorate";
  if (locationChain.length === 2) return "center";
  if (locationChain.length === 3) return "building";
  if (locationChain.length === 4) return "floor";
  if (locationChain.length >= 5) return "room";
  return "custom";
}

