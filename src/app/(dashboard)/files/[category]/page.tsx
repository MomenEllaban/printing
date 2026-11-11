import { notFound } from "next/navigation";
import { FileBrowser } from "@/components/file-browser";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import type { TranslationKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";
import { translate } from "@/lib/i18n";
import type { FileCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<string, { category: FileCategory; titleKey: TranslationKey }> = {
  pdf: { category: "pdf", titleKey: "files.pdfTitle" },
  excel: { category: "excel", titleKey: "files.excelTitle" },
  word: { category: "word", titleKey: "files.wordTitle" },
  images: { category: "image", titleKey: "files.imagesTitle" },
  videos: { category: "video", titleKey: "files.videosTitle" },
  other: { category: "other", titleKey: "files.otherTitle" },
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ search?: string; folder?: string }>;
}) {
  const { category: slug } = await params;
  const entry = CATEGORY_MAP[slug];
  if (!entry) notFound();
  const query = await searchParams;
  const [settings, locale, connection] = await Promise.all([getSettings(), getLocale(), getConnection()]);
  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;
  const search = query.search?.trim() || undefined;

  return (
    <FileBrowser
      mode="category"
      category={entry.category}
      title={translate(locale, search ? "files.searchTitle" : entry.titleKey)}
      initialFolderId={query.folder || null}
      initialSearch={search}
      initialSort={settings.general.defaultSort}
      initialView={settings.general.defaultView}
      itemsPerPage={settings.general.itemsPerPage}
      demo={demo}
      maxUploadSizeMb={settings.upload.maxUploadSizeMb}
      allowedExtensions={settings.upload.allowedExtensions}
      allowMultiple={settings.upload.allowMultiple}
    />
  );
}
