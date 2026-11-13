"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  FileQuestion,
  Pencil,
  Printer,
  Save,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { FileIcon } from "@/components/file-icon";
import { DocxViewer } from "./docx-viewer";
import { ExcelViewer } from "./excel-viewer";
import { ImageViewer } from "./image-viewer";
import { PdfViewer } from "./pdf-viewer";
import { useI18n } from "@/components/locale-provider";
import { formatBytes } from "@/lib/file-utils";
import { formatDateTime } from "@/lib/format";
import type { DriveItem } from "@/lib/types";

export type PreviewKind = "pdf" | "excel" | "word" | "image" | "unsupported";

export function PreviewShell({
  item,
  kind,
  initialFavorite,
  initialFrom,
  previewSettings,
}: {
  item: DriveItem;
  kind: PreviewKind;
  initialFavorite: boolean;
  initialFrom?: string | null;
  previewSettings: {
    pdfDefaultZoom: number;
    pdfFitMode: "width" | "page" | "auto";
    excelDisplayMode: "compact" | "normal" | "comfortable";
  };
}) {
  const { t, locale, dir } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams?.get("from");
  const fromParam = initialFrom || fromQuery;

  const returnTarget = useMemo(() => {
    if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")) {
      return fromParam;
    }
    if (item.parentId) {
      return `/files?folder=${encodeURIComponent(item.parentId)}`;
    }
    return "/files";
  }, [fromParam, item.parentId]);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")) {
      router.push(fromParam);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      router.back();
      return;
    }
    router.push(returnTarget);
  };

  const [favorite, setFavorite] = useState(initialFavorite);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveExcelRef = useRef<(() => Promise<void>) | null>(null);
  const back = dir === "rtl" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />;
  const printable = kind !== "unsupported" && item.extension !== "doc";

  const handleSaveExcel = async () => {
    if (saveExcelRef.current) {
      setIsSaving(true);
      try {
        await saveExcelRef.current();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleFavorite = async () => {
    setFavoriteBusy(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: item.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      setFavorite(Boolean(data.favorite));
      toast.success(data.favorite ? t("common.favoriteAdded") : t("common.favoriteRemoved"));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href={returnTarget}
            onClick={handleBack}
            className="icon-btn mt-0.5 cursor-pointer hover:bg-surface-soft hover:text-accent transition-colors"
            aria-label={t("common.back")}
            title={locale === "ar" ? "رجوع إلى المجلد / الصفحة السابقة" : "Back to previous folder / page"}
          >
            {back}
          </Link>
          <FileIcon category={item.category} extension={item.extension} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("preview.title")}</p>
            <h1 className="mt-0.5 truncate text-xl font-black tracking-tight sm:text-2xl">{item.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{(item.extension || t("common.unknown")).toUpperCase()}</span>
              <span>·</span>
              <span>{formatBytes(item.size, locale)}</span>
              <span>·</span>
              <span>{formatDateTime(item.modifiedTime, locale)}</span>
              {item.isDemo && <span className="chip">{t("common.demo")}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kind === "excel" && (
            <Button
              variant={isEditing ? "primary" : "secondary"}
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5 cursor-pointer font-bold"
              title={
                isEditing
                  ? (locale === "ar" ? "العودة لوضع المعاينة" : "Switch to View Mode")
                  : (locale === "ar" ? "تعديل بيانات الإكسيل" : "Edit Excel")
              }
            >
              <Pencil className="size-4" />
              {isEditing ? (locale === "ar" ? "معاينة" : "View") : (locale === "ar" ? "تعديل" : "Edit")}
            </Button>
          )}
          {kind === "excel" && isEditing && (
            <Button
              variant="primary"
              onClick={() => void handleSaveExcel()}
              loading={isSaving}
              className="gap-1.5 cursor-pointer font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              title={locale === "ar" ? "حفظ كافة التعديلات في ملف الإكسيل" : "Save all changes to Excel"}
            >
              <Save className="size-4" />
              {locale === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => void toggleFavorite()} loading={favoriteBusy}>
            <Star className={favorite ? "size-4 fill-current text-amber-500" : "size-4"} />
            {favorite ? t("common.unfavorite") : t("common.favorite")}
          </Button>
          <a href={`/api/drive/files/${item.id}/content?download=1`} className="btn-secondary">
            <Download className="size-4" />
            {t("common.download")}
          </a>
          {printable && (
            <Link href={`/print/${item.id}`} target="_blank" className="btn-primary">
              <Printer className="size-4" />
              {t("common.print")}
            </Link>
          )}
          {item.webViewLink && (
            <a href={item.webViewLink} target="_blank" rel="noopener noreferrer" className="icon-btn" title={t("common.openInDrive")}>
              <ExternalLink className="size-4" />
            </a>
          )}
        </div>
      </div>

      <div className="document-preview-stage w-full" dir="ltr" style={{ direction: "ltr" }}>
        {kind === "pdf" && (
          <PdfViewer fileId={item.id} initialZoom={previewSettings.pdfDefaultZoom} initialFit={previewSettings.pdfFitMode} />
        )}
        {kind === "excel" && (
          <ExcelViewer
            fileId={item.id}
            extension={item.extension}
            density={previewSettings.excelDisplayMode}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
            saveRef={saveExcelRef}
            fileName={item.name}
          />
        )}
        {kind === "word" && <DocxViewer fileId={item.id} extension={item.extension} />}
        {kind === "image" && <ImageViewer fileId={item.id} name={item.name} />}
        {kind === "unsupported" && (
          <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-strong text-muted">
              <FileQuestion className="size-7" />
            </div>
            <h2 className="text-base font-semibold">{t("preview.unsupported")}</h2>
            <p className="max-w-md text-sm text-muted">{t("preview.rawUnavailable")}</p>
            <a href={`/api/drive/files/${item.id}/content?download=1`} className="btn-primary">
              <Download className="size-4" />
              {t("common.download")}
            </a>
          </div>
        )}
      </div>

      <section className="no-print card grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Detail label={t("common.name")} value={item.name} />
        <Detail label={t("common.type")} value={item.mimeType} ltr />
        <Detail label={t("common.size")} value={item.isFolder ? "—" : formatBytes(item.size, locale)} />
        <Detail label={t("common.modified")} value={formatDateTime(item.modifiedTime, locale)} />
      </section>
    </div>
  );
}

function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate font-medium" dir={ltr ? "ltr" : undefined} title={value}>
        {value}
      </p>
    </div>
  );
}
