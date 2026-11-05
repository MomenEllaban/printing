"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, FileUp, Loader2, RotateCcw, Trash2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Modal, Button, Input, ProgressBar, Spinner } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/file-utils";
import { buildExamFileName, type ExamLevel, type ExamRegisterType, type ExamUploadMeta } from "@/lib/exam-utils";
import type { Locale } from "@/lib/types";

type UploadStatus = "queued" | "uploading" | "done" | "failed" | "cancelled";

interface QueueItem {
  key: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  uploadedName?: string;
  room?: string;
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

  // Exam registration metadata states
  const [registerType, setRegisterType] = useState<ExamRegisterType>("student");
  const [institution, setInstitution] = useState("");
  const [examType, setExamType] = useState<ExamLevel>("EST 1");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [autoFolder, setAutoFolder] = useState(!targetFolderId);

  useEffect(() => {
    if (open) {
      // If user is inside a folder, default to direct upload into this folder (autoFolder = false)
      // Only enable autoFolder hierarchy by default when uploading from root (targetFolderId is falsy)
      setAutoFolder(!targetFolderId);
    }
  }, [open, targetFolderId]);

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
          const examMetadata: ExamUploadMeta = {
            registerType,
            institution: institution.trim() || undefined,
            examType,
            floor: floor.trim() || undefined,
            room: registerType === "student" ? (item.room || room).trim() || undefined : undefined,
            autoFolder,
          };

