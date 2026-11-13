"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  Filter,
  Layers,
  Loader2,
  Package,
  Printer,
  RefreshCw,
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

const INITIAL_FALLBACK_STUDENTS: CertificateStudentData[] = [
  {
    serialNumber: "128",
    studentName: "يارا رمضان يوسف ابو الخير",
    totalReports: 2,
    reportsList: "يناير 2026 - EST I، ومارس 2026 - EST II",
    seatNumber: "10245",
    nationalId: "30501011234567",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Cairo",
    certificateCode: "EST-REP-0128",
    batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
  },
  {
    serialNumber: "129",
    studentName: "مريم أحمد محمد عبد الفتاح",
    totalReports: 1,
    reportsList: "أكتوبر 2026 - EST I",
    seatNumber: "10246",
    nationalId: "30502021234568",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Giza",
    certificateCode: "EST-REP-0129",
    batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
  },
  {
    serialNumber: "130",
    studentName: "أحمد خالد مصطفى الشناوي",
    totalReports: 3,
    reportsList: "مايو 2025 - EST I، يناير 2026 - EST II، مارس 2026 - EST II",
    seatNumber: "10247",
    nationalId: "30503031234569",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Alexandria",
    certificateCode: "EST-REP-0130",
    batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
  },
  {
    serialNumber: "131",
    studentName: "نور الدين إبراهيم حسن السعدني",
    totalReports: 2,
    reportsList: "أكتوبر 2025 - EST I، ديسمبر 2026 - EST I",
    seatNumber: "10248",
    nationalId: "30504041234570",
    schoolName: "Online Portal Direct Candidate",
    governorate: "Menofia",
    certificateCode: "EST-REP-0131",
    batchName: "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
  },
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-#:()]+/g, "");
}

function parseSmartSheet(rawRows: any[][], defaultBatchName: string): CertificateStudentData[] {
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

  const results: CertificateStudentData[] = [];

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
      if (h.includes("namear") || h.includes("اسم")) {
        nameAr = v;
      } else if (h.includes("nameen") || h.includes("name") || h.includes("student")) {
        if (!nameEn) nameEn = v;
      }
      if (h.includes("national") || h.includes("قومي")) nationalId = v;
      if (h.includes("totalreport") || h.includes("nbofreport") || h.includes("اجمالي")) totalReports = v;
      if (h.includes("reportlist") || h.includes("قائمة") || h.includes("reports")) reportList = v;
      if (h.includes("school") || h.includes("مدرسة")) school = v;
      if (h.includes("governorate") || h.includes("محافظة") || h.includes("city")) gov = v;
      if (h.includes("requestid") || h.includes("كود")) reqId = v;
      if (h.includes("batch") || h.includes("باتش")) batchName = v;
    });

    const studentName = nameAr || nameEn;
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
    });
  }

  return results;
}

