"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FolderPlus,
  Loader2,
  Package,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

type StudentWithReceipt = CertificateStudentData & {
  received?: boolean;
  receivedAt?: string | null;
};

type ServerBatch = {
  id: string;
  name: string;
  shortName?: string | null;
  fileName?: string | null;
  driveFileId?: string | null;
  driveFolderId?: string | null;
  batchType?: string | null;
  sourceKey?: string | null;
  studentsData?: any;
  receiptsData?: any;
  studentCount?: number;
  receivedCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-#:()]+/g, "");
}

function parseSmartSheet(rawRows: any[][], defaultBatchName: string): StudentWithReceipt[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  let headerIdx = 0;
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const joined = row.map((c) => String(c).toLowerCase()).join(" ");
    if (joined.includes("name") || joined.includes("student") || joined.includes("report")) {
      headerIdx = r;
      break;
    }
  }

  const headers = (rawRows[headerIdx] || []).map((h) => String(h || "").trim());
  const normHeaders = headers.map((h) => normalizeHeader(h));
  const results: StudentWithReceipt[] = [];

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    let serial = "";
    let nameAr = "";
    let nameEn = "";
    let nationalId = "";
    let totalReports: number | string = 1;
    let reportList = "";
    let school = "";
    let gov = "";
    let reqId = "";
    let batchName = defaultBatchName;

    row.forEach((val: any, colIdx: number) => {
      if (val === undefined || val === null || String(val).trim() === "") return;
      const v = String(val).trim();
      const h = normHeaders[colIdx] || "";
      if (h === "sn" || h === "serial" || h === "no" || (colIdx === 0 && !isNaN(Number(v)))) {
        if (!serial) serial = v;
      }
      if (
        h.includes("namear") ||
        h.includes("arabic") ||
        h.includes("عربي") ||
        h.includes("بالعربي") ||
        h.includes("الاسمبالعربي") ||
        h.includes("اسمالطالببالعربي")
      ) {
        nameAr = v;
      } else if (
        h.includes("nameen") ||
        h.includes("english") ||
        h.includes("انجليزي") ||
        h.includes("إنجليزي") ||
        h.includes("بالانجليزي") ||
        h.includes("بالإنجليزي")
      ) {
        nameEn = v;
      } else if (h.includes("name") || h.includes("student") || h.includes("طالب") || h.includes("اسم")) {
        if (/[\u0600-\u06FF]/.test(v)) {
          if (!nameAr) nameAr = v;
        } else {
          if (!nameEn) nameEn = v;
        }
      }
      if (h.includes("national")) nationalId = v;
      if (h.includes("totalreport") || h.includes("nbofreport")) totalReports = v;
      if (h.includes("reportlist") || h.includes("reports")) reportList = v;
      if (h.includes("school")) school = v;
      if (h.includes("governorate") || h.includes("city")) gov = v;
      if (h.includes("requestid")) reqId = v;
      if (h.includes("batch")) batchName = v;
    });

    const studentName = nameEn || nameAr;
    if (!studentName) continue;

    const finalSerial = serial || String(results.length + 1);
    results.push({
      id: `row-${r}`,
      serialNumber: finalSerial,
      studentName,
      studentNameAr: nameAr || undefined,
      seatNumber: "",
      nationalId,
      schoolName: school,
      governorate: gov,
      totalReports: totalReports || 1,
      reportsList: reportList || "Official EST Score Report",
      certificateCode: reqId || `EST-REP-${String(finalSerial).padStart(4, "0")}`,
      batchName,
      received: false,
      receivedAt: null,
    });
  }

  return results;
}

