"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

const DEMO_STUDENTS: CertificateStudentData[] = [
  {
    studentName: "Mohamed Ahmed Ali",
    seatNumber: "10245",
    nationalId: "30501011234567",
    schoolName: "Al Ryada University - Science & Tech",
    governorate: "Menofia",
    examName: "EST I",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0001",
    subjects: "Literacy & Mathematics",
    status: "Passed",
  },
  {
    studentName: "Sarah Mahmoud Hassan",
    seatNumber: "10246",
    nationalId: "30502021234568",
    schoolName: "Al Ryada University - Science & Tech",
    governorate: "Menofia",
    examName: "EST I",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0002",
    subjects: "Literacy & Mathematics",
    status: "Passed",
  },
  {
    studentName: "Youssef Ibrahim Taha",
    seatNumber: "10247",
    nationalId: "30503031234569",
    schoolName: "Cairo International School",
    governorate: "Cairo",
    examName: "EST II",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0003",
    subjects: "Biology & Chemistry",
    status: "Passed",
  },
  {
    studentName: "Nouran Khaled Mostafa",
    seatNumber: "10248",
    nationalId: "30504041234570",
    schoolName: "Cairo International School",
    governorate: "Cairo",
    examName: "EST II",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0004",
    subjects: "Math 1 & Physics",
    status: "Passed",
  },
  {
    studentName: "Omar Abdelrahman Fathy",
    seatNumber: "10249",
    nationalId: "30505051234571",
    schoolName: "Alexandria STEM Center",
    governorate: "Alexandria",
    examName: "EST I",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0005",
    subjects: "Literacy & Mathematics",
    status: "Passed",
  },
  {
    studentName: "Mariam Hany Soliman",
    seatNumber: "10250",
    nationalId: "30506061234572",
    schoolName: "Alexandria STEM Center",
    governorate: "Alexandria",
    examName: "EST I",
    sessionName: "December 2026",
    certificateCode: "CERT-2026-0006",
    subjects: "Literacy & Mathematics",
    status: "Passed",
  },
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-#]+/g, "");
}

function parseStudentsFromSheet(data: any[]): CertificateStudentData[] {
  if (!Array.isArray(data) || data.length === 0) return [];

  const results: CertificateStudentData[] = [];

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    if (!row || typeof row !== "object") continue;

    let studentName = "";
    let seatNumber = "";
    let nationalId = "";
    let schoolName = "";
    let governorate = "";
    let examName = "";
    let sessionName = "";
    let certificateCode = "";
    let subjects = "";
    let score = "";
    let status = "";
    let notes = "";

    for (const [key, rawVal] of Object.entries(row)) {
      if (rawVal === undefined || rawVal === null) continue;
      const val = String(rawVal).trim();
      if (!val) continue;

      const k = normalizeHeader(key);

      // Name mapping
      if (
        k.includes("name") ||
        k.includes("student") ||
        k.includes("طالب") ||
        k.includes("اسم") ||
        k.includes("candidate")
      ) {
        if (!studentName || k.includes("student") || k.includes("طالب")) {
          studentName = val;
        }
      }
      // Seat number mapping
      else if (
        k.includes("seat") ||
        k.includes("جلوس") ||
        k.includes("رقمجلوس") ||
        k.includes("candidateid")
      ) {
        seatNumber = val;
      }
      // National ID mapping
      else if (
        k.includes("national") ||
        k.includes("قومي") ||
        k.includes("nid") ||
        k.includes("بطاقة") ||
        (k === "id" && val.length >= 10)
      ) {
        nationalId = val;
      }
      // School / Center mapping
      else if (
        k.includes("school") ||
        k.includes("مدرسة") ||
        k.includes("center") ||
        k.includes("سنتر") ||
        k.includes("جامعة") ||
        k.includes("univ")
      ) {
        schoolName = val;
      }
      // Governorate / City mapping
      else if (
        k.includes("gov") ||
        k.includes("محافظة") ||
        k.includes("مدينة") ||
        k.includes("city")
      ) {
        governorate = val;
      }
      // Exam name
      else if (
        k.includes("exam") ||
        k.includes("امتحان") ||
        k.includes("level") ||
        k === "est" ||
        k.includes("est1") ||
        k.includes("est2")
      ) {
        examName = val;
      }
      // Session / Cycle
      else if (
        k.includes("session") ||
        k.includes("cycle") ||
        k.includes("دورة") ||
        k.includes("شهر") ||
        k.includes("date")
      ) {
        sessionName = val;
      }
      // Certificate code / serial
      else if (
        k.includes("cert") ||
        k.includes("شهادة") ||
        k.includes("serial") ||
        k.includes("code") ||
        k.includes("كود")
      ) {
        certificateCode = val;
      }
      // Subjects
      else if (
        k.includes("subject") ||
        k.includes("مادة") ||
        k.includes("مواد")
      ) {
        subjects = val;
      }
      // Score
      else if (
        k.includes("score") ||
        k.includes("درجة") ||
        k.includes("total") ||
        k.includes("مجموع")
      ) {
        score = val;
      }
      // Status
      else if (
        k.includes("status") ||
        k.includes("حالة") ||
        k.includes("result") ||
        k.includes("نتيجة")
      ) {
        status = val;
      }
    }

    if (!studentName && !seatNumber) continue;

    results.push({
      id: `row-${idx + 1}`,
      studentName: studentName || `Candidate #${seatNumber || idx + 1}`,
      seatNumber,
      nationalId,
      schoolName,
      governorate,
      examName,
      sessionName,
      certificateCode: certificateCode || (seatNumber ? `EST-${seatNumber}` : `CERT-${idx + 1}`),
      subjects,
      score,
      status,
      notes,
    });
  }

  return results;
}

