import type { Breadcrumb, DriveItem } from "./types";
import { EST_REFERENCE_DATA } from "./stickers/est-reference-data";

export type HierarchyLevel = "root" | "governorate" | "center" | "building" | "floor" | "room" | "folder";

export interface PendingFileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  extension: string | null;
  modifiedTime: string | null;
  parentId: string | null;
  parentName?: string | null;
  path: string;
  breadcrumbs: Breadcrumb[];
  governorate?: string;
  center?: string;
  building?: string;
  floor?: string;
  room?: string;
  isPrinted: boolean;
}

export interface PendingFolderNode {
  id: string;
  name: string;
  isFolder: true;
  level: HierarchyLevel;
  path: string;
  breadcrumbs: Breadcrumb[];
  unprintedFilesCount: number;
  subfolders: PendingFolderNode[];
  files: PendingFileItem[];
}

export interface PendingPrintResult {
  unprintedCount: number;
  printedCount: number;
  totalFiles: number;
  tree: PendingFolderNode[];
  flatFiles: PendingFileItem[];
}

const KNOWN_GOVS = new Set(
  EST_REFERENCE_DATA.map((r) => r.governorate.trim().toLowerCase())
);
const KNOWN_CENTERS = new Set(
  EST_REFERENCE_DATA.map((r) => r.testCenter.trim().toLowerCase())
);
const KNOWN_BUILDINGS = new Set(
  EST_REFERENCE_DATA.map((r) => r.building.trim().toLowerCase())
);

/**
 * Classifies a folder's level in the EST hierarchy:
 * - root: Exam root (EST 1, EST 2, December 2026, Demo Drive, My Drive)
 * - governorate: City/Governorate (Alexandria, Cairo, Giza, etc.)
 * - center: Test Center (Abu Qir, etc.)
 * - building: Building / School branch (Pharmacy, Main Building, etc.)
 * - floor: Floor (2nd Floor, etc.)
 * - room: Room / Committee (Room 204, 205, etc.)
 * - folder: Generic folder
 */
export function classifyFolderLevel(folderName: string, depthFromEst: number = -1): HierarchyLevel {
  const norm = folderName.trim().toLowerCase();

  // Explicit check for Root / Exam level
  if (/^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(norm) || /december\s*2026|demo\s*drive|my\s*drive/i.test(norm)) {
    return "root";
  }

  // Explicit check based on depth relative to EST Root
  if (depthFromEst === 0) return "root";
  if (depthFromEst === 1) return "governorate";
  if (depthFromEst === 2) return "center";
  if (depthFromEst === 3) return "building";
  if (depthFromEst === 4) return "floor";
  if (depthFromEst >= 5) return "room";

  // Name-based detection
  if (/^(\d{3,4}[A-Za-z]?|room\s*\d+|قاعة\s*\d+|committee\s*\d+|لجنة\s*\d+)$/i.test(norm)) {
    return "room";
  }
  if (/room|قاعة|لجنة/i.test(norm) && !/control|proctor|floor|building/i.test(norm)) {
    return "room";
  }
  if (/floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b/i.test(norm)) {
    return "floor";
  }
  if (
    KNOWN_BUILDINGS.has(norm) ||
    /building|مبنى|قسم|faculty|كلية|pharmacy|dentistry|engineering/i.test(norm)
  ) {
    return "building";
  }
  if (KNOWN_CENTERS.has(norm) || /center|سنتر|school|مدرسة/i.test(norm)) {
    return "center";
  }
  if (KNOWN_GOVS.has(norm) || /^(alexandria|cairo|giza|mansoura|ismailia|tanta|portsaid|suez|assiut)$/i.test(norm)) {
    return "governorate";
  }

  return "folder";
}

/**
 * Builds a pruned hierarchical tree containing only folders and files that are NOT printed yet,
 * along with full path breadcrumbs (from Governorate/City down to Room).
 */
