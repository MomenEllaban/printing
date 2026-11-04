import { FileBrowser } from "@/components/file-browser";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; search?: string; upload?: string; newFolder?: string }>;
}) {
  const params = await searchParams;
  const [settings, locale, connection] = await Promise.all([getSettings(), getLocale(), getConnection()]);
  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;
  const search = params.search?.trim() || undefined;

  return (
    <FileBrowser
      mode="all"
      title={translate(locale, search ? "files.searchTitle" : "files.allTitle")}
      initialFolderId={params.folder || null}
      initialSearch={search}
      initialSort={settings.general.defaultSort}
      initialView={settings.general.defaultView}
      itemsPerPage={settings.general.itemsPerPage}
      demo={demo}
      maxUploadSizeMb={settings.upload.maxUploadSizeMb}
      allowedExtensions={settings.upload.allowedExtensions}
      allowMultiple={settings.upload.allowMultiple}
      autoOpenUpload={params.upload === "1"}
    />
  );
}