export default function CertificateStickersPage() {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverBatches, setServerBatches] = useState<ServerBatch[]>([]);
  const [loadingServerBatches, setLoadingServerBatches] = useState(false);
  const [initializingDrive, setInitializingDrive] = useState(false);

  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [customBatchName, setCustomBatchName] = useState<string>("");

  const [students, setStudents] = useState<StudentWithReceipt[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeDriveFileId, setActiveDriveFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  const activeServerBatch = useMemo(
    () => serverBatches.find((b) => b.id === activeBatchId) || null,
    [serverBatches, activeBatchId],
  );

  const getStudentReceiptKey = useCallback((s: StudentWithReceipt, idx: number) => {
    return String(s.id || s.serialNumber || s.certificateCode || `${s.studentName}-${idx}`);
  }, []);

  const applyServerReceipts = useCallback(
    (list: StudentWithReceipt[], receiptsData: any) => {
      const map = receiptsData && typeof receiptsData === "object" && !Array.isArray(receiptsData) ? receiptsData : {};
      return list.map((s, idx) => {
        const key = getStudentReceiptKey(s, idx);
        const rec = map[key];
        return rec
          ? { ...s, received: Boolean(rec.received), receivedAt: rec.receivedAt || null }
          : { ...s, received: Boolean(s.received), receivedAt: s.receivedAt || null };
      });
    },
    [getStudentReceiptKey],
  );

  const clearActiveBatch = useCallback(() => {
    setActiveBatchId(null);
    setStudents([]);
    setCustomBatchName("");
    setUploadedFileName(null);
    setActiveDriveFileId(null);
    setSearchQuery("");
  }, []);

  const fetchServerBatches = useCallback(async (opts?: { autoSelectFirst?: boolean }) => {
    try {
      setLoadingServerBatches(true);
      const res = await fetch("/api/certificates/batches", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[certificates] failed to load server batches", data);
        return;
      }
      const batches: ServerBatch[] = Array.isArray(data.batches) ? data.batches : [];
      setServerBatches(batches);
      if (data.dbUnavailable) {
        console.warn("[certificates] db unavailable for batches", data.dbError);
      }

      if (batches.length === 0) {
        setActiveBatchId((prev) => (prev ? null : prev));
        setStudents((prev) => (prev.length ? [] : prev));
        return;
      }

      const autoSelectFirst = opts?.autoSelectFirst ?? false;
      setActiveBatchId((prev) => {
        if (prev && batches.some((b) => b.id === prev)) return prev;
        return autoSelectFirst ? batches[0].id : prev;
      });
    } catch (err) {
      console.warn("[certificates] failed to load server batches", err);
    } finally {
      setLoadingServerBatches(false);
    }
  }, []);

  const initCertificatesFolder = useCallback(async () => {
    try {
      setInitializingDrive(true);
      const res = await fetch("/api/certificates/init", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to initialize certificates folder");
      toast.success(locale === "ar" ? "تم تجهيز مجلد الشهادات في Google Drive" : "Certificates folder is ready in Google Drive");
      await fetchServerBatches({ autoSelectFirst: false });
    } catch (err: any) {
      toast.error(err?.message || (locale === "ar" ? "فشل تجهيز مجلد الشهادات" : "Failed to initialize certificates folder"));
    } finally {
      setInitializingDrive(false);
    }
  }, [fetchServerBatches, locale]);

  const loadServerBatch = useCallback(
    async (batchId: string) => {
      setActiveBatchId(batchId);
      setLoadingBatch(true);
      try {
        const res = await fetch(`/api/certificates/batches/${batchId}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load batch");
        const batch = data.batch as ServerBatch;
        const list = Array.isArray(batch.studentsData) ? (batch.studentsData as StudentWithReceipt[]) : [];
        setStudents(applyServerReceipts(list, batch.receiptsData));
        setCustomBatchName(batch.name || batch.fileName || "Certificate Batch");
        setUploadedFileName(batch.fileName || null);
        setActiveDriveFileId(batch.driveFileId || null);
      } catch (err: any) {
        toast.error(err?.message || (locale === "ar" ? "فشل تحميل الباتش" : "Failed to load batch"));
      } finally {
        setLoadingBatch(false);
      }
    },
    [applyServerReceipts, locale],
  );

  useEffect(() => {
    void fetchServerBatches({ autoSelectFirst: true });
  }, [fetchServerBatches]);

  useEffect(() => {
    if (!activeBatchId) return;
    if (students.length === 0 && !loadingBatch) {
      void loadServerBatch(activeBatchId);
    }
  }, [activeBatchId, students.length, loadingBatch, loadServerBatch]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames.includes("Reports per Student")
          ? "Reports per Student"
          : workbook.SheetNames.includes("06-Reports per Student-Aramex")
          ? "06-Reports per Student-Aramex"
          : workbook.SheetNames[0];

        if (!sheetName) {
          toast.error(locale === "ar" ? "الملف لا يحتوي على أي Sheet" : "File contains no sheets");
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "Certificate Batch";
        const parsed = parseSmartSheet(rawRows, baseName);
        if (parsed.length === 0) {
          toast.error(locale === "ar" ? "لم يتم العثور على بيانات طلاب صالحة" : "No valid student data found");
          return;
        }

        const form = new FormData();
        form.append("file", file);
        form.append("batchName", baseName);
        form.append("students", JSON.stringify(parsed));

        const res = await fetch("/api/certificates/batches", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to save batch to Google Drive");

        const batch = data.batch as ServerBatch;
        toast.success(
          locale === "ar"
            ? `تم حفظ الملف في Google Drive وإنشاء الباتش (${parsed.length} طالب)`
            : `Saved file to Google Drive and created batch (${parsed.length} students)`,
        );

        await fetchServerBatches({ autoSelectFirst: false });
        if (batch?.id) {
          await loadServerBatch(batch.id);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        toast.error(err?.message || (locale === "ar" ? "فشل رفع/حفظ الملف" : "Failed to upload/save file"));
      } finally {
        setIsUploading(false);
      }
    },
    [locale, fetchServerBatches, loadServerBatch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) void handleFileUpload(files[0]);
    },
    [handleFileUpload],
  );

  const toggleStudentReceipt = useCallback(
    async (studentIndex: number) => {
      if (!activeBatchId) return;
      const target = students[studentIndex];
      if (!target) return;
      const nextReceived = !Boolean(target.received);
      const nextReceivedAt = nextReceived ? new Date().toISOString() : null;

      setStudents((prev) =>
        prev.map((s, idx) => (idx === studentIndex ? { ...s, received: nextReceived, receivedAt: nextReceivedAt } : s)),
      );

      const key = getStudentReceiptKey(target, studentIndex);
      try {
        const res = await fetch(`/api/certificates/batches/${activeBatchId}/receipts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentKey: key, received: nextReceived }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to save receipt");
        setServerBatches((prev) =>
          prev.map((b) => (b.id === activeBatchId ? { ...b, receiptsData: data.batch?.receiptsData ?? b.receiptsData } : b)),
        );
      } catch (err: any) {
        setStudents((prev) =>
          prev.map((s, idx) =>
            idx === studentIndex ? { ...s, received: !nextReceived, receivedAt: !nextReceived ? new Date().toISOString() : null } : s,
          ),
        );
        toast.error(err?.message || (locale === "ar" ? "فشل حفظ حالة الاستلام" : "Failed to save receipt status"));
      }
    },
    [students, activeBatchId, getStudentReceiptKey, locale],
  );

  const deleteServerBatch = useCallback(
    async (batchId: string) => {
      try {
        const res = await fetch(`/api/certificates/batches/${batchId}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to delete batch");
        toast.success(locale === "ar" ? "تم حذف الباتش" : "Batch deleted");
        if (activeBatchId === batchId) {
          clearActiveBatch();
        }
        await fetchServerBatches({ autoSelectFirst: activeBatchId === batchId });
      } catch (err: any) {
        toast.error(err?.message || (locale === "ar" ? "فشل حذف الباتش" : "Failed to delete batch"));
      }
    },
    [fetchServerBatches, activeBatchId, clearActiveBatch, locale],
  );

  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.serialNumber && String(s.serialNumber).toLowerCase().includes(q)) ||
          s.studentName.toLowerCase().includes(q) ||
          (s.studentNameAr && s.studentNameAr.includes(searchQuery.trim())) ||
          (s.reportsList && s.reportsList.toLowerCase().includes(q)) ||
          (s.certificateCode && s.certificateCode.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [students, searchQuery]);

  const totalSheetsA4 = Math.ceil(filteredStudents.length / 4);
  const receivedCount = useMemo(() => students.filter((s) => s.received).length, [students]);

  const fetchPdfBlob = useCallback(async (): Promise<Blob> => {
    if (filteredStudents.length === 0) {
      throw new Error(locale === "ar" ? "لا توجد بيانات طلاب للطباعة" : "No student data to print");
    }
    const res = await fetch("/api/certificates/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: filteredStudents, batchName: customBatchName || activeServerBatch?.name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate PDF");
    }
    return await res.blob();
  }, [filteredStudents, customBatchName, activeServerBatch, locale]);

  const handlePreviewPdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewBlobUrl(url);
      setPreviewTitle(`${activeServerBatch?.shortName || activeServerBatch?.name || customBatchName} (${filteredStudents.length})`);
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, activeServerBatch, customBatchName, filteredStudents.length]);

  const handleDirectPrint = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(url, "_blank");
          }
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 60_000);
        }, 500);
      };
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EST_Stickers_${(activeServerBatch?.shortName || activeServerBatch?.name || "Batch").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, activeServerBatch]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {locale === "ar" ? "استيكرات الشهادات والتقارير" : "Certificate & Report Stickers"}
              </h1>
              <p className="text-xs text-muted">
                {locale === "ar"
                  ? "ارفع ملفات Excel من Google Drive/جهازك ليتم حفظها في Drive وقاعدة البيانات مع تتبع الاستلام من أي جهاز."
                  : "Upload Excel files to be stored in Google Drive and the database, with receipt tracking from any device."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={initCertificatesFolder} disabled={initializingDrive} className="cursor-pointer gap-1.5 text-xs h-8 px-3">
            {initializingDrive ? <Loader2 className="size-3.5 animate-spin" /> : <FolderPlus className="size-3.5" />}
            <span>{locale === "ar" ? "إنشاء/تجهيز مجلد الشهادات" : "Create/Init Certificates Folder"}</span>
          </Button>
          <Button variant="secondary" onClick={() => void fetchServerBatches()} disabled={loadingServerBatches} className="cursor-pointer gap-1.5 text-xs h-8 px-3">
            {loadingServerBatches ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>{locale === "ar" ? "تحديث" : "Refresh"}</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {locale === "ar" ? "ملفات وباتشات الشهادات (من Google Drive / قاعدة البيانات)" : "Certificate Files & Batches (Google Drive / DB)"}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            {serverBatches.length} {locale === "ar" ? "ملف/باتش" : "items"}
          </span>
        </div>

        {loadingServerBatches && serverBatches.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted">
            <Loader2 className="size-4 animate-spin me-2" />
            {locale === "ar" ? "جارٍ تحميل الملفات..." : "Loading files..."}
          </div>
        ) : serverBatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-soft/40 p-6 text-center text-sm text-muted">
            {locale === "ar"
              ? "لا توجد ملفات محفوظة بعد. ارفع ملفات Excel أدناه وسيتم حفظها في Google Drive وقاعدة البيانات."
              : "No saved files yet. Upload Excel files below and they will be stored in Google Drive and the database."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serverBatches.map((batch) => {
              const isSelected = activeBatchId === batch.id;
              return (
                <div
                  key={batch.id}
                  onClick={() => void loadServerBatch(batch.id)}
                  className={cn(
                    "rounded-xl border p-4 transition-all cursor-pointer",
                    isSelected
                      ? "border-sky-500 bg-sky-500/[0.04] ring-2 ring-sky-500/20"
                      : "border-border bg-surface-soft/40 hover:border-sky-500/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <FileSpreadsheet className="size-4 text-sky-600" />
                        <h3 className="text-sm font-bold text-foreground truncate" title={batch.name}>{batch.shortName || batch.name}</h3>
                        {isSelected && <span className="rounded-full bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5">{locale === "ar" ? "نشط" : "Active"}</span>}
                      </div>
                      <p className="text-[11px] text-muted line-clamp-1" title={batch.fileName || batch.name}>{batch.fileName || batch.name}</p>
                      <div className="mt-2 text-[11px] text-muted flex flex-wrap gap-2">
                        <span>{batch.studentCount || 0} {locale === "ar" ? "طالب" : "students"}</span>
                        <span>•</span>
                        <span>{batch.receivedCount || 0} {locale === "ar" ? "تم الاستلام" : "received"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void deleteServerBatch(batch.id); }}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10"
                      title={locale === "ar" ? "حذف" : "Delete"}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {batch.driveFileId && (
                    <div className="mt-3 pt-2 border-t border-border/40 flex flex-wrap items-center gap-2">
                      <Link href={`/preview/${batch.driveFileId}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline">
                        <Pencil className="size-3" /> {locale === "ar" ? "فتح/تعديل" : "View/Edit"}
                      </Link>
                      <a href={`https://drive.google.com/file/d/${batch.driveFileId}/view`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline">
                        <ExternalLink className="size-3" /> {locale === "ar" ? "Google Drive" : "Google Drive"}
                      </a>
                      <a href={`/api/drive/files/${batch.driveFileId}/content?download=1`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
                        <Download className="size-3" /> {locale === "ar" ? "تحميل" : "Download"}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer",
          "border-border hover:border-amber-500 hover:bg-amber-500/[0.02]",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { if (e.target.files && e.target.files.length > 0) void handleFileUpload(e.target.files[0]); }}
        />
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
          {isUploading ? <Loader2 className="size-6 animate-spin" /> : <FileSpreadsheet className="size-6" />}
        </div>
        <h3 className="text-sm font-bold text-foreground">
          {isUploading
            ? (locale === "ar" ? "جارٍ رفع وحفظ الملف في Google Drive..." : "Uploading and saving file to Google Drive...")
            : (locale === "ar" ? "اسحب ملف Excel هنا أو اضغط للرفع (سيُحفظ في Drive وقاعدة البيانات)" : "Drop Excel here or click to upload (saved to Drive and database)")}
        </h3>
        <p className="mt-1 text-xs text-muted max-w-md">
          {locale === "ar"
            ? "الملفات المرفوعة (مثل تقارير Aramex / MoE) ستظهر في القائمة أعلاه ويمكن استخدامها من أي جهاز مع حفظ الاستلام لكل طالب."
            : "Uploaded files (e.g. Aramex / MoE reports) appear in the list above and can be used from any device with per-student receipt tracking."}
        </p>
      </div>

      {students.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm"><div className="text-xs text-muted">{locale === "ar" ? "إجمالي الطلاب" : "Total Candidates"}</div><div className="mt-2 text-2xl font-black">{filteredStudents.length}</div></div>
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm"><div className="text-xs text-muted">{locale === "ar" ? "أوراق A4" : "A4 Sheets"}</div><div className="mt-2 text-2xl font-black text-amber-600">{totalSheetsA4}</div></div>
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm"><div className="text-xs text-muted">{locale === "ar" ? "تم الاستلام" : "Received"}</div><div className="mt-2 text-2xl font-black text-emerald-600">{receivedCount}</div></div>
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm"><div className="text-xs text-muted">{locale === "ar" ? "المتبقي" : "Remaining"}</div><div className="mt-2 text-2xl font-black">{Math.max(0, students.length - receivedCount)}</div></div>
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={locale === "ar" ? "ابحث بالاسم أو الرقم..." : "Search by name or serial..."} className="ps-8 text-xs h-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeDriveFileId && (
              <>
                <Link href={`/preview/${activeDriveFileId}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface-soft"><Pencil className="size-3.5" />{locale === "ar" ? "فتح/تعديل الملف" : "View/Edit File"}</Link>
                <a href={`https://drive.google.com/file/d/${activeDriveFileId}/view`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface-soft"><ExternalLink className="size-3.5" />{locale === "ar" ? "Google Drive" : "Google Drive"}</a>
                <a href={`/api/drive/files/${activeDriveFileId}/content?download=1`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface-soft"><Download className="size-3.5" />{locale === "ar" ? "تحميل Excel" : "Download Excel"}</a>
              </>
            )}
            <Button variant="secondary" onClick={handlePreviewPdf} disabled={isGenerating || filteredStudents.length === 0} className="cursor-pointer gap-1.5 text-xs font-semibold h-8 px-3">
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5 text-accent" />}<span>{locale === "ar" ? "معاينة PDF" : "Preview PDF"}</span>
            </Button>
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isGenerating || filteredStudents.length === 0} className="cursor-pointer gap-1.5 text-xs font-semibold h-8 px-3">
              <Download className="size-3.5" /><span>{locale === "ar" ? "تنزيل PDF" : "Download PDF"}</span>
            </Button>
            <Button variant="primary" onClick={handleDirectPrint} disabled={isGenerating || filteredStudents.length === 0} className="cursor-pointer gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-8 px-3">
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}<span>{locale === "ar" ? "طباعة" : "Print"}</span>
            </Button>
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-surface-soft/60 font-semibold text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الرقم" : "Serial"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "اسم الطالب" : "Student Name"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "التقارير" : "Reports"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "قائمة التقارير" : "Reports List"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الاستلام" : "Received"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((s, idx) => {
                  const key = getStudentReceiptKey(s, idx);
                  const originalIndex = students.findIndex((st, stIdx) => getStudentReceiptKey(st, stIdx) === key);
                  const received = Boolean(s.received);
                  return (
                    <tr key={s.id || idx} className={cn("hover:bg-surface-soft/40 transition-colors", received && "bg-emerald-500/5")}>
                      <td className="px-4 py-2.5 font-mono text-muted">{idx + 1}</td>
                      <td className="px-4 py-2.5"><span className="rounded bg-slate-900 text-amber-400 px-2 py-0.5 font-mono font-bold text-xs">({s.serialNumber || idx + 1})</span></td>
                      <td className="px-4 py-2.5 font-bold text-foreground text-sm">
                        <div>{s.studentName}</div>
                        {s.studentNameAr && s.studentNameAr !== s.studentName && (
                          <div className="text-xs font-semibold text-muted mt-0.5">{s.studentNameAr}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 text-xs">{s.totalReports || 1}</span></td>
                      <td className="px-4 py-2.5 text-foreground max-w-xs">{s.reportsList || "-"}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => void toggleStudentReceipt(originalIndex >= 0 ? originalIndex : idx)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-colors cursor-pointer",
                            received
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                              : "bg-surface text-foreground border-border hover:border-emerald-500/50 hover:bg-emerald-500/10",
                          )}
                        >
                          {locale === "ar" ? (received ? "تم الاستلام" : "استلام") : (received ? "Received" : "Receive")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeBatchId && !loadingBatch && students.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {locale === "ar" ? "لا توجد بيانات طلاب في هذا الباتش." : "No student data in this batch."}
        </div>
      )}

      {previewOpen && pdfPreviewBlobUrl && (
        <StickerPreviewModal
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); if (pdfPreviewBlobUrl) { URL.revokeObjectURL(pdfPreviewBlobUrl); setPdfPreviewBlobUrl(null); } }}
          pdfUrl={pdfPreviewBlobUrl}
          title={previewTitle}
          onPrint={handleDirectPrint}
          customTitle={previewTitle}
          customDescription={locale === "ar" ? "معاينة استيكرات الشهادات (ربع A4)" : "Certificate stickers preview (Quarter A4)"}
        />
      )}
    </div>
  );
}
