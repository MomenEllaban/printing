"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";

export function DocxViewer({ fileId, extension }: { fileId: string; extension: string | null }) {
  const { t } = useI18n();
  const [html, setHtml] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (extension === "doc") {
        setError(t("preview.unsupported"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/preview/docx/${fileId}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || t("preview.loadFailed"));
        if (!cancelled) {
          setHtml(typeof data.html === "string" ? data.html : "");
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t("preview.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [extension, fileId, t]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="size-6 text-accent" />
        {t("common.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="max-w-xl text-sm font-semibold text-danger">{error}</p>
        <a href={`/api/drive/files/${fileId}/content?download=1`} className="btn-secondary">
          <Download className="size-4" />
          {t("common.download")}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.length > 0 && (
        <div className="no-print rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {messages.slice(0, 3).join(" · ")}
        </div>
      )}
      <div
        className="docx-content border border-border shadow-card"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    </div>
  );
}