export function buildPendingPrintHierarchy(params: {
  allFolders: DriveItem[];
  allFiles: DriveItem[];
  printedIds: Set<string>;
  rootFolderId?: string | null;
}): PendingPrintResult {
  const { allFolders, allFiles, printedIds, rootFolderId } = params;

  const folderMap = new Map<string, DriveItem>();
  for (const f of allFolders) {
    folderMap.set(f.id, f);
  }

  // Pre-calculate full ancestor breadcrumbs for every folder
  const folderBreadcrumbsMap = new Map<string, Breadcrumb[]>();
  const getFolderBreadcrumbs = (folderId: string): Breadcrumb[] => {
    if (folderBreadcrumbsMap.has(folderId)) {
      return folderBreadcrumbsMap.get(folderId)!;
    }
    const chain: Breadcrumb[] = [];
    let curr: DriveItem | undefined = folderMap.get(folderId);
    const seen = new Set<string>();

    while (curr && !seen.has(curr.id)) {
      seen.add(curr.id);
      chain.unshift({ id: curr.id, name: curr.name });
      if (curr.parentId && folderMap.has(curr.parentId)) {
        curr = folderMap.get(curr.parentId);
      } else {
        break;
      }
    }

    folderBreadcrumbsMap.set(folderId, chain);
    return chain;
  };

  for (const f of allFolders) {
    getFolderBreadcrumbs(f.id);
  }

  // Filter unprinted files
  const flatFiles: PendingFileItem[] = [];
  const unprintedFilesByFolder = new Map<string, PendingFileItem[]>();

  for (const file of allFiles) {
    if (file.isFolder) continue;
    const isPrinted = printedIds.has(file.id);
    if (isPrinted) continue;

    const parentId = file.parentId || "";
    const crumbs = parentId ? getFolderBreadcrumbs(parentId) : [];
    const parentFolder = parentId ? folderMap.get(parentId) : undefined;

    // Filter out root artifacts or EST folder name from path prefix for cleaner city-focused display
    const pathParts = crumbs
      .filter((c) => !/december\s*2026|demo\s*drive|my\s*drive/i.test(c.name))
      .map((c) => c.name);

    const path = pathParts.join(" > ");

    // Extract designated levels from breadcrumbs if possible
    let gov: string | undefined;
    let center: string | undefined;
    let bld: string | undefined;
    let flr: string | undefined;
    let rm: string | undefined;

    const estIdx = crumbs.findIndex((c) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(c.name.trim()));
    if (estIdx >= 0) {
      gov = crumbs[estIdx + 1]?.name;
      center = crumbs[estIdx + 2]?.name;
      bld = crumbs[estIdx + 3]?.name;
      flr = crumbs[estIdx + 4]?.name;
      rm = crumbs[estIdx + 5]?.name;
    } else {
      // Fallback
      gov = pathParts[0];
      center = pathParts[1];
      bld = pathParts[2];
      flr = pathParts[3];
      rm = pathParts[4];
    }

    const pendingItem: PendingFileItem = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      extension: file.extension,
      modifiedTime: file.modifiedTime,
      parentId: file.parentId || null,
      parentName: parentFolder?.name || file.parentName || null,
      path: path || "(Root)",
      breadcrumbs: crumbs,
      governorate: gov,
      center,
      building: bld,
      floor: flr,
      room: rm,
      isPrinted: false,
    };

    flatFiles.push(pendingItem);

    if (!unprintedFilesByFolder.has(parentId)) {
      unprintedFilesByFolder.set(parentId, []);
    }
    unprintedFilesByFolder.get(parentId)!.push(pendingItem);
  }

  // Build folder hierarchy: child folders per parent
  const subfolderMap = new Map<string, DriveItem[]>();
  for (const f of allFolders) {
    const p = f.parentId || "";
    if (!subfolderMap.has(p)) {
      subfolderMap.set(p, []);
    }
    subfolderMap.get(p)!.push(f);
  }

  // Recursive tree building with pruning (only include branches with unprinted files)
  const buildSubtree = (folder: DriveItem): PendingFolderNode | null => {
    const crumbs = getFolderBreadcrumbs(folder.id);
    const estIdx = crumbs.findIndex((c) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(c.name.trim()));
    const depthFromEst = estIdx >= 0 ? crumbs.length - 1 - estIdx : -1;
    const level = classifyFolderLevel(folder.name, depthFromEst);

    const directFiles = unprintedFilesByFolder.get(folder.id) || [];
    const childFolders = subfolderMap.get(folder.id) || [];

    const subnodes: PendingFolderNode[] = [];
    let childUnprintedCount = 0;

    for (const child of childFolders) {
      const sub = buildSubtree(child);
      if (sub && sub.unprintedFilesCount > 0) {
        subnodes.push(sub);
        childUnprintedCount += sub.unprintedFilesCount;
      }
    }

    const totalUnprinted = directFiles.length + childUnprintedCount;
    if (totalUnprinted === 0) {
      return null;
    }

    const pathParts = crumbs
      .filter((c) => !/december\s*2026|demo\s*drive|my\s*drive/i.test(c.name))
      .map((c) => c.name);

    return {
      id: folder.id,
      name: folder.name,
      isFolder: true,
      level,
      path: pathParts.join(" > ") || folder.name,
      breadcrumbs: crumbs,
      unprintedFilesCount: totalUnprinted,
      subfolders: subnodes,
      files: directFiles,
    };
  };

  // Find root folders to start traversal
  // If rootFolderId provided, start there; otherwise start from top-level folders
  const rootsToExplore: DriveItem[] = [];
  if (rootFolderId && folderMap.has(rootFolderId)) {
    rootsToExplore.push(folderMap.get(rootFolderId)!);
  } else {
    // Top-level folders: folders whose parentId is not in folderMap or is "" or "demo-root"
    for (const f of allFolders) {
      if (!f.parentId || !folderMap.has(f.parentId) || f.parentId === "demo-root") {
        rootsToExplore.push(f);
      }
    }
  }

  const tree: PendingFolderNode[] = [];
  for (const root of rootsToExplore) {
    const node = buildSubtree(root);
    if (node && node.unprintedFilesCount > 0) {
      tree.push(node);
    }
  }

  // If tree has single top-level exam root or date container with subfolders (e.g. December 2026 -> EST 1 -> Governorates),
  // we can unwrap or keep for clarity. Let's keep the full clean tree.
  const totalFiles = allFiles.filter((f) => !f.isFolder).length;
  const printedCount = allFiles.filter((f) => !f.isFolder && printedIds.has(f.id)).length;

  return {
    unprintedCount: flatFiles.length,
    printedCount,
    totalFiles,
    tree,
    flatFiles,
  };
}
