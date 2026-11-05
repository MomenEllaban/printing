import type { Metadata } from "next";
import Link from "next/link";
import { BatchPrintDocument } from "@/components/batch-print-document";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta, getFolderDescendants, toDriveItem } from "@/lib/drive";
import { getDemoDescendants, getDemoItem, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";
import type { DriveItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ files?: string }> };

async function loadItems(rawIds: string[]): Promise<DriveItem[]> {
  const connection = await getConnection();
  const connected = connection?.connectionStatus === "connected";

  if (isDemoEnabled() && !connected) {
    const directItems = rawIds.map((id) => getDemoItem(id)).filter((item): item is DriveItem => !!item);
    const directFiles = directItems.filter((item) => !item.isFolder);
    const folderIds = directItems.filter((item) => item.isFolder).map((item) => item.id);

    let descendantFiles: DriveItem[] = [];
    if (folderIds.length > 0) {
      const descendants = getDemoDescendants(folderIds);
      descendantFiles = descendants.files;
    }

    const map = new Map<string, DriveItem>();
    [...directFiles, ...descendantFiles].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }

  try {
    const { drive } = await getDriveContextWithRoot();
    const results = await Promise.allSettled(
      rawIds.map(async (id) => {
        const meta = await getFileMeta(drive, id);
        return toDriveItem(meta);
      }),
    );
    const directItems = results
      .filter((r): r is PromiseFulfilledResult<DriveItem> => r.status === "fulfilled")
      .map((r) => r.value);

    const directFiles = directItems.filter((item) => !item.isFolder);
    const folderIds = directItems.filter((item) => item.isFolder).map((item) => item.id);

    let descendantFiles: DriveItem[] = [];
    if (folderIds.length > 0) {
      const descendants = await getFolderDescendants(drive, folderIds);
      descendantFiles = descendants.files;
    }

    const map = new Map<string, DriveItem>();
    [...directFiles, ...descendantFiles].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  } catch (error) {
    console.error("[batch-print] failed to load items", error);
    return [];
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const count = (params.files || "").split(",").filter(Boolean).length;
  return { title: `Batch Print (${count} files)` };
}

export default async function BatchPrintPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawIds = (params.files || "").split(",").map((s) => s.trim()).filter(Boolean);
  const [items, settings, locale] = await Promise.all([loadItems(rawIds), getSettings(), getLocale()]);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-bold">{translate(locale, "preview.notFound")}</h1>
        <p className="text-sm text-muted">{translate(locale, "upload.noFiles")}</p>
        <Link href="/files" className="btn-secondary mt-2">
          {translate(locale, "common.back")}
        </Link>
      </div>
    );
  }

  return (
    <BatchPrintDocument
      items={items}
      settings={{
        paperSize: settings.printing.paperSize,
        orientation: settings.printing.orientation,
        scale: settings.printing.scale,
        margins: settings.printing.margins,
      }}
    />
  );
}

