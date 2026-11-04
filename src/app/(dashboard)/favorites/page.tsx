import { FileBrowser } from "@/components/file-browser";
import { getConnection } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/settings";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const [settings, locale, connection] = await Promise.all([getSettings(), getLocale(), getConnection()]);
  const connected = connection?.connectionStatus === "connected";
  const demo = isDemoEnabled() && !connected;
  const search = params.search?.trim() || undefined;

  return (
    <FileBrowser
      mode="favorites"
      title={translate(locale, search ? "files.searchTitle" : "nav.favorites")}
      initialSearch={search}
      initialSort="modified_desc"
      initialView={settings.general.defaultView}
      itemsPerPage={settings.general.itemsPerPage}
      demo={demo}
      maxUploadSizeMb={settings.upload.maxUploadSizeMb}
      allowedExtensions={settings.upload.allowedExtensions}
      allowMultiple={settings.upload.allowMultiple}
    />
  );
}
