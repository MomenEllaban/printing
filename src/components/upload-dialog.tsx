"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, RotateCcw, Trash2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Modal, Button, ProgressBar, Spinner } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/file-utils";
import type { Locale } from "@/lib/types";

type UploadStatus = "queued" | "uploading" | "done" | "failed" | "cancelled";

interface QueueItem {
  key: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  uploadedName?: string;
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  targetFolderId: string | null;
  targetFolderName?: string | null;
  demo: boolean;
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  allowMultiple: boolean;
  onUploaded: () => void;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function UploadDialog({
  open,
  onClose,
  targetFolderId,
  targetFolderName,
  demo,
  maxUploadSizeMb,
  allowedExtensions,
  allowMultiple,
  onUploaded,
}: UploadDialogProps) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [starting, setStarting] = useState(false);
  const activeRef = useRef<Record<string, XMLHttpRequest | null>>({});
  const uploadedRef = useRef(false);
  const maxBytes = maxUploadSizeMb * 1024 * 1024;
  const allowed = useMemo(() => new Set(allowedExtensions.map((item) => item.toLowerCase())), [allowedExtensions]);

  const update = useCallback((key: string, patch: Partial<QueueItem>) => {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const accepted: QueueItem[] = [];
      for (const file of list) {
        const extension = extensionOf(file.name);
        const tooLarge = file.size > maxBytes;
        const badExtension = !allowed.has(extension);
        if (tooLarge || badExtension) {
          toast.error(`${file.name}: ${tooLarge ? t("error.fileTooLarge") : t("upload.rejected")}`);
          continue;
        }
        accepted.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          status: "queued",
          progress: 0,
        });
      }
      if (!allowMultiple && accepted.length > 1) {
        setQueue(accepted.slice(0, 1));
      } else if (accepted.length) {
        setQueue((current) => [...current, ...accepted]);
      }
    },
    [allowMultiple, allowed, maxBytes, t],
  );

  const uploadOne = useCallback(
    (item: QueueItem): Promise<boolean> =>
      new Promise(async (resolve) => {
        update(item.key, { status: "uploading", progress: 0, error: undefined });
        try {
          const initResponse = await fetch("/api/drive/upload/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.file.name,
              mimeType: item.file.type || "application/octet-stream",
              size: item.file.size,
              parentId: targetFolderId || undefined,
            }),
          });
          const init = await initResponse.json().catch(() => ({}));
          if (!initResponse.ok) throw new Error(init.message || t("error.uploadInit"));

          const fileId = await new Promise<string>((resolveUpload, rejectUpload) => {
            const xhr = new XMLHttpRequest();
            activeRef.current[item.key] = xhr;
            xhr.open("PUT", init.uploadUrl as string, true);
            xhr.setRequestHeader("Content-Type", item.file.type || "application/octet-stream");
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                update(item.key, { progress: Math.round((event.loaded / event.total) * 100) });
              }
            };
            xhr.onload = () => {
              activeRef.current[item.key] = null;
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const file = JSON.parse(xhr.responseText) as { id?: string };
                  if (!file.id) rejectUpload(new Error(t("common.uploadFailed")));
                  else resolveUpload(file.id);
                } catch {
                  rejectUpload(new Error(t("common.uploadFailed")));
                }
              } else {
                rejectUpload(new Error(t("common.uploadFailed")));
              }
            };
            xhr.onerror = () => {
              activeRef.current[item.key] = null;
              rejectUpload(new Error(t("error.network")));
            };
            xhr.onabort = () => {
              activeRef.current[item.key] = null;
              rejectUpload(new Error(t("common.cancel")));
            };
            xhr.send(item.file);
          });

          const completeResponse = await fetch("/api/drive/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, pendingToken: init.pendingToken }),
          });
          const completed = await completeResponse.json().catch(() => ({}));
          if (!completeResponse.ok) throw new Error(completed.message || t("common.uploadFailed"));

          update(item.key, {
            status: "done",
            progress: 100,
            uploadedName: typeof completed.name === "string" ? completed.name : init.name,
          });
          uploadedRef.current = true;
          resolve(true);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : t("common.uploadFailed");
          const cancelled = /cancel/i.test(message);
          update(item.key, {
            status: cancelled ? "cancelled" : "failed",
            error: message,
          });
          resolve(false);
        }
      }),
    [targetFolderId, t, update],
  );

  const start = useCallback(async () => {
    if (demo) {
      toast.error(t("upload.demoBlocked"));
      return;
    }
    const pending = queue.filter((item) => item.status === "queued" || item.status === "failed");
    if (pending.length === 0) return;
    setStarting(true);
    let succeeded = 0;
    for (const item of pending) {
      const ok = await uploadOne(item);
      if (ok) succeeded += 1;
    }
    setStarting(false);
    if (succeeded > 0) {
      toast.success(t("common.uploadSuccess"));
      onUploaded();
    }
  }, [demo, onUploaded, queue, t, uploadOne]);

  const cancel = (key: string) => {
    activeRef.current[key]?.abort();
    update(key, { status: "cancelled", error: t("common.cancelUpload") });
  };

  const close = () => {
    if (starting) return;
    for (const xhr of Object.values(activeRef.current)) xhr?.abort();
    activeRef.current = {};
    setQueue([]);
    uploadedRef.current = false;
    onClose();
  };

  const counts = {
    total: queue.length,
    done: queue.filter((item) => item.status === "done").length,
    failed: queue.filter((item) => item.status === "failed").length,
    active: queue.filter((item) => item.status === "uploading").length,
    waiting: queue.filter((item) => item.status === "queued").length,
  };
  const canStart = !demo && !starting && counts.waiting + counts.failed > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("upload.title")}
      description={t("upload.subtitle")}
      size="lg"
      footer={
        <>
          {counts.failed > 0 && !starting && (
            <Button variant="ghost" onClick={() => void start()}>
              <RotateCcw className="size-4" />
              {t("upload.retryAll")}
            </Button>
          )}
          {counts.done > 0 && !starting && (
            <Button variant="ghost" onClick={() => setQueue((current) => current.filter((item) => item.status !== "done"))}>
              <Trash2 className="size-4" />
              {t("upload.clearDone")}
            </Button>
          )}
          <Button variant="secondary" onClick={close} disabled={starting}>
            {t("common.close")}
          </Button>
          <Button onClick={() => void start()} disabled={!canStart} loading={starting}>
            <UploadCloud className="size-4" />
            {counts.active > 0 ? t("common.uploading") : t("upload.start")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {demo && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            {t("upload.demoBlocked")}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {t("upload.toFolder")}: <strong className="text-foreground">{targetFolderName || t("upload.targetDefault")}</strong>
          </span>
          <span>{t("upload.maxSize", { size: formatBytes(maxBytes, locale as Locale) })}</span>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!demo) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!demo && event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-border bg-surface-soft",
            demo && "opacity-60",
          )}
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <FileUp className="size-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">{dragging ? t("upload.dragActive") : t("common.dropFiles")}</p>
          <button
            type="button"
            disabled={demo}
            onClick={() => inputRef.current?.click()}
            className="mt-1 text-sm font-semibold text-accent hover:underline disabled:opacity-50"
          >
            {t("common.browse")}
          </button>
          <p className="mt-3 text-[11px] text-muted">
            {allowedExtensions.slice(0, 10).join(" Â· ")}
            {allowedExtensions.length > 10 ? " â€¦" : ""}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple={allowMultiple}
            className="hidden"
            accept={allowedExtensions.map((item) => `.${item}`).join(",")}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>{t("upload.queue")}</span>
              <span>{t("upload.uploadedCount", { done: counts.done, total: counts.total })}</span>
            </div>
            <ul className="scrollbar-thin max-h-64 space-y-1.5 overflow-y-auto">
              {queue.map((item) => (
                <li key={item.key} className="rounded-xl border border-border bg-surface-soft p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-strong text-muted">
                      {item.status === "done" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : item.status === "failed" ? (
                        <XCircle className="size-4 text-danger" />
                      ) : item.status === "uploading" ? (
                        <Loader2 className="size-4 animate-spin text-accent" />
                      ) : (
                        <FileUp className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.uploadedName || item.file.name}</p>
                      <p className="text-[11px] text-muted">
                        {formatBytes(item.file.size, locale as Locale)} Â·{" "}
                        {item.status === "queued"
                          ? t("upload.waiting")
                          : item.status === "uploading"
                            ? `${item.progress}%`
                            : item.status === "done"
                              ? t("upload.done")
                              : item.status === "cancelled"
                                ? t("upload.cancelled")
                                : item.error || t("upload.failed")}
                      </p>
                    </div>
                    {item.status === "uploading" && (
                      <button type="button" className="icon-btn size-8" onClick={() => cancel(item.key)} title={t("common.cancelUpload")}>
                        <XCircle className="size-4" />
                      </button>
                    )}
                    {item.status === "uploading" && <Spinner className="size-4 text-accent" />}
                  </div>
                  {(item.status === "uploading" || item.status === "done") && (
                    <div className="mt-2">
                      <ProgressBar value={item.progress} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted">{t("upload.duplicateNote")}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
