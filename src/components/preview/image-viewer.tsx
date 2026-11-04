"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/components/locale-provider";

export function ImageViewer({ fileId, name }: { fileId: string; name: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-border bg-surface-strong/60 p-4">
      {failed ? (
        <div className="flex flex-col items-center gap-2 text-sm text-muted">
          <ImageOff className="size-8" />
          {t("preview.loadFailed")}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/drive/files/${fileId}/content`}
          alt={name}
          onError={() => setFailed(true)}
          className="max-h-[78vh] max-w-full rounded-lg bg-white object-contain shadow-lg"
        />
      )}
    </div>
  );
}