export default function CertificateStickersPage() {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<CertificateStudentData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [sessionOverride, setSessionOverride] = useState("December 2026");
  const [examOverride, setExamOverride] = useState("EST");

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast.error(locale === "ar" ? "الملف لا يحتوي على أي شيت" : "File contains no sheets");
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        const parsed = parseStudentsFromSheet(rawRows);
        if (parsed.length === 0) {
          toast.error(
            locale === "ar"
              ? "لم يتم العثور على بيانات طلاب صالحة في الشيت. تأكد من وجود عمود اسم الطالب ورقم الجلوس."
              : "No valid student data found. Ensure Student Name or Seat Number columns exist.",
          );
          return;
        }

        setStudents(parsed);
        setFileName(file.name);
        toast.success(
          locale === "ar"
            ? `تم استيراد ${parsed.length} طالب بنجاح من شيت "${file.name}"`
            : `Imported ${parsed.length} candidates from "${file.name}"`,
        );
      } catch (err: any) {
        toast.error((locale === "ar" ? "خطأ في قراءة ملف الإكسيل: " : "Failed to parse Excel file: ") + (err?.message || ""));
      }
    },
    [locale],
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

  const loadDemoData = useCallback(() => {
    setStudents(DEMO_STUDENTS);
    setFileName("EST_Certificates_Demo_Data.xlsx");
    toast.success(locale === "ar" ? "تم تحميل بيانات تجريبية معتمدة لـ 6 طلاب" : "Loaded 6 demo student certificates");
  }, [locale]);

  const clearData = useCallback(() => {
    setStudents([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info(locale === "ar" ? "تم مسح البيانات" : "Cleared certificate data");
  }, [locale]);

  const downloadSampleTemplate = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Student Name": "Mohamed Ahmed Ali",
        "Seat Number": "10245",
        "National ID": "30501011234567",
        "School": "Al Ryada University",
        "Governorate": "Menofia",
        "Exam": "EST I",
        "Session": "December 2026",
        "Certificate Code": "CERT-2026-0001",
        "Subjects": "Literacy & Mathematics",
        "Status": "Passed",
      },
      {
        "Student Name": "Sarah Mahmoud Hassan",
        "Seat Number": "10246",
        "National ID": "30502021234568",
        "School": "Cairo Modern High School",
        "Governorate": "Cairo",
        "Exam": "EST II",
        "Session": "December 2026",
        "Certificate Code": "CERT-2026-0002",
        "Subjects": "Biology & Chemistry",
        "Status": "Passed",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Certificate Candidates");
    XLSX.writeFile(wb, "EST_Certificate_Stickers_Template.xlsx");
    toast.success(locale === "ar" ? "تم تنزيل نموذج الإكسيل التجريبي" : "Downloaded Excel template");
  }, [locale]);

  // Filtering
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedSchool !== "all") {
      list = list.filter((s) => s.schoolName === selectedSchool);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          (s.seatNumber && s.seatNumber.toLowerCase().includes(q)) ||
          (s.nationalId && s.nationalId.toLowerCase().includes(q)) ||
          (s.certificateCode && s.certificateCode.toLowerCase().includes(q)) ||
          (s.schoolName && s.schoolName.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [students, selectedSchool, searchQuery]);

  const uniqueSchools = useMemo(() => {
    const s = new Set<string>();
    students.forEach((item) => {
      if (item.schoolName) s.add(item.schoolName);
    });
    return Array.from(s).sort();
  }, [students]);

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
        sessionName: sessionOverride,
        examName: examOverride,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || (locale === "ar" ? "فشل إنشاء ملف PDF" : "Failed to generate PDF"));
    }

    return await res.blob();
  }, [filteredStudents, sessionOverride, examOverride, locale]);

  const handlePreviewPdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewBlobUrl(url);
      setPreviewTitle(
        locale === "ar"
          ? `معاينة استيكرات الشهادات (${filteredStudents.length} طالب - ${totalSheetsA4} ورقة A4)`
          : `Certificate Stickers Preview (${filteredStudents.length} students - ${totalSheetsA4} A4 sheets)`,
      );
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [fetchPdfBlob, filteredStudents.length, totalSheetsA4, locale]);

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
      a.download = `EST_Certificate_Stickers_${filteredStudents.length}_Candidates.pdf`;
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
  }, [fetchPdfBlob, filteredStudents.length, locale]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Award className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {locale === "ar" ? "ستيكر الشهادات (ربع A4)" : "Certificate Stickers (Quarter A4)"}
              </h1>
              <p className="text-xs text-muted">
                {locale === "ar"
                  ? "ارفع ملف إكسيل ببيانات شهادات الطلاب لتوليد وطباعة استيكرات ربع A4 الرسمية لجميع الطلاب فوراً."
                  : "Upload student certificate Excel sheet to generate and print official Quarter-A4 certificate placards."}
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

          <Button
            variant="secondary"
            onClick={loadDemoData}
            className="cursor-pointer gap-1.5 text-xs h-8 px-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
          >
            <Sparkles className="size-3.5" />
            <span>{locale === "ar" ? "بيانات تجريبية" : "Load Demo"}</span>
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

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
          students.length > 0
            ? "border-emerald-500/40 bg-emerald-500/[0.02] hover:border-emerald-500/70"
            : "border-border hover:border-emerald-500 hover:bg-emerald-500/[0.02]",
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

        <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
          <FileSpreadsheet className="size-7" />
        </div>

        <h3 className="text-base font-bold text-foreground">
          {fileName ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              {fileName} ({students.length} {locale === "ar" ? "طالب" : "candidates"})
            </span>
          ) : locale === "ar" ? (
            "اسحب وأفلت شيت الإكسيل هنا، أو اضغط للاختيار من جهازك"
          ) : (
            "Drag & drop certificates Excel sheet here, or click to browse"
          )}
        </h3>

        <p className="mt-1 text-xs text-muted max-w-md">
          {locale === "ar"
            ? "يدعم صيغ .xlsx و .xls و .csv مع التعرف التلقائي الذكي على أسماء الأعمدة (اسم الطالب، رقم الجلوس، الرقم القومي، المدرسة، المحافظة)."
            : "Supports .xlsx, .xls, .csv with intelligent auto-column detection for Name, Seat No, National ID, School, and Governorate."}
        </p>
      </div>

      {/* KPI Cards when data loaded */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "إجمالي الطلاب" : "Total Candidates"}</span>
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">{filteredStudents.length}</div>
            <div className="text-[10px] text-muted">
              {filteredStudents.length !== students.length && (
                <span>
                  {locale === "ar" ? `من إجمالي ${students.length}` : `of ${students.length} total`}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "أوراق A4 للطباعة" : "A4 Print Sheets"}</span>
              <Award className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{totalSheetsA4}</div>
            <div className="text-[10px] text-muted">
              {locale === "ar" ? "4 استيكرات في كل ورقة A4" : "4 quarter-A4 stickers per sheet"}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "المدارس / السناتر" : "Schools / Centers"}</span>
              <FileUp className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">{uniqueSchools.length}</div>
            <div className="text-[10px] text-muted">
              {locale === "ar" ? "توزيع جغرافي معتمد" : "Official centers"}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{locale === "ar" ? "الدورة / الامتحان" : "Session & Exam"}</span>
              <Award className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <input
                type="text"
                value={sessionOverride}
                onChange={(e) => setSessionOverride(e.target.value)}
                placeholder="December 2026"
                className="w-full rounded bg-surface px-1.5 py-0.5 text-xs font-bold text-foreground border border-border"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      {students.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === "ar" ? "بحث بالاسم، رقم الجلوس، المدرسة..." : "Search name, seat, school..."}
                className="ps-8 text-xs h-9"
              />
            </div>

            {uniqueSchools.length > 1 && (
              <div className="flex items-center gap-1">
                <Filter className="size-3.5 text-muted" />
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">{locale === "ar" ? "كل المدارس" : "All Schools"}</option>
                  {uniqueSchools.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              className="cursor-pointer gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
            >
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
              <span>{locale === "ar" ? "طباعة مباشرة لجميع الاستيكرات" : "Print All Stickers"}</span>
            </Button>
          </div>
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
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "اسم الطالب" : "Candidate Name"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "رقم الجلوس" : "Seat No"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "الرقم القومي" : "National ID"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "المدرسة / السنتر" : "School / Center"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "المحافظة" : "Governorate"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "كود الشهادة" : "Cert Code"}</th>
                  <th className="px-4 py-3 text-start">{locale === "ar" ? "المواد / الحالة" : "Subjects / Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-muted">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-foreground">{s.studentName}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {s.seatNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted">{s.nationalId || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground">{s.schoolName || "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{s.governorate || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {s.certificateCode || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {s.subjects && (
                          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-700 dark:text-sky-300">
                            {s.subjects}
                          </span>
                        )}
                        {s.status && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            {s.status}
                          </span>
                        )}
                      </div>
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
              ? `استيكرات شهادات طلاب EST رسمية مقاس ربع A4 (4 استيكرات في الورقة) — جاهزة للطباعة الفورية على ورق لاصق.`
              : `Official EST Quarter-A4 Student Certificate Placards (4 per A4 sheet) ready for immediate sticker printing.`
          }
        />
      )}
    </div>
  );
}
