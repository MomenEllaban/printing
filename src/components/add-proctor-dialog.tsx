"use client";

import { useState, useRef, useCallback } from "react";
import {
  Check,
  CloudUpload,
  Download,
  Eye,
  FileText,
  Loader2,
  Printer,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { generateProctorRegisterPdf } from "@/lib/stickers/proctor-register-pdf";
import { generateControlRegisterPdf } from "@/lib/stickers/control-register-pdf";
import { generateStudentRegisterPdf } from "@/lib/stickers/student-register-pdf";
import { getRegisterTheme } from "@/lib/stickers/register-utils";
import type { DriveItem } from "@/lib/types";

interface AddProctorDialogProps {
  open: boolean;
  onClose: () => void;
  folder: { id: string; name: string } | null;
  registerType?: "proctor" | "control" | "student";
  currentProctorFile?: DriveItem | null;
  hierarchyInfo?: {
    examName?: string;
    governorate?: string;
    center?: string;
    building?: string;
    floor?: string;
    rooms?: string[];
    floors?: string[];
  };
  onSuccess: (uploadedFile: DriveItem) => void;
  onPreviewFile?: (file: DriveItem) => void;
  onPrintFile?: (file: DriveItem) => void;
}

export function AddProctorDialog({
  open,
  onClose,
  folder,
  registerType = "proctor",
  currentProctorFile,
  hierarchyInfo,
  onSuccess,
  onPreviewFile,
  onPrintFile,
}: AddProctorDialogProps) {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControl = registerType === "control";
  const isStudent = registerType === "student";
  const theme = getRegisterTheme(registerType);
  const registerLabelAr = theme.nameAr;
  const registerLabelEn = theme.nameEn;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setUploading(false);
    setGenerating(false);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading || generating) return;
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        toast.error(
          locale === "ar"
            ? `يجب اختيار ملف PDF فقط لـ ${registerLabelAr}`
            : `Only PDF files are supported for ${registerLabelEn}`,
        );
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        toast.error(
          locale === "ar"
            ? `يجب اختيار ملف PDF فقط لـ ${registerLabelAr}`
            : `Only PDF files are supported for ${registerLabelEn}`,
        );
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFileToServer = async (fileToUpload: File) => {
    if (!folder) return;
    setUploading(true);
    const toastId = toast.loading(
      locale === "ar" ? `جاري رفع وتوثيق ${registerLabelAr}...` : `Uploading ${registerLabelEn.toLowerCase()}...`,
    );

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("parentId", folder.id);
      formData.append(
        "examMetadata",
        JSON.stringify({
          enabled: true,
          registerType: isControl ? "control" : isStudent ? "student" : "proctor",
          institution: hierarchyInfo?.center,
          floor: hierarchyInfo?.floor,
          room: isStudent ? folder.name : undefined,
        }),
      );

      const res = await fetch("/api/drive/upload/direct", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message ||
            (locale === "ar" ? `فشل رفع ${registerLabelAr}` : `Failed to upload ${registerLabelEn.toLowerCase()}`),
        );
      }

      toast.success(
        locale === "ar"
          ? `تمت إضافة ${registerLabelAr} بنجاح داخل "${folder.name}"`
          : `${registerLabelEn} uploaded successfully to "${folder.name}"`,
        { id: toastId },
      );

      resetState();
      onSuccess(data);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error uploading file", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSelected = async () => {
    if (!selectedFile) return;
    await uploadFileToServer(selectedFile);
  };

  const handleGenerateOfficialPdf = async () => {
    if (!folder) return;
    setGenerating(true);
    const toastId = toast.loading(
      locale === "ar"
        ? `جاري إنشاء وتوليد ${registerLabelAr} الرسمي المعتمد...`
        : `Generating official EST ${registerLabelEn.toLowerCase()} PDF...`,
    );

    try {
      let pdfBytes: Uint8Array;
      const sanitizedName = folder.name.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, "_");
      let outFileName: string;

      if (isControl) {
        pdfBytes = await generateControlRegisterPdf({
          examName: hierarchyInfo?.examName || "EST 1",
          governorate: hierarchyInfo?.governorate,
          center: hierarchyInfo?.center,
          building: hierarchyInfo?.building || folder.name,
          floors: hierarchyInfo?.floors,
        });
        outFileName = `Control_Register_${sanitizedName}.pdf`;
      } else if (isStudent) {
        pdfBytes = await generateStudentRegisterPdf({
          examName: hierarchyInfo?.examName || "EST 1",
          governorate: hierarchyInfo?.governorate,
          center: hierarchyInfo?.center,
          building: hierarchyInfo?.building,
          floor: hierarchyInfo?.floor,
          room: folder.name,
        });
        outFileName = `Student_Register_${sanitizedName}.pdf`;
      } else {
        pdfBytes = await generateProctorRegisterPdf({
          examName: hierarchyInfo?.examName || "EST 1",
          governorate: hierarchyInfo?.governorate,
          center: hierarchyInfo?.center,
          building: hierarchyInfo?.building || folder.name,
          floor: hierarchyInfo?.floor || folder.name,
          rooms: hierarchyInfo?.rooms,
        });
        outFileName = `Proctor_Register_${sanitizedName}.pdf`;
      }

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const generatedFile = new File([blob], outFileName, { type: "application/pdf" });

      toast.loading(
        locale === "ar"
          ? "تم توليد الكشف بنجاح، جاري الحفظ داخل المجلد..."
          : "PDF generated, saving to folder...",
        { id: toastId },
      );

      await uploadFileToServer(generatedFile);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to generate ${registerLabelEn.toLowerCase()} PDF`,
        { id: toastId },
      );
      setGenerating(false);
    }
  };

  if (!open || !folder) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        locale === "ar"
          ? `${registerLabelAr} (${registerLabelEn}) — ${folder.name}`
          : `${registerLabelEn} — ${folder.name}`
      }
      description={
        locale === "ar"
          ? isControl
            ? "إدارة ورفع كشف أعضاء الكنترول واللوجستيات للمبنى كملف PDF معتمد."
            : isStudent
            ? "إدارة ورفع كشف حضور وتوقيع الطلاب وتوزيع أرقام الجلوس للقاعة كملف PDF معتمد."
            : "إدارة ورفع كشف حضور وتوزيع السادة المراقبين والملاحظين للدور كملف PDF معتمد."
          : isControl
          ? "Manage and upload the official Control & Building Supervision Register PDF for this building."
          : isStudent
          ? "Manage and upload the official Student Attendance & Seating Register PDF for this room."
          : "Manage and upload the official Proctor Attendance & Assignment Register PDF for this floor."
      }
      size="md"
    >
      <div className="space-y-4 py-2">
        {/* Existing File Notice if present */}
        {currentProctorFile && (
          <div className={cn("rounded-xl border p-3.5 space-y-2", theme.chipBorderClass, theme.chipBgClass)}>
            <div className="flex items-center justify-between">
              <span className={cn("flex items-center gap-1.5 text-xs font-bold", theme.textClass)}>
                <Check className="size-4" />
                <span>
                  {locale === "ar"
                    ? `يوجد ${registerLabelAr} مسجل حالياً`
                    : `${registerLabelEn} Already Attached`}
                </span>
              </span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", theme.chipBorderClass, theme.textClass)}>
                PDF
              </span>
            </div>

            <p className="text-xs font-medium text-foreground truncate dir-ltr">
              📄 {currentProctorFile.name}
            </p>

            <div className="flex items-center gap-2 pt-1">
              {onPreviewFile && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onPreviewFile(currentProctorFile);
                    onClose();
                  }}
                  className={cn("flex items-center gap-1.5 text-xs cursor-pointer py-1 px-2.5", theme.hoverBgClass)}
                >
                  <Eye className={cn("size-3.5", theme.iconColorClass)} />
                  <span>{locale === "ar" ? "معاينة وعرض" : "Preview (Show)"}</span>
                </Button>
              )}

              {onPrintFile && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onPrintFile(currentProctorFile);
                    onClose();
                  }}
                  className={cn("flex items-center gap-1.5 text-xs cursor-pointer py-1 px-2.5", theme.hoverBgClass)}
                >
                  <Printer className={cn("size-3.5", theme.iconColorClass)} />
                  <span>{locale === "ar" ? "طباعة مباشرة" : "Direct Print"}</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Option 1: Generate Official Approved Register PDF */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              <span>
                {locale === "ar"
                  ? `الخيار 1: إنشاء وتوليد ${registerLabelAr} رسمي تلقائياً`
                  : `Option 1: Auto-Generate Official ${registerLabelEn} PDF`}
              </span>
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", theme.chipBorderClass, theme.chipBgClass, theme.textClass)}>
              {locale === "ar" ? `المسؤول: ${theme.ownerAr}` : `Owner: ${theme.ownerEn}`}
            </span>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            {locale === "ar"
              ? isControl
                ? "يقوم بإنشاء ملف PDF رسمي معتمد بشعار EST بالعرض (A4 Landscape) يحتوي على جدول أعضاء الكنترول وتوزيع المهام وخانات التوقيعات معتمد باسم السنتر والمبنى."
                : isStudent
                ? "يقوم بإنشاء ملف PDF رسمي معتمد بشعار EST بالعرض (A4 Landscape) يحتوي على كشف أسماء الطلاب وأرقام الجلوس وخانات الحضور/الغياب والتوقيعات معتمد باسم السنتر والمبنى والدور والروم."
                : "يقوم بإنشاء ملف PDF رسمي معتمد بشعار EST بالعرض (A4 Landscape) يحتوي على جدول الحضور وتوزيع القاعات وخانات التوقيعات معتمد باسم السنتر والمبنى والدور."
              : isControl
              ? "Generates an official EST A4 Landscape building control roster with logo, center, building details, control members table, and sign-offs."
              : isStudent
              ? "Generates an official EST A4 Landscape student attendance sheet with logo, seat numbers, attendance status, signatures, and proctor sign-off."
              : "Generates an official EST A4 Landscape attendance sheet with logo, center, building, floor details, signature blocks, and proctor table."}
          </p>

          <Button
            variant="primary"
            onClick={handleGenerateOfficialPdf}
            disabled={uploading || generating}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-amber-500/20"
          >
            {generating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{locale === "ar" ? "جاري إنشاء الكشف وحفظه..." : "Generating & Saving PDF..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>{locale === "ar" ? "⚡ توليد كشف رسمي معتمد (PDF)" : "⚡ Generate Official Register PDF"}</span>
              </>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border/70" />
          <span className="flex-shrink mx-3 text-[11px] font-medium text-muted uppercase">
            {locale === "ar" ? "أو رفع ملف جاهز" : "OR Upload File"}
          </span>
          <div className="flex-grow border-t border-border/70" />
        </div>

        {/* Option 2: Upload User's PDF file */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border/80 hover:border-emerald-500/60 bg-surface-soft hover:bg-emerald-500/5"
            }`}
          >
            <CloudUpload className="size-7 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-xs font-semibold text-foreground">
              {locale === "ar"
                ? "اضغط لاختيار ملف PDF من جهازك أو اسحبه هنا"
                : "Click to choose a PDF from your device or drag here"}
            </p>
            <p className="text-[10px] text-muted mt-1">
              {locale === "ar" ? "ملفات PDF فقط (الحد الأقصى 25 ميجابايت)" : "PDF files only (max 25MB)"}
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-soft px-3 py-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{selectedFile.name}</span>
                <span className="text-[10px] text-muted shrink-0">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-muted hover:text-foreground cursor-pointer p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={uploading || generating}
              className="text-xs cursor-pointer"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>

            <Button
              variant="primary"
              onClick={handleUploadSelected}
              disabled={!selectedFile || uploading || generating}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{locale === "ar" ? "جاري الرفع..." : "Uploading..."}</span>
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  <span>{locale === "ar" ? `رفع ${registerLabelAr}` : `Upload ${registerLabelEn}`}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
