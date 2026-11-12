"use client";

import { useState, useRef, useCallback } from "react";
import {
  Check,
  CloudUpload,
  Download,
  Eye,
  FileSpreadsheet,
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
import {
  getRegisterTheme,
  type RegisterCategory,
} from "@/lib/stickers/register-utils";
import type { DriveItem } from "@/lib/types";

interface AddProctorDialogProps {
  open: boolean;
  onClose: () => void;
  folder: { id: string; name: string } | null;
  registerType?: "building_excel" | "student" | "proctor" | "control";
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
  registerType = "building_excel",
  currentProctorFile,
  hierarchyInfo,
  onSuccess,
  onPreviewFile,
  onPrintFile,
}: AddProctorDialogProps) {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExcel = registerType === "building_excel";
  const isControl = registerType === "control";
  const isStudent = registerType === "student";
  const theme = getRegisterTheme(registerType);
  const registerLabelAr = theme.nameAr;
  const registerLabelEn = theme.nameEn;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setUploading(false);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading) return;
    resetState();
    onClose();
  };

  const isFileValid = (file: File) => {
    if (isExcel) {
      const lower = file.name.toLowerCase();
      const validExt = lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv");
      const validMime =
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "text/csv";
      return validExt || validMime;
    }
    return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isFileValid(file)) {
        toast.error(
          locale === "ar"
            ? isExcel
              ? "يجب اختيار ملف إكسيل (.xlsx أو .xls أو .csv)"
              : `يجب اختيار ملف PDF فقط لـ ${registerLabelAr}`
            : isExcel
            ? "Only Excel spreadsheets (.xlsx, .xls, .csv) are supported"
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
      if (!isFileValid(file)) {
        toast.error(
          locale === "ar"
            ? isExcel
              ? "يجب اختيار ملف إكسيل (.xlsx أو .xls أو .csv)"
              : `يجب اختيار ملف PDF فقط لـ ${registerLabelAr}`
            : isExcel
            ? "Only Excel spreadsheets (.xlsx, .xls, .csv) are supported"
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
          registerType: isExcel ? "building_excel" : isControl ? "control" : isStudent ? "student" : "proctor",
          institution: hierarchyInfo?.center,
          building: hierarchyInfo?.building || folder.name,
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
          ? isExcel
            ? "إدارة ورفع شيت إكسيل المبنى المعتمد بكافة التابات (توزيع المراقبين، الكنترول، وبيان القاعات)."
            : isControl
            ? "إدارة ورفع كشف أعضاء الكنترول واللوجستيات للمبنى كملف PDF معتمد."
            : isStudent
            ? "إدارة ورفع كشف حضور وتوقيع الطلاب وتوزيع أرقام الجلوس للقاعة كملف PDF معتمد."
            : "إدارة ورفع كشف حضور وتوزيع السادة المراقبين والملاحظين للدور كملف PDF معتمد."
          : isExcel
          ? "Manage and upload the official Building Excel Workbook with all tabs (Proctors, Control Room, and Rooms)."
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
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase", theme.chipBorderClass, theme.textClass)}>
                {isExcel ? "XLSX" : "PDF"}
              </span>
            </div>

            <p className="text-xs font-medium text-foreground truncate dir-ltr">
              {isExcel ? "📊" : "📄"} {currentProctorFile.name}
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

        {/* Upload User's file directly */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={
              isExcel
                ? ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                : ".pdf,application/pdf"
            }
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
                ? isExcel
                ? "اضغط لاختيار ملف إكسيل (.xlsx) من جهازك أو اسحبه هنا"
                : "اضغط لاختيار ملف PDF من جهازك أو اسحبه هنا"
                : isExcel
                ? "Click to choose an Excel workbook (.xlsx) from your device or drag here"
                : "Click to choose a PDF from your device or drag here"}
            </p>
            <p className="text-[10px] text-muted mt-1">
              {locale === "ar"
                ? isExcel
                  ? "ملفات إكسيل (.xlsx, .xls, .csv) بحد أقصى 25 ميجابايت"
                  : "ملفات PDF فقط (الحد الأقصى 25 ميجابايت)"
                : isExcel
                ? "Excel workbooks (.xlsx, .xls, .csv) max 25MB"
                : "PDF files only (max 25MB)"}
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-soft px-3 py-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                {isExcel ? (
                  <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="size-4 text-emerald-600 shrink-0" />
                )}
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
              disabled={uploading}
              className="text-xs cursor-pointer"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>

            <Button
              variant="primary"
              onClick={handleUploadSelected}
              disabled={!selectedFile || uploading}
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
