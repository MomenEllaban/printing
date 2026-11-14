import type { Metadata } from "next";
import Link from "next/link";
import { PrintDocument } from "@/components/print-document";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta, toDriveItem } from "@/lib/drive";
import { getDemoItem, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { previewKind } from "@/lib/file-utils";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";
import type { DriveItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ fileId: string }>;
  searchParams?: Promise<{ orientation?: "portrait" | "landscape" }>;
};

async function loadItem(fileId: string): Promise<DriveItem | null> {
  const connection = await getConnection();
  const connected = connection?.connectionStatus === "connected";
  if (isDemoEnabled() && !connected) return getDemoItem(fileId);
  try {
    const { drive } = await getDriveContextWithRoot();
    return toDriveItem(await getFileMeta(drive, fileId));
  } catch (error) {
    if (error instanceof AppError) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fileId } = await params;
  const item = await loadItem(fileId);
  return { title: item ? `${item.name} — Print` : "Print" };
}

export default async function PrintPage({ params, searchParams }: Props) {
  const { fileId } = await params;
  const search = searchParams ? await searchParams : undefined;
  const [item, settings, locale] = await Promise.all([loadItem(fileId), getSettings(), getLocale()]);

  if (!item || item.isFolder) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-bold">{translate(locale, "preview.notFound")}</h1>
        <Link href="/files" className="btn-secondary">
          {translate(locale, "common.back")}
        </Link>
      </div>
    );
  }

  const requestedOrientation =
    search?.orientation === "portrait" || search?.orientation === "landscape"
      ? search.orientation
      : undefined;

  return (
    <PrintDocument
      item={item}
      kind={previewKind(item.mimeType, item.name)}
      settings={{
        paperSize: settings.printing.paperSize,
        orientation: requestedOrientation || settings.printing.orientation,
        scale: settings.printing.scale,
        margins: settings.printing.margins,
      }}
    />
  );
}
