"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  Loader2,
  Package,
  Printer,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import type { StudentWithReceipt } from "@/lib/certificates-parser";
import type { CertificateStudentData } from "@/lib/stickers/certificate-stickers-pdf";

interface BoxManifestDialogProps {
  open: boolean;
  onClose: () => void;
  students: StudentWithReceipt[];
  batchName?: string;
  isAramex?: boolean;
  onPreviewPdf: (url: string, title: string) => void;
}

export function BoxManifestDialog({
  open,
  onClose,
  students,
  batchName = "EST Certificates Batch",
  isAramex = false,
  onPreviewPdf,
}: BoxManifestDialogProps) {
  const { locale } = useI18n();

  // Box size: default 100 certificates per box
  const [boxSize, setBoxSize] = useState<number>(100);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number>(0);

  // Custom range controls
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<number>(1);
  const [customTo, setCustomTo] = useState<number>(100);

  // Orientation
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  // Loading states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<"preview" | "print" | "download" | "all" | null>(null);

  const totalCount = students.length;

  // Calculate smart boxes
  const boxes = useMemo(() => {
    if (totalCount === 0 || boxSize <= 0) return [];
    const list: Array<{
      boxNumber: number;
      fromRow: number;
      toRow: number;
      count: number;
      labelAr: string;
      labelEn: string;
    }> = [];

    let start = 1;
    let boxNum = 1;

    while (start <= totalCount) {
      const end = Math.min(start + boxSize - 1, totalCount);
      const count = end - start + 1;
      list.push({
        boxNumber: boxNum,
        fromRow: start,
        toRow: end,
        count,
        labelAr: `كرتونة ${boxNum}: من صف ${start} إلى ${end} (${count} شهادة)`,
        labelEn: `Box ${boxNum}: Rows ${start} to ${end} (${count} certs)`,
      });
      start = end + 1;
      boxNum++;
    }

    return list;
  }, [totalCount, boxSize]);

  // Determine active slice (fromRow and toRow)
  const activeRange = useMemo(() => {
    if (useCustomRange) {
      const validFrom = Math.max(1, Math.min(customFrom || 1, totalCount));
      const validTo = Math.max(validFrom, Math.min(customTo || totalCount, totalCount));
      return {
        fromRow: validFrom,
        toRow: validTo,
        boxNumber: undefined,
        label: locale === "ar" ? `نطاق مخصص (من ${validFrom} إلى ${validTo})` : `Custom Range (${validFrom} - ${validTo})`,
      };
    }

    const currentBox = boxes[activeBoxIndex] || boxes[0];
    if (!currentBox) {
      return { fromRow: 1, toRow: totalCount, boxNumber: 1, label: "" };
    }

    return {
      fromRow: currentBox.fromRow,
      toRow: currentBox.toRow,
      boxNumber: currentBox.boxNumber,
      label: locale === "ar" ? currentBox.labelAr : currentBox.labelEn,
    };
  }, [useCustomRange, customFrom, customTo, boxes, activeBoxIndex, totalCount, locale]);

  // Slice of students for the active box/range
  const slicedStudents = useMemo(() => {
    if (totalCount === 0) return [];
    const startIdx = activeRange.fromRow - 1;
    const endIdx = activeRange.toRow;
    return students.slice(startIdx, endIdx);
  }, [students, activeRange, totalCount]);

  // Total reports in this box
  const boxTotalReports = useMemo(() => {
    return slicedStudents.reduce((sum, s) => {
      const n = Number(s.totalReports);
      return sum + (Number.isFinite(n) && n > 0 ? n : 1);
    }, 0);
  }, [slicedStudents]);

  // Fetch Box Manifest PDF Blob
  const fetchBoxManifestPdfBlob = async (targetStudents: StudentWithReceipt[], boxNum?: number, from?: number, to?: number): Promise<Blob> => {
    const res = await fetch("/api/certificates/box-manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        students: targetStudents,
        batchName,
        boxNumber: boxNum,
        boxLabel: boxNum ? `BOX #${boxNum} (ROWS ${from} - ${to})` : `ROWS ${from} - ${to}`,
        fromRow: from,
        toRow: to,
        totalStudentsInBatch: totalCount,
        orientation,
        isAramex,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate box manifest PDF");
    }

    return await res.blob();
  };

  // Preview action
  const handlePreview = async () => {
    if (slicedStudents.length === 0) {
      toast.error(locale === "ar" ? "لا توجد شهادات في النطاق المحدد" : "No certificates in selected range");
      return;
    }

    try {
      setIsGenerating(true);
      setActiveAction("preview");
      const blob = await fetchBoxManifestPdfBlob(
        slicedStudents,
        activeRange.boxNumber,
        activeRange.fromRow,
        activeRange.toRow,
      );
      const url = URL.createObjectURL(blob);
      const title = `${batchName} - ${activeRange.label}`;
      onPreviewPdf(url, title);
      onClose();
    } catch (err: any) {
      toast.error(err.message || (locale === "ar" ? "فشل إنشاء كشف الكرتونة" : "Failed to generate box manifest"));
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  // Direct print action
  const handleDirectPrint = async () => {
    if (slicedStudents.length === 0) {
      toast.error(locale === "ar" ? "لا توجد شهادات في النطاق المحدد" : "No certificates in selected range");
      return;
    }

    try {
      setIsGenerating(true);
      setActiveAction("print");
      const blob = await fetchBoxManifestPdfBlob(
        slicedStudents,
        activeRange.boxNumber,
        activeRange.fromRow,
        activeRange.toRow,
      );
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
      toast.success(locale === "ar" ? "تم إرسال كشف الكرتونة للطباعة" : "Box manifest sent to printer");
    } catch (err: any) {
      toast.error(err.message || (locale === "ar" ? "فشل طباعة كشف الكرتونة" : "Failed to print box manifest"));
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    if (slicedStudents.length === 0) return;

    try {
      setIsGenerating(true);
      setActiveAction("download");
      const blob = await fetchBoxManifestPdfBlob(
        slicedStudents,
        activeRange.boxNumber,
        activeRange.fromRow,
        activeRange.toRow,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tag = activeRange.boxNumber ? `Box_${activeRange.boxNumber}` : `Rows_${activeRange.fromRow}-${activeRange.toRow}`;
      a.download = `EST_Box_Manifest_${tag}_${batchName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(locale === "ar" ? "تم تحميل كشف الكرتونة بنجاح" : "Box manifest downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || (locale === "ar" ? "فشل تحميل الكشف" : "Failed to download manifest"));
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  // Print all boxes sequentially
  const handlePrintAllBoxes = async () => {
    if (boxes.length === 0) return;

    try {
      setIsGenerating(true);
      setActiveAction("all");
      const toastId = toast.loading(
        locale === "ar" ? `جاري تجهيز كشوفات جميع الكراتين (${boxes.length} كرتونة)...` : `Preparing all box manifests (${boxes.length} boxes)...`,
      );

      // Generate a master PDF with all students divided with manifest headers
      const blob = await fetchBoxManifestPdfBlob(
        students,
        undefined,
        1,
        totalCount,
      );
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

      toast.success(locale === "ar" ? "تم إرسال كشوفات جميع الكراتين للطباعة بنجاح" : "All box manifests sent to printer", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || (locale === "ar" ? "فشل طباعة الكشوفات" : "Failed to print manifests"));
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={locale === "ar" ? "تقسيم الباتش وكشف محتويات الكرتونة (جدول)" : "Box Packing Manifest & Batch Splitting"}
      description={
        locale === "ar"
          ? `قم باختيار الكرتونة أو تحديد نطاق الصفوف (مثلاً من 1 إلى 100) لطباعة كشف تفصيلي بمحتويات الكرتونة من شهادات وتقارير.`
          : `Select a box or custom row range (e.g. 1 to 100) to print a detailed packing manifest table of the box's certificates.`
      }
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-2 border-t border-border/60">
          <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePreview}
              disabled={isGenerating || slicedStudents.length === 0}
              className="gap-1.5 cursor-pointer text-xs font-bold border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 h-8.5 px-3"
            >
              {isGenerating && activeAction === "preview" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5 text-indigo-600" />
              )}
              <span>{locale === "ar" ? "معاينة الكشف (PDF)" : "Preview Manifest"}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={isGenerating || slicedStudents.length === 0}
              className="gap-1.5 cursor-pointer text-xs font-semibold h-8.5 px-3"
            >
              {isGenerating && activeAction === "download" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span>{locale === "ar" ? "تنزيل PDF" : "Download PDF"}</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleDirectPrint}
              disabled={isGenerating || slicedStudents.length === 0}
              className="gap-1.5 cursor-pointer text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8.5 px-4"
            >
              {isGenerating && activeAction === "print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {locale === "ar"
                  ? `طباعة كشف الكرتونة (${slicedStudents.length} شهادة)`
                  : `Print Box Manifest (${slicedStudents.length} certs)`}
              </span>
            </Button>

            {boxes.length > 1 && (
              <Button
                variant="primary"
                onClick={handlePrintAllBoxes}
                disabled={isGenerating}
                className="gap-1.5 cursor-pointer text-xs font-bold bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white shadow-sm h-8.5 px-3"
                title={locale === "ar" ? `طباعة جميع الكراتين (${boxes.length} كرتونة) دفعة واحدة` : "Print all boxes at once"}
              >
                {isGenerating && activeAction === "all" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Layers className="size-3.5" />
                )}
                <span>
                  {locale === "ar"
                    ? `طباعة الكل (${boxes.length} كرتونة)`
                    : `Print All (${boxes.length} Boxes)`}
                </span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Top Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-soft/60">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Package className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-muted block">
                {locale === "ar" ? "إجمالي شهادات الشيت" : "Total Candidates in Batch"}
              </span>
              <span className="text-base font-black text-foreground">
                {totalCount} {locale === "ar" ? "طالب / شهادة" : "candidates"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-soft/60">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Boxes className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-muted block">
                {locale === "ar" ? "سعة الكرتونة الواحدة" : "Certificates Per Box"}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="10"
                  value={boxSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) {
                      setBoxSize(val);
                      setActiveBoxIndex(0);
                    }
                  }}
                  className="w-20 px-2 py-0.5 text-xs font-bold border border-border rounded-lg bg-surface text-foreground"
                />
                <span className="text-xs text-muted font-bold">
                  ({boxes.length} {locale === "ar" ? "كرتونة" : "boxes"})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-soft/60">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-muted block">
                {locale === "ar" ? "محتويات الكرتونة المحددة" : "Selected Box Summary"}
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                {slicedStudents.length} {locale === "ar" ? "طالب" : "students"} • {boxTotalReports} {locale === "ar" ? "تقرير شهادة" : "reports"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Choose Smart Box / Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Boxes className="size-3.5 text-indigo-600" />
              <span>{locale === "ar" ? "اختر الكرتونة المطلوبة (تقسيم تلقائي):" : "Select Box (Automatic Split):"}</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setUseCustomRange(!useCustomRange);
                if (!useCustomRange) {
                  setCustomFrom(activeRange.fromRow);
                  setCustomTo(activeRange.toRow);
                }
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {useCustomRange
                ? (locale === "ar" ? "العودة للكراتين التلقائية" : "Use Preset Boxes")
                : (locale === "ar" ? "تحديد نطاق يدوي مخصص (من/إلى)" : "Custom Row Range")}
            </button>
          </div>

          {!useCustomRange ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {boxes.map((b, idx) => {
                const isSelected = activeBoxIndex === idx;
                return (
                  <button
                    key={b.boxNumber}
                    type="button"
                    onClick={() => setActiveBoxIndex(idx)}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-start transition-all cursor-pointer relative shadow-2xs",
                      isSelected
                        ? "border-indigo-600 bg-indigo-500/10 ring-2 ring-indigo-500/25 font-bold"
                        : "border-border bg-surface hover:bg-surface-soft/80",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-foreground flex items-center gap-1">
                        <Package className="size-3.5 text-indigo-600" />
                        {locale === "ar" ? `كرتونة ${b.boxNumber}` : `Box #${b.boxNumber}`}
                      </span>
                      {isSelected && <Check className="size-3.5 text-indigo-600" />}
                    </div>
                    <span className="text-[11px] text-muted font-semibold mt-1">
                      {locale === "ar" ? `الصفوف ${b.fromRow} إلى ${b.toRow}` : `Rows ${b.fromRow} - ${b.toRow}`}
                    </span>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold mt-0.5">
                      {b.count} {locale === "ar" ? "شهادة" : "certificates"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Custom Range Inputs */
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {locale === "ar" ? "حدد نطاق أرقام الصفوف المراد طباعتها في الكشف:" : "Specify Custom Row Range for Manifest:"}
                </span>
                <span className="text-[11px] text-muted">
                  {locale === "ar" ? `الحد الأقصى: ${totalCount} صف` : `Max: ${totalCount} rows`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">{locale === "ar" ? "من صف:" : "From Row:"}</span>
                  <input
                    type="number"
                    min="1"
                    max={totalCount}
                    value={customFrom}
                    onChange={(e) => setCustomFrom(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 text-xs font-bold border border-border rounded-lg bg-surface text-foreground"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">{locale === "ar" ? "إلى صف:" : "To Row:"}</span>
                  <input
                    type="number"
                    min={customFrom}
                    max={totalCount}
                    value={customTo}
                    onChange={(e) => setCustomTo(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 text-xs font-bold border border-border rounded-lg bg-surface text-foreground"
                  />
                </div>

                {/* Quick 100 Presets */}
                <div className="flex items-center gap-1.5 ms-auto">
                  <button
                    type="button"
                    onClick={() => { setCustomFrom(1); setCustomTo(Math.min(100, totalCount)); }}
                    className="px-2 py-1 text-[11px] font-semibold border border-border rounded-md hover:bg-surface"
                  >
                    1 - 100
                  </button>
                  {totalCount > 100 && (
                    <button
                      type="button"
                      onClick={() => { setCustomFrom(101); setCustomTo(Math.min(200, totalCount)); }}
                      className="px-2 py-1 text-[11px] font-semibold border border-border rounded-md hover:bg-surface"
                    >
                      101 - 200
                    </button>
                  )}
                  {totalCount > 200 && (
                    <button
                      type="button"
                      onClick={() => { setCustomFrom(201); setCustomTo(Math.min(300, totalCount)); }}
                      className="px-2 py-1 text-[11px] font-semibold border border-border rounded-md hover:bg-surface"
                    >
                      201 - 300
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Orientation Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-soft/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              {locale === "ar" ? "اتجاه ورقة الكشف (Orientation):" : "Manifest Page Orientation:"}
            </span>
            <span className="text-[11px] text-muted hidden sm:inline">
              {locale === "ar" ? "(الطباعة بالعرض تعطي مساحة كافية لكافة الأعمدة)" : "(Landscape provides maximum room for columns)"}
            </span>
          </div>

          <div className="inline-flex items-center rounded-lg border border-border p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                orientation === "landscape"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted hover:text-foreground",
              )}
            >
              {locale === "ar" ? "بالعرض (Landscape)" : "Landscape"}
            </button>
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                orientation === "portrait"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted hover:text-foreground",
              )}
            >
              {locale === "ar" ? "بالطول (Portrait)" : "Portrait"}
            </button>
          </div>
        </div>

        {/* Section 3: Live Preview Table of the Selected Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileSpreadsheet className="size-3.5 text-indigo-600" />
              <span>
                {locale === "ar"
                  ? `معاينة بيانات الكرتونة (${slicedStudents.length} طالب):`
                  : `Box Contents Preview (${slicedStudents.length} candidates):`}
              </span>
            </span>
            <span className="text-[11px] text-muted">
              {activeRange.label}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-border bg-surface-soft/80 font-bold text-muted sticky top-0 z-10">
                  <tr>
                    <th className="w-10 px-2.5 py-2 text-center">#</th>
                    <th className="w-16 px-2.5 py-2 text-start">{locale === "ar" ? "الرقم" : "Serial"}</th>
                    <th className="px-3 py-2 text-start">{locale === "ar" ? "اسم الطالب (إنجليزي)" : "Student Name (En)"}</th>
                    <th className="px-3 py-2 text-start">{locale === "ar" ? "اسم الطالب (عربي)" : "Student Name (Ar)"}</th>
                    <th className="w-16 px-2.5 py-2 text-center">{locale === "ar" ? "التقارير" : "Reports"}</th>
                    <th className="px-3 py-2 text-start">{locale === "ar" ? "قائمة التقارير والمحاولات" : "Reports List"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {slicedStudents.slice(0, 15).map((s, idx) => {
                    const rowNum = activeRange.fromRow + idx;
                    return (
                      <tr key={s.id || idx} className="hover:bg-surface-soft/40 transition-colors">
                        <td className="px-2.5 py-1.5 text-center font-bold text-muted">{rowNum}</td>
                        <td className="px-2.5 py-1.5 font-bold text-foreground">{s.serialNumber || rowNum}</td>
                        <td className="px-3 py-1.5 font-semibold text-foreground truncate max-w-[200px]" title={s.studentName}>
                          {s.studentName}
                        </td>
                        <td className="px-3 py-1.5 text-muted truncate max-w-[160px]" dir="rtl" title={s.studentNameAr || ""}>
                          {s.studentNameAr || "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {s.totalReports || 1}
                        </td>
                        <td className="px-3 py-1.5 text-muted truncate max-w-[220px]" title={s.reportsList || ""}>
                          {s.reportsList || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {slicedStudents.length > 15 && (
                    <tr className="bg-surface-soft/40">
                      <td colSpan={6} className="px-3 py-2 text-center text-xs font-semibold text-muted">
                        {locale === "ar"
                          ? `... تم عرض أول 15 شهادة من أصل ${slicedStudents.length} شهادة في هذه الكرتونة (الكشف المطبوع يحتوي على الجميع)`
                          : `... Showing first 15 of ${slicedStudents.length} items in this box (PDF will contain all)`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

