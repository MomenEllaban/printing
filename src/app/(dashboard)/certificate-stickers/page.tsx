"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  Loader2,
  Package,
  Printer,
  Search,
  Sparkles,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

export const BATCH_PRESETS = [
  {
    id: "batch-1",
    name: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
    shortName: "Batch 1: Aramex Online",
    date: "07.11.2026",
    courier: "Aramex Courier Dispatch",
    color: "amber",
  },
  {
    id: "batch-2",
    name: "Data for MoE - Nov Batch 2 11.11.2026",
    shortName: "Batch 2: MoE Delivery",
    date: "11.11.2026",
    courier: "Ministry of Education (MoE) Handover",
    color: "emerald",
  },
];

const CUSTOM_BATCHES_STORAGE_KEY = "certificate_sticker_custom_batches_v1";

type SavedCustomBatch = {
  id: string;
  name: string;
  shortName: string;
  fileName: string;
  students: CertificateStudentData[];
  savedAt: string;
};

type StudentWithReceipt = CertificateStudentData & {
  received?: boolean;
  receivedAt?: string | null;
};

const RECEIPTS_STORAGE_PREFIX = "certificate_sticker_receipts_v1:";

const INITIAL_FALLBACK_STUDENTS: StudentWithReceipt[] = [
  {
    serialNumber: "1",
    studentName: "Abdelaziz Sameh Mahmoud Aly Aboueyana",
    totalReports: 4,
    reportsList: "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II",
    seatNumber: "10245",
    nationalId: "30501011234567",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Cairo",
    certificateCode: "EST-REP-0001",
    batchName: "Data for MoE - Nov Batch 2 11.11.2026",
  },
  {
    serialNumber: "2",
    studentName: "Abdelrahman Alaa Ahmed Ragheb Ibrahim",
    totalReports: 1,
    reportsList: "January 2026 - EST I",
    seatNumber: "10246",
    nationalId: "30502021234568",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Giza",
    certificateCode: "EST-REP-0002",
    batchName: "Data for MoE - Nov Batch 2 11.11.2026",
  },
  {
    serialNumber: "3",
    studentName: "Abdelrahman Khaled Sabry Ibrahim Elghazaly",
    totalReports: 2,
    reportsList: "May 2025 - EST I; January 2026 - EST II",
    seatNumber: "10247",
    nationalId: "30503031234569",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Alexandria",
    certificateCode: "EST-REP-0003",
    batchName: "Data for MoE - Nov Batch 2 11.11.2026",
  },
  {
    serialNumber: "4",
    studentName: "Adam Wael Ahmed Ahmed Ibrahim",
    totalReports: 2,
    reportsList: "October 2025 - EST I; December 2026 - EST I",
    seatNumber: "10248",
    nationalId: "30504041234570",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Menofia",
    certificateCode: "EST-REP-0004",
    batchName: "Data for MoE - Nov Batch 2 11.11.2026",
  },
];

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
      if (h.includes("namear")) {
        nameAr = v;
      } else if (h.includes("nameen") || h.includes("name") || h.includes("student")) {
        if (!nameEn) nameEn = v;
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
    const finalReports = totalReports || 1;
    const finalReportsList = reportList || "Official EST Score Report";

    results.push({
      id: `row-${r}`,
      serialNumber: finalSerial,
      studentName,
      seatNumber: "",
      nationalId,
      schoolName: school,
      governorate: gov,
      totalReports: finalReports,
      reportsList: finalReportsList,
      certificateCode: reqId || (finalSerial ? `EST-REP-${String(finalSerial).padStart(4, "0")}` : `EST-REP-${r}`),
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

  const [activeBatchId, setActiveBatchId] = useState<string>("batch-1");
  const [customBatchName, setCustomBatchName] = useState<string>(BATCH_PRESETS[0].name);
  const [savedCustomBatches, setSavedCustomBatches] = useState<SavedCustomBatch[]>([]);

  const [students, setStudents] = useState<StudentWithReceipt[]>(INITIAL_FALLBACK_STUDENTS);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_BATCHES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedCustomBatches(parsed.filter((b) => b && b.id && b.name && Array.isArray(b.students)));
      }
    } catch {}
  }, []);

  const persistCustomBatches = useCallback((batches: SavedCustomBatch[]) => {
    setSavedCustomBatches(batches);
    try {
      window.localStorage.setItem(CUSTOM_BATCHES_STORAGE_KEY, JSON.stringify(batches));
    } catch {}
  }, []);

  const activeBatch = useMemo(() => {
    const preset = BATCH_PRESETS.find((b) => b.id === activeBatchId);
    if (preset) return preset;
    const custom = savedCustomBatches.find((b) => b.id === activeBatchId);
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        shortName: custom.shortName,
        date: custom.savedAt ? new Date(custom.savedAt).toLocaleDateString() : "",
        courier: custom.fileName || (locale === "ar" ? "ملف Excel مرفوع" : "Uploaded Excel"),
        color: "sky",
      };
    }
    return undefined;
  }, [activeBatchId, savedCustomBatches, locale]);

  const getStudentReceiptKey = useCallback((s: StudentWithReceipt, idx: number) => {
    return String(s.id || s.serialNumber || s.certificateCode || `${s.studentName}-${idx}`);
  }, []);

  const loadReceiptMap = useCallback((batchId: string): Record<string, { received: boolean; receivedAt?: string | null }> => {
    try {
      const raw = window.localStorage.getItem(`${RECEIPTS_STORAGE_PREFIX}${batchId}`);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const saveReceiptMap = useCallback((batchId: string, map: Record<string, { received: boolean; receivedAt?: string | null }>) => {
    try {
      window.localStorage.setItem(`${RECEIPTS_STORAGE_PREFIX}${batchId}`, JSON.stringify(map));
    } catch {}
  }, []);

  const applyReceiptMap = useCallback(
    (batchId: string, list: StudentWithReceipt[]) => {
      const map = loadReceiptMap(batchId);
      return list.map((s, idx) => {
        const key = getStudentReceiptKey(s, idx);
        const rec = map[key];
        return rec ? { ...s, received: Boolean(rec.received), receivedAt: rec.receivedAt || null } : { ...s, received: Boolean(s.received), receivedAt: s.receivedAt || null };
      });
    },
    [getStudentReceiptKey, loadReceiptMap],
  );

  const fetchBatchData = useCallback(
    async (batchId: string) => {
      try {
        setLoadingBatch(true);
        const res = await fetch(`/api/certificates/official-batches?batchId=${batchId}`);
        if (!res.ok) throw new Error("Failed to load batch");
        const data = await res.json();
        if (Array.isArray(data.students) && data.students.length > 0) {
          const withReceipts = applyReceiptMap(batchId, data.students as StudentWithReceipt[]);
          setStudents(withReceipts);
          setCustomBatchName(data.batchName || BATCH_PRESETS.find((b) => b.id === batchId)?.name || "");
          setUploadedFileName(null);
          toast.success(
            locale === "ar"
              ? `تم تحميل ${data.students.length} استيكر من "${data.batchName}"`
              : `Loaded ${data.students.length} stickers for "${data.batchName}"`,
          );
        } else {
          setStudents(INITIAL_FALLBACK_STUDENTS);
        }
      } catch {
        setStudents(INITIAL_FALLBACK_STUDENTS);
      } finally {
        setLoadingBatch(false);
      }
    },
    [locale, applyReceiptMap],
  );

  useEffect(() => {
    void fetchBatchData("batch-1");
  }, [fetchBatchData]);

  const switchBatch = useCallback(
    (batchId: string) => {
      setActiveBatchId(batchId);
      const preset = BATCH_PRESETS.find((b) => b.id === batchId);
      if (preset) {
        setCustomBatchName(preset.name);
        void fetchBatchData(batchId);
        return;
      }

      const custom = savedCustomBatches.find((b) => b.id === batchId);
      if (custom) {
        const withReceipts = custom.students.map((s) => ({ ...s, received: Boolean((s as StudentWithReceipt).received), receivedAt: (s as StudentWithReceipt).receivedAt || null }));
        setStudents(withReceipts as StudentWithReceipt[]);
        setCustomBatchName(custom.name);
        setUploadedFileName(custom.fileName);
        toast.success(
          locale === "ar"
            ? `تم تحميل ${custom.students.length} استيكر من "${custom.shortName}"`
            : `Loaded ${custom.students.length} stickers from "${custom.shortName}"`,
        );
      }
    },
    [fetchBatchData, savedCustomBatches, locale],
  );

  const deleteCustomBatch = useCallback(
    (batchId: string) => {
      const next = savedCustomBatches.filter((b) => b.id !== batchId);
      persistCustomBatches(next);
      toast.success(locale === "ar" ? "تم حذف الباتش المحفوظ" : "Saved batch deleted");

      if (activeBatchId === batchId) {
        setActiveBatchId("batch-1");
        void fetchBatchData("batch-1");
      }
    },
    [savedCustomBatches, persistCustomBatches, activeBatchId, fetchBatchData, locale],
  );

  const toggleStudentReceipt = useCallback(
    (studentIndex: number) => {
      setStudents((prev) => {
        const next = prev.map((s, idx) => {
          if (idx !== studentIndex) return s;
          const nextReceived = !Boolean(s.received);
          return {
            ...s,
            received: nextReceived,
            receivedAt: nextReceived ? new Date().toISOString() : null,
          };
        });

        const isPreset = BATCH_PRESETS.some((b) => b.id === activeBatchId);
        if (isPreset) {
          const map = loadReceiptMap(activeBatchId);
          next.forEach((s, idx) => {
            const key = getStudentReceiptKey(s, idx);
            map[key] = { received: Boolean(s.received), receivedAt: s.receivedAt || null };
          });
          saveReceiptMap(activeBatchId, map);
        } else {
          const customIdx = savedCustomBatches.findIndex((b) => b.id === activeBatchId);
          if (customIdx >= 0) {
            const updatedBatches = [...savedCustomBatches];
            updatedBatches[customIdx] = { ...updatedBatches[customIdx], students: next as CertificateStudentData[] };
            persistCustomBatches(updatedBatches);
          }
        }

        return next;
      });
    },
    [activeBatchId, getStudentReceiptKey, loadReceiptMap, saveReceiptMap, savedCustomBatches, persistCustomBatches],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
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

        const baseName = file.name.replace(/\.[^.]+$/, "").trim() || (activeBatch?.name || customBatchName || "Uploaded Batch");
        const parsed = parseSmartSheet(rawRows, baseName);
        if (parsed.length === 0) {
          toast.error(
            locale === "ar"
              ? "لم يتم العثور على بيانات طلاب صالحة. تأكد من وجود أعمدة الاسم/الرقم/التقارير."
              : "No valid student data found. Ensure Student Name or Serial columns exist.",
          );
          return;
        }

        const batchId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const savedBatch: SavedCustomBatch = {
          id: batchId,
          name: baseName,
          shortName: baseName.length > 46 ? `${baseName.slice(0, 43)}...` : baseName,
          fileName: file.name,
          students: parsed,
          savedAt: new Date().toISOString(),
        };

        const nextBatches = [savedBatch, ...savedCustomBatches];
        persistCustomBatches(nextBatches);

        setActiveBatchId(batchId);
        setStudents(parsed);
        setUploadedFileName(file.name);
        setCustomBatchName(baseName);

        if (fileInputRef.current) fileInputRef.current.value = "";

        toast.success(
          locale === "ar"
            ? `تم استيراد وحفظ ${parsed.length} طالب من "${file.name}" في القائمة`
            : `Imported and saved ${parsed.length} candidates from "${file.name}" to the list`,
        );
      } catch (err: any) {
        toast.error((locale === "ar" ? "خطأ في قراءة ملف الإكسيل: " : "Failed to parse Excel file: ") + (err?.message || ""));
      }
    },
    [activeBatch, customBatchName, locale, persistCustomBatches, savedCustomBatches],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        void handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  const clearData = useCallback(() => {
    setStudents([]);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info(locale === "ar" ? "تم مسح البيانات المعروضة" : "Cleared displayed data");
  }, [locale]);

  const downloadSampleTemplate = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Serial": "128",
        "Candidate Name": "Yara Ramadan Youssef Abou Elkhair",
        "Total reports": 2,
        "Reports list": "January 2026 - EST I; March 2026 - EST II",
        "Seat No": "10245",
        "National ID": "30501011234567",
        "Batch": activeBatch?.name || "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
      },
      {
        "Serial": "129",
        "Candidate Name": "Mariam Ahmed Mohamed Abdel Fattah",
        "Total reports": 1,
        "Reports list": "October 2026 - EST I",
        "Seat No": "10246",
        "National ID": "30502021234568",
        "Batch": activeBatch?.name || "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EST Score Report Stickers");
    XLSX.writeFile(wb, `EST_Report_Stickers_Template_${activeBatchId}.xlsx`);
    toast.success(locale === "ar" ? "تم تنزيل نموذج الإكسيل" : "Downloaded Excel template");
  }, [activeBatch, activeBatchId, locale]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.serialNumber && String(s.serialNumber).toLowerCase().includes(q)) ||
          s.studentName.toLowerCase().includes(q) ||
          (s.reportsList && s.reportsList.toLowerCase().includes(q)) ||
          (s.certificateCode && s.certificateCode.toLowerCase().includes(q)) ||
          (s.seatNumber && s.seatNumber.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [students, searchQuery]);

  const totalSheetsA4 = Math.ceil(filteredStudents.length / 4);

  const fetchPdfBlob = useCallback(async (): Promise<Blob> => {
    if (filteredStudents.length === 0) {
      throw new Error(locale === "ar" ? "لا توجد بيانات طلاب للطباعة" : "No student data to print");
    }

    const res = await fetch("/api/certificates/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        students: filteredStudents,
        batchName: customBatchName || activeBatch?.name,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || (locale === "ar" ? "فشل إنشاء ملف PDF" : "Failed to generate PDF"));
    }

    return await res.blob();
  }, [filteredStudents, customBatchName, activeBatch, locale]);

  const handlePreviewPdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewBlobUrl(url);
      setPreviewTitle(
        locale === "ar"
          ? `معاينة استيكرات: ${activeBatch?.shortName || customBatchName} (${filteredStudents.length} طالب - ${totalSheetsA4} ورقة A4)`
          : `Stickers Preview: ${activeBatch?.shortName || customBatchName} (${filteredStudents.length} candidates - ${totalSheetsA4} A4 sheets)`,
      );
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, activeBatch, customBatchName, filteredStudents.length, totalSheetsA4, locale]);

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
      toast.success(locale === "ar" ? "جارٍ تجهيز أمر الطباعة..." : "Preparing print job...");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, locale]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanBatch = (activeBatch?.shortName || "Batch").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
      a.download = `EST_Stickers_${cleanBatch}_${filteredStudents.length}_Students.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(locale === "ar" ? "تم تحميل ملف PDF بنجاح" : "Downloaded PDF successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, activeBatch, filteredStudents.length, locale]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {locale === "ar" ? "استيكرات الشهادات والتقارير" : "Certificate & Report Stickers"}
                </h1>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {locale === "ar" ? "ربع A4" : "Quarter A4"}
                </span>
              </div>
              <p className="text-xs text-muted">
                {locale === "ar"
                  ? "توليد وطباعة استيكرات تقارير طلاب EST للباتشات الرسمية والملفات المرفوعة، مع حفظ الملفات المرفوعة في قائمة للاختيار لاحقًا."
                  : "Generate & print EST student report stickers for official and uploaded batches, with uploaded files saved in a selectable list."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={downloadSampleTemplate} className="cursor-pointer gap-1.5 text-xs h-8 px-3">
            <Download className="size-3.5" />
            <span>{locale === "ar" ? "نموذج إكسيل" : "Sample Template"}</span>
          </Button>

          {students.length > 0 && (
            <Button variant="danger" onClick={clearData} className="cursor-pointer gap-1.5 text-xs h-8 px-3">
              <Trash2 className="size-3.5" />
              <span>{locale === "ar" ? "مسح العرض" : "Clear View"}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {locale === "ar" ? "اختر الباتش / الملف:" : "Select Batch / File:"}
            </span>
          </div>
          <div className="text-[11px] font-medium text-muted">
            {locale === "ar"
              ? "الباتشات الرسمية جاهزة، وأي ملف إكسيل ترفعه يتم حفظه هنا تلقائيًا."
              : "Official batches are ready, and any Excel you upload is saved here automatically."}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BATCH_PRESETS.map((batch) => {
            const isSelected = activeBatchId === batch.id;
            return (
              <div
                key={batch.id}
                onClick={() => switchBatch(batch.id)}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer",
                  isSelected
                    ? "border-amber-500 bg-amber-500/[0.04] ring-2 ring-amber-500/20 shadow-sm"
                    : "border-border bg-surface-soft/40 hover:border-amber-500/50 hover:bg-surface-soft",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {batch.id === "batch-1" ? <Truck className="size-3.5" /> : <Award className="size-3.5" />}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{batch.shortName}</h3>
                      {isSelected && (
                        <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                          {locale === "ar" ? "نشط" : "Active"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted line-clamp-1" title={batch.name}>
                      {batch.name}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-foreground border border-border">
                      {batch.date}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <span className="text-muted text-[11px]">{batch.courier}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                    {isSelected && loadingBatch ? <Loader2 className="size-3 animate-spin inline" /> : null}
                    {isSelected ? `${students.length} ${locale === "ar" ? "طالب" : "students"}` : (locale === "ar" ? "جاهز للتحميل" : "Ready")}
                  </span>
                </div>
              </div>
            );
          })}

          {savedCustomBatches.map((batch) => {
            const isSelected = activeBatchId === batch.id;
            return (
              <div
                key={batch.id}
                onClick={() => switchBatch(batch.id)}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer",
                  isSelected
                    ? "border-sky-500 bg-sky-500/[0.04] ring-2 ring-sky-500/20 shadow-sm"
                    : "border-border bg-surface-soft/40 hover:border-sky-500/50 hover:bg-surface-soft",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <FileSpreadsheet className="size-3.5" />
                      </span>
                      <h3 className="text-sm font-bold text-foreground truncate" title={batch.name}>{batch.shortName}</h3>
                      {isSelected && (
                        <span className="rounded-full bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                          {locale === "ar" ? "نشط" : "Active"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted line-clamp-1" title={batch.fileName}>
                      {batch.fileName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomBatch(batch.id);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                    title={locale === "ar" ? "حذف الملف المحفوظ" : "Delete saved file"}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <span className="text-muted text-[11px]">{locale === "ar" ? "ملف مرفوع محفوظ" : "Saved uploaded file"}</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400 text-[11px]">
                    {batch.students.length} {locale === "ar" ? "طالب" : "students"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer",
          uploadedFileName
            ? "border-amber-500/40 bg-amber-500/[0.02] hover:border-amber-500/70"
            : "border-border hover:border-amber-500 hover:bg-amber-500/[0.02]",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <FileSpreadsheet className="size-6" />
        </div>

        <h3 className="text-sm font-bold text-foreground">
          {uploadedFileName ? (
            <span className="text-amber-600 dark:text-amber-400">
              {uploadedFileName} ({students.length} {locale === "ar" ? "طالب" : "candidates"})
            </span>
          ) : locale === "ar" ? (
            `اسحب ملف إكسيل هنا أو اضغط للرفع (سيتم حفظه في القائمة)`
          ) : (
            `Drop Excel sheet here, or click to browse (it will be saved in the list)`
          )}
        </h3>

        <p className="mt-1 text-xs text-muted max-w-md">
          {locale === "ar"
            ? "يتم التعرف تلقائيًا على: الرقم التسلسلي، اسم الطالب، إجمالي التقارير، وقائمة التقارير. بعد الرفع سيبقى الملف متاحًا للاختيار من القائمة أعلاه."
            : "Auto-detects: Serial No, Student Name, Total Reports, and Reports List. After upload, the file remains selectable from the list above."}
        </p>
      </div>

      {students.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "إجمالي الطلاب" : "Total Candidates"}</span>
              <Users className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">{filteredStudents.length}</div>
            <div className="text-[10px] text-muted">
              {filteredStudents.length !== students.length && (
                <span>{locale === "ar" ? `من إجمالي ${students.length}` : `of ${students.length} total`}</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "أوراق A4 للطباعة" : "A4 Print Sheets"}</span>
              <Layers className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{totalSheetsA4}</div>
            <div className="text-[10px] text-muted">{locale === "ar" ? "4 استيكرات في كل ورقة" : "4 quarter-A4 stickers per sheet"}</div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "الباتش النشط" : "Active Batch"}</span>
              <Truck className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="mt-1.5 text-xs font-bold text-foreground line-clamp-2" title={customBatchName}>
              {activeBatch?.shortName || customBatchName}
            </div>
            <div className="text-[10px] text-muted">{activeBatch?.date || ""}</div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "شكل الاستيكر" : "Sticker Format"}</span>
              <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-1 text-xs font-bold text-foreground">{locale === "ar" ? "تصميم بسيط وواضح" : "Clean Simple Layout"}</div>
            <div className="text-[10px] text-muted">{locale === "ar" ? "بيانات أساسية + خط واضح" : "Essential Data + Clear Font"}</div>
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "ar" ? "ابحث بالرقم أو الاسم أو التقرير..." : "Search serial, student name, or report..."}
              className="ps-8 text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePreviewPdf}
              disabled={isGenerating || filteredStudents.length === 0}
              className="cursor-pointer gap-1.5 text-xs font-semibold h-8 px-3"
            >
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5 text-accent" />}
              <span>{locale === "ar" ? "معاينة PDF" : "Preview PDF"}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={isGenerating || filteredStudents.length === 0}
              className="cursor-pointer gap-1.5 text-xs font-semibold h-8 px-3"
            >
              <Download className="size-3.5" />
              <span>{locale === "ar" ? "تنزيل PDF" : "Download PDF"}</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleDirectPrint}
              disabled={isGenerating || filteredStudents.length === 0}
              className="cursor-pointer gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-8 px-3"
            >
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
              <span>{locale === "ar" ? "طباعة جميع الاستيكرات" : "Print All Stickers"}</span>
            </Button>
          </div>
        </div>
      )}

      {filteredStudents.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">
                {locale === "ar" ? "معاينة حية لشكل الاستيكر (ربع A4):" : "Live Quarter-A4 Sticker Preview:"}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted">
              {locale === "ar" ? "مطابق لمواصفات EST الرسمية" : "Matches official EST specifications"}
            </span>
          </div>

          {(() => {
            const sample = filteredStudents.find((s) => String(s.serialNumber) === "1" || String(s.serialNumber) === "128") || filteredStudents[0];
            const parsedReports = (sample.reportsList || "Official EST Score Report")
              .split(/[;\n\r,]+/)
              .map((p) => p.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            return (
              <div className="mx-auto max-w-lg rounded-xl border-2 border-black bg-white p-5 shadow-sm text-black">
                <div className="flex items-center justify-center border-b border-black pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/est-logo.jpg"
                    alt="EST Official Logo"
                    className="h-9 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="font-mono text-3xl font-black text-black shrink-0">
                    ({sample.serialNumber})
                  </div>
                  <div className="flex-1 text-start">
                    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">STUDENT NAME:</div>
                    <div className="text-xl sm:text-2xl font-black text-black leading-tight mt-0.5">
                      {sample.studentName}
                    </div>
                  </div>
                </div>

                <div className="my-3.5 border-t border-black" />

                <div className="text-start">
                  <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">TOTAL REPORTS:</div>
                  <div className="text-lg font-black text-black mt-0.5">
                    {sample.totalReports} {Number(sample.totalReports) === 1 ? "Report" : "Reports"}
                  </div>
                </div>

                <div className="my-3 border-t border-gray-200" />

                <div className="text-start pb-2">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-black mb-2">ENCLOSED SCORE REPORTS:</div>
                  <div className="text-sm font-bold text-black space-y-1.5">
                    {parsedReports.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-black text-base leading-none">•</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {students.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-surface-soft/60 font-semibold text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الرقم التسلسلي" : "Serial No"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "اسم الطالب" : "Candidate Name"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "إجمالي التقارير" : "Total Reports"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "قائمة التقارير" : "Reports List"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "كود التتبع" : "Tracking Code"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الاستلام" : "Received"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((s, idx) => {
                  const key = getStudentReceiptKey(s as StudentWithReceipt, idx);
                  const originalIndex = students.findIndex((st, stIdx) => getStudentReceiptKey(st as StudentWithReceipt, stIdx) === key);
                  const received = Boolean((s as StudentWithReceipt).received);
                  return (
                    <tr key={s.id || idx} className={cn("hover:bg-surface-soft/40 transition-colors", received && "bg-emerald-500/5")}>
                      <td className="px-4 py-2.5 font-mono text-muted">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-slate-900 text-amber-400 px-2 py-0.5 font-mono font-bold text-xs">
                          ({s.serialNumber || idx + 1})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-foreground text-sm">{s.studentName}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 text-xs">
                          {s.totalReports || 1}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground max-w-xs">{s.reportsList || "-"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {s.certificateCode || "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleStudentReceipt(originalIndex >= 0 ? originalIndex : idx)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-colors cursor-pointer",
                            received
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                              : "bg-surface text-foreground border-border hover:border-emerald-500/50 hover:bg-emerald-500/10",
                          )}
                          title={received ? ((s as StudentWithReceipt).receivedAt || "") : ""}
                        >
                          <span>{locale === "ar" ? (received ? "تم الاستلام" : "استلام") : (received ? "Received" : "Receive")}</span>
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

      {previewOpen && pdfPreviewBlobUrl && (
        <StickerPreviewModal
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            if (pdfPreviewBlobUrl) {
              URL.revokeObjectURL(pdfPreviewBlobUrl);
              setPdfPreviewBlobUrl(null);
            }
          }}
          pdfUrl={pdfPreviewBlobUrl}
          title={previewTitle}
          onPrint={handleDirectPrint}
          customTitle={previewTitle}
          customDescription={
            locale === "ar"
              ? "استيكرات تقارير طلاب EST (ربع A4، 4 في كل ورقة) بتصميم بسيط وواضح."
              : "EST student report stickers (Quarter A4, 4 per sheet) with a clean, simple layout."
          }
        />
      )}
    </div>
  );
}
