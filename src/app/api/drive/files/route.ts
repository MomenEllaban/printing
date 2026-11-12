import { NextResponse } from "next/server";
import { getConnection } from "@/lib/auth";
import { getDriveContextWithRoot } from "@/lib/auth";
import {
  buildBreadcrumbs,
  getFilesByIds,
  listFolder,
  listRecentFiles,
  searchFiles,
  toDriveItem,
} from "@/lib/drive";
import { demoList, getDemoBreadcrumbs, isDemoEnabled } from "@/lib/demo";
import { getFavoriteIds, syncDriveItems } from "@/lib/metadata";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { getSettings } from "@/lib/settings";
import type { Breadcrumb, DriveItem, DriveListResult, FileCategory } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { OWNER_ID } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CATEGORIES: FileCategory[] = ["pdf", "excel", "word", "image", "video", "other"];

function parseCategory(value: string | null): FileCategory | null {
  return value && CATEGORIES.includes(value as FileCategory) ? (value as FileCategory) : null;
}

function sortItems(
  items: DriveItem[],
  sort: string,
  favoriteOrder?: string[],
  pinnedIds?: string[],
  customOrder?: string[],
): DriveItem[] {
  const pinnedSet = new Set(pinnedIds || []);

  const mappedItems = items.map((item) => ({
    ...item,
    isPinned: Boolean(item.isPinned || pinnedSet.has(item.id)),
  }));

  const foldersFirst = [...mappedItems].sort((left, right) => {
    if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
    return 0;
  });

  if (favoriteOrder) {
    const order = new Map(favoriteOrder.map((id, index) => [id, index]));
    return foldersFirst.sort((left, right) => (order.get(left.id) ?? 9999) - (order.get(right.id) ?? 9999));
  }

  let sorted: DriveItem[];

  if (sort === "custom" && customOrder && customOrder.length > 0) {
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));
    sorted = foldersFirst.sort((left, right) => {
      const idxA = orderMap.has(left.id) ? orderMap.get(left.id)! : 999999;
      const idxB = orderMap.has(right.id) ? orderMap.get(right.id)! : 999999;
      if (idxA !== idxB) return idxA - idxB;
      if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
      return new Date(right.modifiedTime ?? 0).getTime() - new Date(left.modifiedTime ?? 0).getTime();
    });
  } else {
    switch (sort) {
      case "name_asc":
        sorted = foldersFirst.sort((left, right) => left.name.localeCompare(right.name, "ar"));
        break;
      case "name_desc":
        sorted = foldersFirst.sort((left, right) => right.name.localeCompare(left.name, "ar"));
        break;
      case "size_asc":
        sorted = foldersFirst.sort((left, right) => left.size - right.size);
        break;
      case "size_desc":
        sorted = foldersFirst.sort((left, right) => right.size - left.size);
        break;
      case "modified_asc":
        sorted = foldersFirst.sort(
          (left, right) => new Date(left.modifiedTime ?? 0).getTime() - new Date(right.modifiedTime ?? 0).getTime(),
        );
        break;
      default:
        sorted = foldersFirst.sort(
          (left, right) => new Date(right.modifiedTime ?? 0).getTime() - new Date(left.modifiedTime ?? 0).getTime(),
        );
        break;
    }
  }

  if (pinnedSet.size > 0) {
    const pinned: DriveItem[] = [];
    const unpinned: DriveItem[] = [];
    sorted.forEach((item) => {
      if (pinnedSet.has(item.id)) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    });
    return [...pinned, ...unpinned];
  }

  return sorted;
}

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:list", 240, 60_000);
    const params = new URL(request.url).searchParams;
    const settings = await getSettings();
    const folderParam = params.get("folder");
    const category = parseCategory(params.get("category"));
    const search = params.get("search")?.trim() || null;
    const sort = params.get("sort") || settings.general.defaultSort;
    const pageToken = params.get("pageToken");
    const requestedPageSize = Number(params.get("pageSize") || settings.general.itemsPerPage);
    const pageSize = Math.min(100, Math.max(6, Number.isFinite(requestedPageSize) ? requestedPageSize : 24));
    const recent = params.get("recent") === "1";
    const favorites = params.get("favorites") === "1";
    const foldersOnly = params.get("foldersOnly") === "1";

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    const demo = isDemoEnabled() && !connected;
    const favoriteIds = await getFavoriteIds();

    // Fetch custom order and pinned IDs for this folder
    const folderKey = `folder_order:${folderParam || "root"}`;
    const [orderSetting, globalPinnedSetting] = await Promise.all([
      prisma.applicationSetting.findUnique({ where: { key: folderKey } }).catch(() => null),
      prisma.applicationSetting.findUnique({ where: { key: "global_pinned_items" } }).catch(() => null),
    ]);

    let customOrder: string[] = [];
    let pinnedIds: string[] = [];

    if (orderSetting?.value && typeof orderSetting.value === "object") {
      const val = orderSetting.value as { customOrder?: string[]; pinnedIds?: string[] };
      if (Array.isArray(val.customOrder)) customOrder = val.customOrder;
      if (Array.isArray(val.pinnedIds)) pinnedIds = val.pinnedIds;
    }

    if (globalPinnedSetting?.value && typeof globalPinnedSetting.value === "object") {
      const val = globalPinnedSetting.value as { pinnedIds?: string[] };
      if (Array.isArray(val.pinnedIds)) {
        pinnedIds = Array.from(new Set([...pinnedIds, ...val.pinnedIds]));
      }
    }

    if (demo) {
      let items: DriveItem[];
      let nextPageToken: string | null = null;

      if (favorites) {
        const ordered = await prisma.favorite.findMany({
          where: { userId: OWNER_ID },
          orderBy: { createdAt: "desc" },
          select: { googleDriveFileId: true },
        });
        const ids = ordered.map((row) => row.googleDriveFileId);
        const result = demoList({ ids, category, search, sort, pageSize });
        items = result.items;
        nextPageToken = null;
      } else {
        const isGlobalCategory = Boolean(category && !folderParam);
        const result = demoList({
          folderId: isGlobalCategory ? undefined : folderParam || "demo-root",
          category,
          search,
          sort,
          pageToken,
          pageSize,
          foldersOnly,
          recent,
        });
        items = result.items;
        nextPageToken = result.nextPageToken;
      }

      items = items.map((item) => ({ ...item, isFavorite: favoriteIds.has(item.id) }));
      const isGlobalCategory = Boolean(category && !folderParam);
      const breadcrumbData = search || recent || favorites || isGlobalCategory ? { currentFolder: null, breadcrumbs: [] } : getDemoBreadcrumbs(folderParam || "demo-root");

      const result: DriveListResult = {
        items: sortItems(items, sort, undefined, pinnedIds, customOrder),
        nextPageToken,
        currentFolder: breadcrumbData.currentFolder,
        breadcrumbs: breadcrumbData.breadcrumbs,
        demo: true,
        notice: "demo",
        customOrder,
        pinnedIds,
      };
      return NextResponse.json(result);
    }

    const { drive, rootFolderId } = await getDriveContextWithRoot();

    if (favorites) {
      const ordered = await prisma.favorite.findMany({
        where: { userId: OWNER_ID },
        orderBy: { createdAt: "desc" },
        select: { googleDriveFileId: true },
        take: 100,
      });
      const ids = ordered.map((row) => row.googleDriveFileId);
      const files = await getFilesByIds(drive, ids);
      let items = files.map((file) => toDriveItem(file, favoriteIds));
      if (category) items = items.filter((item) => item.category === category);
      if (search) {
        const term = search.toLowerCase();
        items = items.filter((item) => item.name.toLowerCase().includes(term));
      }
      return NextResponse.json({
        items: sortItems(items, sort, ids, pinnedIds, customOrder),
        nextPageToken: null,
        currentFolder: null,
        breadcrumbs: [],
        customOrder,
        pinnedIds,
      } satisfies DriveListResult);
    }

    if (recent) {
      const result = await listRecentFiles(drive, 30, { pageSize, pageToken, category, search });
      const items = result.files.map((file) => toDriveItem(file, favoriteIds));
      await syncDriveItems(items);
      return NextResponse.json({
        items: sortItems(items, sort, undefined, pinnedIds, customOrder),
        nextPageToken: result.nextPageToken,
        currentFolder: null,
        breadcrumbs: [],
        customOrder,
        pinnedIds,
      } satisfies DriveListResult);
    }

    if (search) {
      const result = await searchFiles(drive, { search, category, pageSize, pageToken, sort, foldersOnly });
      let items = result.files.map((file) => toDriveItem(file, favoriteIds));
      if (category) {
        items = items.filter((item) => (foldersOnly ? item.isFolder : !item.isFolder && item.category === category));
      }
      await syncDriveItems(items);
      return NextResponse.json({
        items: sortItems(items, sort, undefined, pinnedIds, customOrder),
        nextPageToken: result.nextPageToken,
        currentFolder: null,
        breadcrumbs: [],
        customOrder,
        pinnedIds,
      } satisfies DriveListResult);
    }

    // Global category view across all subfolders
    if (category && !folderParam) {
      const result = await searchFiles(drive, {
        category,
        pageSize,
        pageToken,
        sort,
        foldersOnly: false,
        includeFolders: false,
      });
      let items = result.files.map((file) => toDriveItem(file, favoriteIds));
      items = items.filter((item) => !item.isFolder && item.category === category);
      await syncDriveItems(items);
      return NextResponse.json({
        items: sortItems(items, sort, undefined, pinnedIds, customOrder),
        nextPageToken: result.nextPageToken,
        currentFolder: null,
        breadcrumbs: [],
        customOrder,
        pinnedIds,
      } satisfies DriveListResult);
    }

    const currentFolderId = folderParam || rootFolderId;
    const result = await listFolder(drive, currentFolderId, {
      category,
      pageSize,
      pageToken,
      sort,
      foldersOnly,
    });
    const rawItems = result.files.map((file) => toDriveItem(file, favoriteIds));
    await syncDriveItems(rawItems);
    const sortedItems = sortItems(rawItems, sort, undefined, pinnedIds, customOrder);
    const breadcrumbs: { currentFolder: Breadcrumb | null; breadcrumbs: Breadcrumb[] } = await buildBreadcrumbs(
      drive,
      rootFolderId,
      currentFolderId,
    ).catch(() => ({ currentFolder: null, breadcrumbs: [] }));

    return NextResponse.json({
      items: sortedItems,
      nextPageToken: result.nextPageToken,
      currentFolder: breadcrumbs.currentFolder,
      breadcrumbs: breadcrumbs.breadcrumbs,
      customOrder,
      pinnedIds,
    } satisfies DriveListResult);
  } catch (error) {
    return jsonError(error);
  }
}
