"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";

export function PdfViewer({
  fileId,
  initialZoom,
  initialFit,
}: {
  fileId: string;
  initialZoom: number;
  initialFit: "width" | "page" | "auto";
}) {
  const { t } = useI18n();
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(initialZoom);
  const [fit, setFit] = useState<"width" | "page">(initialFit === "page" ? "page" : "width");
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const renderToken = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url: `/api/drive/files/${fileId}/content?format=pdf` });
        loadingTask = task;
        const doc = await task.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
      } catch (cause) {
        if (cancelled) return;
        console.error("[pdf] load failed", cause);
        setError(t("preview.passwordProtected"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
      const current = docRef.current;
      docRef.current = null;
      if (current) void current.destroy();
    };
  }, [fileId, t]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(async () => {
    const doc = docRef.current;
    if (!doc || numPages === 0) return;
    const token = ++renderToken.current;
    setRendering(true);
    try {
      const width = Math.max(320, containerWidth);
      const height = Math.max(420, window.innerHeight - 300);
      for (let index = 1; index <= numPages; index += 1) {
        if (token !== renderToken.current) return;
        const pdfPage = await doc.getPage(index);
        const base = pdfPage.getViewport({ scale: 1 });
        let scale = (width - 40) / base.width;
        if (fit === "page") scale = Math.min(scale, (height - 32) / base.height);
        scale *= zoom;
        const viewport = pdfPage.getViewport({ scale });
        const canvas = document.getElementById(`pdf-page-${index}`) as HTMLCanvasElement | null;
        if (!canvas) continue;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const context = canvas.getContext("2d");
        if (!context) continue;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        if (token !== renderToken.current) return;
      }
    } catch (cause) {
      if (token === renderToken.current) {
        console.error("[pdf] render failed", cause);
      }
    } finally {
      if (token === renderToken.current) setRendering(false);
    }
  }, [containerWidth, fit, numPages, zoom]);

  useEffect(() => {
    void render();
  }, [render]);

  const goToPage = (target: number) => {
    const next = Math.min(numPages, Math.max(1, target));
    setPage(next);
    document.getElementById(`pdf-page-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="size-6 text-accent" />
        {t("common.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <a
          href={`/api/drive/files/${fileId}/content?download=1`}
          className="btn-secondary"
        >
          {t("common.download")}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="no-print sticky top-16 z-20 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface/95 px-2.5 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-0.5">
          <button type="button" className="icon-btn size-9" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label={t("common.previous")}>
            <ChevronRight className="size-4 rtl:hidden" />
            <ChevronLeft className="hidden size-4 rtl:block" />
          </button>
          <div className="flex items-center gap-1 px-1 text-xs text-muted">
            <input
              type="number"
              min={1}
              max={numPages}
              value={page}
              onChange={(event) => goToPage(Number(event.target.value))}
              className="input h-8 w-14 px-1 text-center"
              aria-label={t("preview.page")}
            />
            <span>{t("preview.of")} {numPages}</span>
          </div>
          <button type="button" className="icon-btn size-9" onClick={() => goToPage(page + 1)} disabled={page >= numPages} aria-label={t("common.next")}>
            <ChevronLeft className="size-4 rtl:hidden" />
            <ChevronRight className="hidden size-4 rtl:block" />
          </button>
        </div>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button type="button" className="icon-btn size-9" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))} aria-label={t("preview.zoomOut")}>
          <Minus className="size-4" />
        </button>
        <span className="min-w-12 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
        <button type="button" className="icon-btn size-9" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))} aria-label={t("preview.zoomIn")}>
          <Plus className="size-4" />
        </button>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button
          type="button"
          className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", fit === "width" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
          onClick={() => setFit("width")}
        >
          {t("preview.fitWidth")}
        </button>
        <button
          type="button"
          className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", fit === "page" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft")}
          onClick={() => setFit("page")}
        >
          {t("preview.fitPage")}
        </button>

        <div className="ms-auto flex items-center gap-1">
          {rendering && <Spinner className="size-4 text-accent" />}
          <button
            type="button"
            className="icon-btn size-9"
            onClick={() => {
              const element = wrapRef.current;
              if (!element) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void element.requestFullscreen?.();
            }}
            aria-label={t("preview.fullscreen")}
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="rounded-2xl bg-surface-strong/60 p-2 sm:p-4">
        <div ref={pagesRef} className="mx-auto flex w-fit max-w-full flex-col items-center gap-4">
          {Array.from({ length: numPages }).map((_, index) => (
            <div key={index} id={`pdf-page-wrap-${index + 1}`} className="max-w-full">
              <canvas id={`pdf-page-${index + 1}`} className="pdf-canvas-shadow mx-auto block max-w-full rounded-sm bg-white" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
