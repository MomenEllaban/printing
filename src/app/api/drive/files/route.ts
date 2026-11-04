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

const CATEGORIES: FileCategory[] = ["pdf", "excel", "word", "image", "other"];

function parseCategory(value: string | null): FileCategory | null {
  return value && CATEGORIES.includes(value as FileCategory) ? (value as FileCategory) : null;
}

function sortItems(items: DriveItem[], sort: string, favoriteOrder?: string[]): DriveItem[] {
  const foldersFirst = [...items].sort((left, right) => {
    if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
    return 0;
  });
  if (favoriteOrder) {
    const order = new Map(favoriteOrder.map((id, index) => [id, index]));
    return foldersFirst.sort((left, right) => (order.get(left.id) ?? 9999) - (order.get(right.id) ?? 9999));
  }
  switch (sort) {
    case "name_asc":
      return foldersFirst.sort((left, right) => left.name.localeCompare(right.name, "ar"));
    case "name_desc":
      return foldersFirst.sort((left, right) => right.name.localeCompare(left.name, "ar"));
    case "size_asc":
      return foldersFirst.sort((left, right) => left.size - right.size);
    case "size_desc":
      return foldersFirst.sort((left, right) => right.size - left.size);
    case "modified_asc":
      return foldersFirst.sort(
        (left, right) => new Date(left.modifiedTime ?? 0).getTime() - new Date(right.modifiedTime ?? 0).getTime(),
      );
    default:
      return foldersFirst.sort(
        (left, right) => new Date(right.modifiedTime ?? 0).getTime() - new Date(left.modifiedTime ?? 0).getTime(),
      );
  }
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
        const result = demoList({
          folderId: folderParam || "demo-root",
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
      const breadcrumbData = search || recent || favorites ? { currentFolder: null, breadcrumbs: [] } : getDemoBreadcrumbs(folderParam || "demo-root");

      const result: DriveListResult = {
        items: sortItems(items, sort),
        nextPageToken,
        currentFolder: breadcrumbData.currentFolder,
        breadcrumbs: breadcrumbData.breadcrumbs,
        demo: true,
        notice: "demo",
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
        items: sortItems(items, sort, ids),
        nextPageToken: null,
        currentFolder: null,
        breadcrumbs: [],
      } satisfies DriveListResult);
    }

    if (recent) {
      const result = await listRecentFiles(drive, 30, { pageSize, pageToken, category, search });
      const items = result.files.map((file) => toDriveItem(file, favoriteIds));
      await syncDriveItems(items);
      return NextResponse.json({
        items,
        nextPageToken: result.nextPageToken,
        currentFolder: null,
        breadcrumbs: [],
      } satisfies DriveListResult);
    }

    if (search) {
      const result = await searchFiles(drive, { search, category, pageSize, pageToken, sort, foldersOnly });
      const items = result.files.map((file) => toDriveItem(file, favoriteIds));
      await syncDriveItems(items);
      return NextResponse.json({
        items,
        nextPageToken: result.nextPageToken,
        currentFolder: null,
        breadcrumbs: [],
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
    const items = result.files.map((file) => toDriveItem(file, favoriteIds));
    await syncDriveItems(items);
    const breadcrumbs: { currentFolder: Breadcrumb | null; breadcrumbs: Breadcrumb[] } = await buildBreadcrumbs(
      drive,
      rootFolderId,
      currentFolderId,
    ).catch(() => ({ currentFolder: null, breadcrumbs: [] }));

    return NextResponse.json({
      items,
      nextPageToken: result.nextPageToken,
      currentFolder: breadcrumbs.currentFolder,
      breadcrumbs: breadcrumbs.breadcrumbs,
    } satisfies DriveListResult);
  } catch (error) {
    return jsonError(error);
  }
}
