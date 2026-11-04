import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { PreviewShell, type PreviewKind } from "@/components/preview/preview-shell";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta, toDriveItem } from "@/lib/drive";
import { getDemoItem, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { previewKind } from "@/lib/file-utils";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { getFavoriteIds } from "@/lib/metadata";
import { getSettings } from "@/lib/settings";
import type { DriveItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ fileId: string }> };

async function loadItem(fileId: string): Promise<{ item: DriveItem | null; favorite: boolean; error: string | null }> {
  const connection = await getConnection();
  const connected = connection?.connectionStatus === "connected";
  const favoriteIds = await getFavoriteIds();
  if (isDemoEnabled() && !connected) {
    const item = getDemoItem(fileId);
    return { item, favorite: item ? favoriteIds.has(item.id) : false, error: item ? null : "fileNotFound" };
  }
  try {
    const { drive } = await getDriveContextWithRoot();
    const file = await getFileMeta(drive, fileId);
    const item = toDriveItem(file, favoriteIds);
    return { item: { ...item, isDemo: false }, favorite: Boolean(item.isFavorite), error: null };
  } catch (error) {
    return {
      item: null,
      favorite: false,
      error: error instanceof AppError ? error.code : "generic",
    };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fileId } = await params;
  const { item } = await loadItem(fileId);
  return { title: item?.name ?? "Preview" };
}

export default async function PreviewPage({ params }: Props) {
  const { fileId } = await params;
  const [settings, locale, { item, favorite, error }] = await Promise.all([
    getSettings(),
    getLocale(),
    loadItem(fileId),
  ]);

  if (!item) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <FileQuestion className="size-7" />
        </div>
        <h1 className="mt-4 text-lg font-bold">{translate(locale, "preview.notFound")}</h1>
        {error && <p className="mt-1 text-xs text-muted">{translate(locale, `error.${error}` as Parameters<typeof translate>[1])}</p>}
        <Link href="/files" className="btn-secondary mt-5">
          {translate(locale, "common.back")}
        </Link>
      </div>
    );
  }

  const kind = previewKind(item.mimeType, item.name) as PreviewKind;

  return (
    <PreviewShell
      item={item}
      kind={kind}
      initialFavorite={favorite}
      previewSettings={{
        pdfDefaultZoom: settings.preview.pdfDefaultZoom,
        pdfFitMode: settings.preview.pdfFitMode,
        excelDisplayMode: settings.preview.excelDisplayMode,
      }}
    />
  );
}