          const initResponse = await fetch("/api/drive/upload/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.file.name,
              mimeType: item.file.type || "application/octet-stream",
              size: item.file.size,
              parentId: targetFolderId || undefined,
              examMetadata,
            }),
          });
          const init = await initResponse.json().catch(() => ({}));
          if (!initResponse.ok) throw new Error(init.message || t("error.uploadInit"));

          let fileId: string | null = null;
          let uploadedItemName: string | undefined = undefined;

          try {
            fileId = await new Promise<string>((resolveUpload, rejectUpload) => {
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
                rejectUpload(new Error(t("error.uploadCors")));
              };
              xhr.onabort = () => {
                activeRef.current[item.key] = null;
                rejectUpload(new Error(t("common.cancel")));
              };
              xhr.send(item.file);
            });
          } catch (directError) {
            const isAborted = directError instanceof Error && /cancel/i.test(directError.message);
            if (isAborted) throw directError;

            // If direct upload fails (e.g. CORS block) and file is within serverless limit, fallback to server upload
            if (item.file.size <= 4.2 * 1024 * 1024) {
              const formData = new FormData();
              formData.append("file", item.file);
              if (targetFolderId) {
                formData.append("parentId", targetFolderId);
              }
              formData.append("examMetadata", JSON.stringify(examMetadata));

              const directResponse = await fetch("/api/drive/upload/direct", {
                method: "POST",
                body: formData,
              });
              const directData = await directResponse.json().catch(() => ({}));
              if (!directResponse.ok) {
                throw new Error(
                  directData.message || (directError instanceof Error ? directError.message : t("common.uploadFailed")),
                );
              }
              fileId = directData.id;
              uploadedItemName = directData.name;
            } else {
              throw directError;
            }
          }

          if (!uploadedItemName && fileId) {
            const completeResponse = await fetch("/api/drive/upload/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId, pendingToken: init.pendingToken }),
            });
            const completed = await completeResponse.json().catch(() => ({}));
            if (!completeResponse.ok) throw new Error(completed.message || t("common.uploadFailed"));
            uploadedItemName = typeof completed.name === "string" ? completed.name : init.name;
          }

          update(item.key, {
            status: "done",
            progress: 100,
            uploadedName: uploadedItemName || init.name,
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
    [autoFolder, examType, floor, institution, registerType, room, targetFolderId, t, update],
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

        {targetFolderId ? (
          <div className="rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-accent-strong">
              <span className="text-base">📁</span>
              <span>
                {locale === "ar" ? "الرفع المباشر داخل المجلد الحالي:" : "Uploading inside current folder:"}{" "}
                <strong className="underline decoration-accent font-bold text-foreground">
                  {targetFolderName || (locale === "ar" ? "المجلد الحالي" : "Current Folder")}
                </strong>
              </span>
            </div>
            <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent-strong">
              {autoFolder
                ? (locale === "ar" ? "تفرع مجلدات إضافي" : "Nested subfolders")
                : (locale === "ar" ? "✓ رفع مباشر في هذا المجلد" : "✓ Direct upload in this folder")}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {t("upload.toFolder")}: <strong className="text-foreground">{t("upload.targetDefault")}</strong>
            </span>
            <span>{t("upload.maxSize", { size: formatBytes(maxBytes, locale as Locale) })}</span>
          </div>
        )}

        {/* Exam Metadata Card */}
        <div className="rounded-2xl border border-border bg-surface-soft p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-accent" />
              {t("upload.examSectionTitle")}
            </span>
            <span className="text-[11px] font-mono text-muted bg-surface px-2 py-0.5 rounded-md border border-border/50">
              EST Exam Center
            </span>
          </div>

          {/* Row 1: Register Type (Student Register vs Proctor Register) */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              {t("upload.registerType")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRegisterType("student")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                  registerType === "student"
                    ? "border-accent bg-accent text-white shadow-sm"
                    : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-soft",
                )}
              >
                <span>🎓</span>
                <span>{t("upload.registerTypeStudent")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisterType("proctor");
                  setRoom("");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                  registerType === "proctor"
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-soft",
                )}
              >
                <span>📋</span>
                <span>{t("upload.registerTypeProctor")}</span>
              </button>
            </div>
            {registerType === "proctor" && (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span>ℹ️</span>
                <span>{t("upload.proctorNote")}</span>
              </p>
            )}
          </div>

          {/* Row 2: Institution & Exam Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">
                {t("upload.institution")}
              </label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={t("upload.institutionPlaceholder")}
                className="text-xs py-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                {t("upload.examType")}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExamType("EST 1")}
                  className={cn(
                    "rounded-xl border py-1.5 text-xs font-bold transition-all cursor-pointer",
                    examType === "EST 1"
                      ? "border-accent bg-accent text-white shadow-sm"
                      : "border-border bg-surface text-muted hover:text-foreground",
                  )}
                >
                  EST 1
                </button>
                <button
                  type="button"
                  onClick={() => setExamType("EST 2")}
                  className={cn(
                    "rounded-xl border py-1.5 text-xs font-bold transition-all cursor-pointer",
                    examType === "EST 2"
                      ? "border-accent bg-accent text-white shadow-sm"
                      : "border-border bg-surface text-muted hover:text-foreground",
                  )}
                >
                  EST 2
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Floor & Room (Room is conditionally hidden if registerType === "proctor") */}
          <div className={cn("grid gap-3 transition-all", registerType === "student" ? "grid-cols-2" : "grid-cols-1")}>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                {t("upload.floor")}
              </label>
              <Input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder={t("upload.floorPlaceholder")}
                className="text-xs py-1.5"
              />
            </div>

            {registerType === "student" && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {t("upload.room")}
                </label>
                <Input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder={t("upload.roomPlaceholder")}
                  className="text-xs py-1.5"
                />
              </div>
            )}
          </div>

          {/* Auto Folder Option */}
          <div className="pt-2 border-t border-border/40">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoFolder}
                onChange={(e) => setAutoFolder(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border accent-accent"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground">
                  {targetFolderId
                    ? (locale === "ar"
                        ? `إنشاء مجلدات فرعية جديدة داخل "${targetFolderName || 'المجلد الحالي'}"`
                        : `Create nested subfolders inside "${targetFolderName || 'current folder'}"`)
                    : t("upload.autoFolder")}
                </span>
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  {targetFolderId
                    ? (locale === "ar"
                        ? "افتراضياً (غير مفعّل): يتم حفظ الملف مباشرة داخل هذا المجلد بدون إنشاء أي مجلدات داخله."
                        : "Default (unchecked): file is placed directly in this folder without creating subfolders.")
                    : (locale === "ar"
                        ? "يتم تنظيم الملفات تلقائياً في مجلدات (المؤسسة > نوع الامتحان > الدور)"
                        : "Auto-organizes files into (Institution > Exam Level > Floor)")}
                </p>
              </div>
            </label>
          </div>

          {/* Live Preview of File Name */}
          <div className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-[11px]">
            <span className="font-semibold text-muted block mb-0.5">{t("upload.generatedName")}</span>
            <span className="font-mono text-accent-strong break-all">
              {buildExamFileName(queue[0]?.file.name || "attendance_sheet.pdf", {
                registerType,
                institution: institution.trim() || undefined,
                examType,
                floor: floor.trim() || undefined,
                room: registerType === "student" ? room.trim() || undefined : undefined,
              })}
            </span>
          </div>
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
          onClick={() => {
            if (!demo) inputRef.current?.click();
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors cursor-pointer",
            dragging ? "border-accent bg-accent-soft" : "border-border bg-surface-soft",
            demo && "opacity-60 cursor-not-allowed",
          )}
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <FileUp className="size-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">{dragging ? t("upload.dragActive") : t("common.dropFiles")}</p>
          <button
            type="button"
            disabled={demo}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-1 text-sm font-semibold text-accent hover:underline disabled:opacity-50 cursor-pointer"
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
                      <p className="truncate text-sm font-medium">
                        {item.uploadedName ||
                          buildExamFileName(item.file.name, {
                            registerType,
                            institution: institution.trim() || undefined,
                            examType,
                            floor: floor.trim() || undefined,
                            room: registerType === "student" ? (item.room || room).trim() || undefined : undefined,
                          })}
                      </p>
                      {allowMultiple && registerType === "student" && item.status === "queued" && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-muted">{t("upload.room")}:</span>
                          <input
                            type="text"
                            value={item.room ?? room}
                            onChange={(e) => update(item.key, { room: e.target.value })}
                            placeholder={room || "101"}
                            className="input py-0.5 px-2 text-xs w-28 h-7"
                          />
                        </div>
                      )}
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
