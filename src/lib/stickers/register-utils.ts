import type { DriveItem, Breadcrumb } from "@/lib/types";

export type RegisterCategory = "proctor" | "control" | null;

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

export function findProctorFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;
  return items.find(isProctorRegisterFile);
}

export function findControlFileInItems(items?: DriveItem[]): DriveItem | undefined {
  if (!items || !items.length) return undefined;
  return items.find(isControlRegisterFile);
}

export function findRegisterFileInItems(category: RegisterCategory, items?: DriveItem[]): DriveItem | undefined {
  if (!category || !items || !items.length) return undefined;
  if (category === "proctor") return findProctorFileInItems(items);
  if (category === "control") return findControlFileInItems(items);
  return undefined;
}

/**
 * Determines whether a folder qualifies for a register:
 * - "proctor" (for Floors only)
 * - "control" (for Buildings only)
 * - null (for Rooms, City/Governorate, Test Centers, Roots)
 *
 * Requirements:
 * "زرار البروكتور ريجستر اللى جمب الملفات بيكون للادوار
 *  وللمبنانى بيكون اضافه ملف كنترو ريجستر 
 *  لكن الغرف والمدينه والسنتر ملهومش ملفات"
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

  // Explicit Room rejection (numbers only or containing room / قاعة)
  if (/^(\d{3,4}[A-Za-z]?|room\s*\d+|قاعة\s*\d+|committee\s*\d+|لجنة\s*\d+)$/i.test(folderName)) {
    return null;
  }
  if (/room|قاعة|لجنة/i.test(folderName) && !/control|proctor|floor|building/i.test(folderName)) {
    return null;
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
        // 5+: Room -> null
        if (currentFolderEstDepth === 3) return "control";
        if (currentFolderEstDepth === 4) return "proctor";
        return null;
      } else {
        // We are inspecting an item INSIDE currentFolder (row in table or grid)
        // If currentFolder is depth 2 (Test Center, e.g. Abu Qir): its child folders are Buildings!
        if (currentFolderEstDepth === 2) return "control";
        // If currentFolder is depth 3 (Building, e.g. Pharmacy): its child folders are Floors!
        if (currentFolderEstDepth === 3) return "proctor";
        // If currentFolder is depth 0 (EST) -> items are Governorates -> null
        // If currentFolder is depth 1 (Gov) -> items are Centers -> null
        // If currentFolder is depth 4 (Floor) -> items are Rooms -> null
        return null;
      }
    }
  }

  // If depth is explicitly passed from a recursive tree view
  if (typeof depth === "number") {
    if (depth === 3) return "control";
    if (depth === 4) return "proctor";
    return null;
  }

  return null;
}

