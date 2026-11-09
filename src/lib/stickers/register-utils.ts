import type { DriveItem, Breadcrumb } from "@/lib/types";

export type RegisterCategory = "proctor" | "control" | "student" | null;

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

/**
 * Checks whether an item is a valid Student Register PDF.
 */
export function isStudentRegisterFile(item: { id?: string; name: string; isFolder?: boolean; mimeType?: string }): boolean {
  if (item.isFolder) return false;
  const isPdf = item.mimeType === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return false;
  return (
    /student\s*register|كشف\s*طلاب|كشف\s*الطلاب|كشف\s*لجان|لجنة/i.test(item.name) ||
    item.name.toLowerCase().includes("student")
  );
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
  return items.find(isStudentRegisterFile);
}

export function findRegisterFileInItems(category: RegisterCategory, items?: DriveItem[]): DriveItem | undefined {
  if (!category || !items || !items.length) return undefined;
  if (category === "proctor") return findProctorFileInItems(items);
  if (category === "control") return findControlFileInItems(items);
  if (category === "student") return findStudentFileInItems(items);
  return undefined;
}

/**
 * Determines whether a folder qualifies for a register:
 * - "proctor" (for Floors only)
 * - "control" (for Buildings only)
 * - "student" (for Rooms only)
 * - null (for City/Governorate, Test Centers, Roots)
 */
export function getFolderRegisterCategory(params: {
  folder: { id: string; name: string; isFolder?: boolean };
  breadcrumbs?: Breadcrumb[];
  depth?: number;
  isCurrentFolder?: boolean;
}): RegisterCategory {
  const { folder, breadcrumbs, depth, isCurrentFolder } = params;
  if (folder.isFolder === false) return null;

  const folderName = folder.name.trim();

  // Explicit Room detection by name (e.g. 204, 205, Room 1, قاعة 5, لجنة 1)
  if (/^(\d{3,4}[A-Za-z]?|room\s*\d+|قاعة\s*\d+|committee\s*\d+|لجنة\s*\d+)$/i.test(folderName)) {
    return "student";
  }
  if (/room|قاعة|لجنة/i.test(folderName) && !/control|proctor|floor|building/i.test(folderName)) {
    return "student";
  }

  // Explicit Floor detection by name
  if (/floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b/i.test(folderName)) {
    return "proctor";
  }

  // Explicit Building detection by name
  if (/building|مبنى|قسم/i.test(folderName)) {
    return "control";
  }

  // Analyze EST breadcrumb hierarchy if present
  if (breadcrumbs && breadcrumbs.length > 0) {
    const isEst = (n?: string | null) =>
      /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+|[A-Za-z0-9\s]+))?$/i.test((n || "").trim());
    const estIdx = breadcrumbs.findIndex((b) => isEst(b.name));

    if (estIdx >= 0) {
      // Relative depth of current folder inside EST
      const currentFolderEstDepth = breadcrumbs.length - 1 - estIdx;

      if (isCurrentFolder) {
        // We are inspecting currentFolder itself (for the top toolbar)
        // 0: EST (Root) -> null
        // 1: Governorate / City -> null
        // 2: Test Center -> null
        // 3: Building -> "control"
        // 4: Floor -> "proctor"
        // 5+: Room -> "student"
        if (currentFolderEstDepth === 3) return "control";
        if (currentFolderEstDepth === 4) return "proctor";
        if (currentFolderEstDepth >= 5) return "student";
        return null;
      } else {
        // We are inspecting an item INSIDE currentFolder (row in table or grid)
        // If currentFolder is depth 2 (Test Center, e.g. Abu Qir): child folders are Buildings!
        if (currentFolderEstDepth === 2) return "control";
        // If currentFolder is depth 3 (Building, e.g. Pharmacy): child folders are Floors!
        if (currentFolderEstDepth === 3) return "proctor";
        // If currentFolder is depth 4 (Floor, e.g. 2nd Floor): child folders are Rooms!
        if (currentFolderEstDepth === 4) return "student";
        // If currentFolder is depth 0 (EST) -> items are Governorates -> null
        // If currentFolder is depth 1 (Gov) -> items are Centers -> null
        return null;
      }
    }
  }

  // If depth is explicitly passed from a recursive tree view
  if (typeof depth === "number") {
    if (depth === 3) return "control";
    if (depth === 4) return "proctor";
    if (depth >= 5) return "student";
    return null;
  }

  return null;
}