export default function CertificateStickersPage() {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeBatchId, setActiveBatchId] = useState<string>("batch-1");
  const [customBatchName, setCustomBatchName] = useState<string>(BATCH_PRESETS[0].name);

  const [students, setStudents] = useState<CertificateStudentData[]>(INITIAL_FALLBACK_STUDENTS);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  const activeBatch = useMemo(() => {
    return BATCH_PRESETS.find((b) => b.id === activeBatchId);
  }, [activeBatchId]);

  // Load batch data from API on batch switch
  const fetchBatchData = useCallback(
    async (batchId: string) => {
      try {
        setLoadingBatch(true);
        const res = await fetch(`/api/certificates/official-batches?batchId=${batchId}`);
        if (!res.ok) throw new Error("Failed to load batch");
        const data = await res.json();
        if (Array.isArray(data.students) && data.students.length > 0) {
          setStudents(data.students);
          setCustomBatchName(data.batchName || BATCH_PRESETS.find((b) => b.id === batchId)?.name || "");
          setUploadedFileName(null);
          toast.success(
            locale === "ar"
              ? `تم تحميل ${data.students.length} استيكر لـ "${data.batchName}"`
              : `Loaded ${data.students.length} stickers for "${data.batchName}"`,
          );
        } else {
          // Fallback to presets
          setStudents(INITIAL_FALLBACK_STUDENTS);
        }
      } catch {
        setStudents(INITIAL_FALLBACK_STUDENTS);
      } finally {
        setLoadingBatch(false);
      }
    },
    [locale],
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
      }
    },
    [fetchBatchData],
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
          toast.error(locale === "ar" ? "الملف لا يحتوي على أي شيت" : "File contains no sheets");
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const currentBatch = activeBatch?.name || customBatchName;
        const parsed = parseSmartSheet(rawRows, currentBatch);
        if (parsed.length === 0) {
          toast.error(
            locale === "ar"
              ? "لم يتم العثور على بيانات طلاب صالحة في الشيت. تأكد من وجود عمود اسم الطالب أو الرقم."
              : "No valid student data found. Ensure Student Name or Serial columns exist.",
          );
          return;
        }

        setStudents(parsed);
        setUploadedFileName(file.name);
        toast.success(
          locale === "ar"
            ? `تم استيراد ${parsed.length} طالب بنجاح من شيت "${file.name}"`
            : `Imported ${parsed.length} candidates from "${file.name}"`,
        );
      } catch (err: any) {
        toast.error((locale === "ar" ? "خطأ في قراءة ملف الإكسيل: " : "Failed to parse Excel file: ") + (err?.message || ""));
      }
    },
    [activeBatch, customBatchName, locale],
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
    toast.info(locale === "ar" ? "تم مسح البيانات" : "Cleared data");
  }, [locale]);

  const downloadSampleTemplate = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "رقم (Serial)": "128",
        "اسم الطالبة (Candidate Name)": "يارا رمضان يوسف ابو الخير",
        "إجمالي التقارير (Total reports)": 2,
        "قائمة التقارير (Reports list)": "يناير 2026 - EST I، ومارس 2026 - EST II",
        "رقم الجلوس (Seat No)": "10245",
        "الرقم القومي (National ID)": "30501011234567",
        "الدفعة (Batch)": activeBatch?.name || "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
      },
      {
        "رقم (Serial)": "129",
        "اسم الطالبة (Candidate Name)": "مريم أحمد محمد عبد الفتاح",
        "إجمالي التقارير (Total reports)": 1,
        "قائمة التقارير (Reports list)": "أكتوبر 2026 - EST I",
        "رقم الجلوس (Seat No)": "10246",
        "الرقم القومي (National ID)": "30502021234568",
        "الدفعة (Batch)": activeBatch?.name || "Aramex-Official_Report-Batch 1 Online - 07.11.2026",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EST Score Report Stickers");
    XLSX.writeFile(wb, `EST_Report_Stickers_Template_${activeBatchId}.xlsx`);
    toast.success(locale === "ar" ? "تم تنزيل نموذج الإكسيل التجريبي" : "Downloaded Excel template");
  }, [activeBatch, activeBatchId, locale]);

  // Filtering
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

  // Generate PDF
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
      toast.success(locale === "ar" ? "جاري تحضير أمر الطباعة..." : "Preparing print job...");
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
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {locale === "ar" ? "ستيكر الشهادات وتقارير الطلاب" : "Certificate & Report Stickers"}
                </h1>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {locale === "ar" ? "ربع A4" : "Quarter A4"}
                </span>
              </div>
              <p className="text-xs text-muted">
                {locale === "ar"
                  ? "توليد وطباعة استيكرات تقارير شهادات EST لباتشات الشحن (Aramex Online و MoE Delivery) بمقاس ربع A4 بتصميم مبسط وواضح بالبيانات الأساسية."
                  : "Generate & print official EST student report stickers (Quarter A4) for Aramex Online & MoE Delivery batches in a clean, clear format."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={downloadSampleTemplate}
            className="cursor-pointer gap-1.5 text-xs h-8 px-3"
          >
            <Download className="size-3.5" />
            <span>{locale === "ar" ? "نموذج إكسيل تجريبي" : "Sample Template"}</span>
          </Button>

          {students.length > 0 && (
            <Button
              variant="danger"
              onClick={clearData}
              className="cursor-pointer gap-1.5 text-xs h-8 px-3"
            >
              <Trash2 className="size-3.5" />
              <span>{locale === "ar" ? "مسح" : "Clear"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Two Batch Selector Tabs (The 2 Batches Requested!) */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {locale === "ar" ? "اختر الباتش المراد طباعة استيكراته:" : "Select Active Batch for Stickers:"}
            </span>
          </div>
          <div className="text-[11px] font-medium text-muted">
            {locale === "ar"
              ? "البيانات الرسمية للدفعتين جاهزة ومحملة تلقائياً بالكامل"
              : "Official data for both batches are preloaded and ready to print"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2">
                          {locale === "ar" ? "النشط" : "Active"}
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
                  <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                    {isSelected && loadingBatch ? (
                      <Loader2 className="size-3 animate-spin inline me-1" />
                    ) : null}
                    {isSelected ? `${students.length} استيكر جاهز` : "اضغط للتحميل"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Zone */}
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
            `اسحب وأفلت شيت إكسيل لـ "${activeBatch?.shortName || "الباتش الحالي"}" هنا أو اضغط للتصفح`
          ) : (
            `Drop Excel sheet for "${activeBatch?.shortName || "Current Batch"}" here, or click to browse`
          )}
        </h3>

        <p className="mt-1 text-xs text-muted max-w-md">
          {locale === "ar"
            ? "يتعرف تلقائياً على الأعمدة: رقم المسلسل (128)، اسم الطالبة بالعربي، إجمالي التقارير، وقائمة التقارير."
            : "Auto-detects: Serial No (128), Student Name in Arabic, Total Reports, and Reports List."}
        </p>
      </div>

      {/* KPI Cards when data loaded */}
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
            <div className="text-[10px] text-muted">
              {locale === "ar" ? "4 استيكرات ربع A4 في الورقة" : "4 quarter-A4 stickers per sheet"}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "الدفعة الحالية" : "Active Batch"}</span>
              <Truck className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="mt-1.5 text-xs font-bold text-foreground line-clamp-2" title={customBatchName}>
              {activeBatch?.shortName || customBatchName}
            </div>
            <div className="text-[10px] text-muted">{activeBatch?.date || "Nov 2026"}</div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "شكل الاستيكر" : "Sticker Format"}</span>
              <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-1 text-xs font-bold text-foreground">
              {locale === "ar" ? "تصميم مبسط وأنيق" : "Clean Simple Layout"}
            </div>
            <div className="text-[10px] text-muted">
              {locale === "ar" ? "بيانات أساسية + خط واضح" : "Essential Data + Clear Font"}
            </div>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      {students.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "ar" ? "بحث برقم المسلسل (128)، اسم الطالبة، أو التقرير..." : "Search serial #128, student name, or report..."}
              className="ps-8 text-xs h-9"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePreviewPdf}
              disabled={isGenerating || filteredStudents.length === 0}
              className="cursor-pointer gap-1.5 text-xs font-semibold h-8 px-3"
            >
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5 text-accent" />}
              <span>{locale === "ar" ? "معاينة الاستيكرات PDF" : "Preview PDF"}</span>
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
              <span>{locale === "ar" ? "طباعة مباشرة لجميع الاستيكرات" : "Print All Stickers"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Example Preview Card as requested by User */}
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
              {locale === "ar" ? "مطابق تماماً لمواصفات EST الرسمية" : "Matches official EST specifications"}
            </span>
          </div>

          {/* Realistic Card Simulation - Clean Light Header & Simple Layout */}
          {(() => {
            const sample = filteredStudents.find((s) => String(s.serialNumber) === "128") || filteredStudents[0];
            return (
              <div className="mx-auto max-w-lg rounded-xl border-2 border-black bg-white p-5 shadow-sm text-black">
                {/* Header: Clean Light Background with Crisp Badge (No Heavy Black Bar, No 79/306) */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-black">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-black px-2 py-0.5 text-xs font-black text-white tracking-wider">
                      EST
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-black tracking-wide">
                        OFFICIAL SCORE REPORT & CERTIFICATE
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono line-clamp-1 uppercase">
                        {sample.batchName || activeBatch?.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Serial and Candidate Name Row (Properly aligned, generous spacing, clear font) */}
                <div className="mt-5 flex items-center gap-4">
                  <div className="font-mono text-3xl font-black text-black shrink-0">
                    ({sample.serialNumber})
                  </div>
                  <div className="flex-1 text-start">
                    <div className="text-xs font-bold text-gray-500 mb-0.5">
                      اسم الطالب / الطالبة:
                    </div>
                    <div className="text-2xl font-black text-black leading-tight">
                      {sample.studentName}
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="my-4 border-t border-black" />

                {/* Reports Summary Row: Only Total Reports (Tracking ID removed) */}
                <div className="text-start">
                  <div className="text-xs font-bold text-gray-500 uppercase">
                    إجمالي التقارير / TOTAL REPORTS:
                  </div>
                  <div className="text-lg font-black text-black mt-0.5">
                    {sample.totalReports} {Number(sample.totalReports) === 1 ? "Report" : "Reports"}
                  </div>
                </div>

                {/* Divider Line */}
                <div className="my-3 border-t border-gray-200" />

                {/* Reports List */}
                <div className="text-start pb-2">
                  <div className="text-xs font-bold uppercase text-black mb-1.5">
                    قائمة التقارير / ENCLOSED SCORE REPORTS:
                  </div>
                  <div className="text-sm font-bold text-black leading-relaxed space-y-1">
                    {(sample.reportsList || "Official EST Score Report").split(/[;؛،,]/).map((p, i) => (
                      <div key={i} className="py-0.5">
                        • {p.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Students Table */}
      {students.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-surface-soft/60 font-semibold text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الرقم المسلسل" : "Serial No"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "اسم الطالبة / الطالب" : "Candidate Name"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "إجمالي التقارير" : "Total Reports"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "قائمة التقارير" : "Reports List"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "كود التتبع" : "Tracking Code"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-surface-soft/40 transition-colors">
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
                    <td className="px-4 py-2.5 text-foreground max-w-xs">{s.reportsList || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {s.certificateCode || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
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
              ? `استيكرات شهادات وتقارير طلاب EST رسمية مقاس ربع A4 (4 استيكرات في كل ورقة A4) بتصميم مبسط وخط واضح بالبيانات الأساسية.`
              : `Official EST Student Report Placards (Quarter A4, 4 per sheet) with clean simple typography and essential data only.`
          }
        />
      )}
    </div>
  );
}
