"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Download,
  Search,
  Truck,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Filter,
  Eye,
  Pencil,
  Phone,
  Check,
  Copy,
  Loader2,
  Upload,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import {
  ARAMEX_CITIES_LIST,
  ARAMEX_CITY_MAP,
  DEFAULT_ARAMEX_CITY,
  type AramexRowItem,
  type AramexCityOption,
  convertStudentsToAramexRows,
  generateAramexWorkbook,
  detectAramexCity,
} from "@/lib/aramex-utils";
import { type StudentWithReceipt, parseCertificateWorkbook } from "@/lib/certificates-parser";
import { toast } from "sonner";

export interface ServerBatchInfo {
  id: string;
  name: string;
  shortName?: string | null;
  fileName?: string | null;
  studentCount?: number;
  studentsData?: any;
}

export interface AramexExcelGeneratorProps {
  batches: ServerBatchInfo[];
  activeBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  activeBatchStudents: StudentWithReceipt[];
  loadingBatches?: boolean;
  onUploadBatch?: (file: File) => Promise<void>;
  isUploadingBatch?: boolean;
}

export function AramexExcelGenerator({
  batches,
  activeBatchId,
  onSelectBatch,
  activeBatchStudents,
  loadingBatches = false,
  onUploadBatch,
  isUploadingBatch = false,
}: AramexExcelGeneratorProps) {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<AramexRowItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");
  const [bulkCityGov, setBulkCityGov] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Initialize or re-generate rows when active students change
  useEffect(() => {
    if (activeBatchStudents && activeBatchStudents.length > 0) {
      const converted = convertStudentsToAramexRows(activeBatchStudents);
      setRows(converted);
      setSelectedRowIds(new Set());
    } else {
      setRows([]);
    }
  }, [activeBatchStudents, activeBatchId]);

  const activeBatch = useMemo(
    () => batches.find((b) => b.id === activeBatchId) || null,
    [batches, activeBatchId],
  );

  // Handle file upload directly from this tab
  const handleLocalFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const parsed = parseCertificateWorkbook(wb, file.name);
        if (parsed && parsed.length > 0) {
          const converted = convertStudentsToAramexRows(parsed);
          setRows(converted);
          toast.success(
            locale === "ar"
              ? `تم استخراج ${converted.length} شحنة بالعناوين الكاملة وأرقام الهواتف مباشرة!`
              : `Loaded ${converted.length} shipments with full addresses directly!`,
          );
        }
      } catch (err: any) {
        console.warn("Local parse error:", err);
      }

      if (onUploadBatch) {
        await onUploadBatch(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onUploadBatch, locale],
  );

  // Update a single cell in a row
  const handleUpdateRowField = useCallback(
    (id: string, field: keyof AramexRowItem, value: any) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            [field]: value,
          };
        }),
      );
    },
    [],
  );

  // Update a single row's Selected City Option
  const handleCityChange = useCallback((id: string, newCityGov: string) => {
    const opt = ARAMEX_CITY_MAP.get(newCityGov.toLowerCase()) || DEFAULT_ARAMEX_CITY;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          selectedCityGov: opt.cityGov,
          cityOption: opt,
        };
      }),
    );
  }, []);

  // Re-detect city automatically for all rows or selected rows
  const handleAutoDetectCities = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.size > 0 && !selectedRowIds.has(r.id)) return r;
        const autoOpt = detectAramexCity({
          governorate: r.governorate,
          city: r.originalCity,
          area: r.area,
          street: r.street,
          fullAddress: r.fullAddress,
        });
        return {
          ...r,
          selectedCityGov: autoOpt.cityGov,
          cityOption: autoOpt,
        };
      }),
    );
    toast.success(
      locale === "ar"
        ? "تمت إعادة الكشف الذكي للمدن بنجاح بناءً على العناوين"
        : "Cities auto-detected successfully from addresses",
    );
  }, [selectedRowIds, locale]);

  // Bulk apply a chosen city to selected or all rows
  const handleApplyBulkCity = useCallback(() => {
    if (!bulkCityGov) {
      toast.error(locale === "ar" ? "يرجى اختيار مدينة للتطبيق" : "Please select a city to apply");
      return;
    }

    const opt = ARAMEX_CITY_MAP.get(bulkCityGov.toLowerCase()) || DEFAULT_ARAMEX_CITY;

    setRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.size > 0) {
          if (selectedRowIds.has(r.id)) {
            return { ...r, selectedCityGov: opt.cityGov, cityOption: opt };
          }
          return r;
        }
        return { ...r, selectedCityGov: opt.cityGov, cityOption: opt };
      }),
    );

    toast.success(
      locale === "ar"
        ? `تم تطبيق "${opt.cityGov}" على ${selectedRowIds.size > 0 ? selectedRowIds.size : "جميع"} الشحنات`
        : `Applied "${opt.cityGov}" to ${selectedRowIds.size > 0 ? selectedRowIds.size : "all"} shipments`,
    );
  }, [bulkCityGov, selectedRowIds, locale]);

  // Download Aramex Excel Workbook matching the official carrier template with 100% fidelity
  const handleDownloadExcel = useCallback(async () => {
    if (rows.length === 0) {
      toast.error(locale === "ar" ? "لا توجد بيانات لتصديرها" : "No data to export");
      return;
    }

    const batchLabel = (activeBatch?.shortName || activeBatch?.name || "Aramex-Batch").replace(
      /[^a-zA-Z0-9_\u0600-\u06FF]/g,
      "_",
    );
    const fileName = `Aramex_Shipments_${batchLabel}`;

    setIsExporting(true);
    try {
      // Call server endpoint to populate the official Aramex_PDU_Template_City_Auto_Fixed (2).xlsx template
      const res = await fetch("/api/certificates/generate-aramex-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, fileName }),
      });

      if (!res.ok) {
        throw new Error("Server template generation returned error status");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        locale === "ar"
          ? "تم تحميل شيت أرامكس المعتمد بنجاح بالمطابقة الكاملة للقالب الرسمي وشعار أرامكس!"
          : "Official Aramex Excel sheet downloaded successfully with complete styling!",
      );
    } catch (err: any) {
      console.warn("Falling back to client-side XLSX generation:", err);
      const wb = generateAramexWorkbook(rows, "PDU_Data");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success(
        locale === "ar"
          ? "تم تحميل شيت أرامكس بنجاح!"
          : "Aramex sheet downloaded successfully!",
      );
    } finally {
      setIsExporting(false);
    }
  }, [rows, activeBatch, locale]);

  // Selection toggle
  const toggleSelectRow = useCallback((id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map((r) => r.id)));
    }
  }, [selectedRowIds.size, rows]);

  // Filtered rows for presentation
  const filteredRows = useMemo(() => {
    let result = rows;

    if (selectedCityFilter !== "all") {
      result = result.filter((r) => r.selectedCityGov === selectedCityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.studentNameEn.toLowerCase().includes(q) ||
          (r.studentNameAr && r.studentNameAr.includes(q)) ||
          (r.phone && r.phone.includes(q)) ||
          (r.phone2 && r.phone2.includes(q)) ||
          (r.fullAddress && r.fullAddress.toLowerCase().includes(q)) ||
          (r.selectedCityGov && r.selectedCityGov.toLowerCase().includes(q)) ||
          (r.governorate && r.governorate.toLowerCase().includes(q)) ||
          (r.newRequestId && r.newRequestId.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [rows, searchQuery, selectedCityFilter]);

  return (
    <div className="space-y-6">
      {/* Hidden file input for uploading batches from this tab */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => void handleLocalFileChange(e)}
      />

      {/* Step 1: Aramex Official Header & Batch Selector */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            {/* Visual Aramex Badge */}
            <div className="flex flex-col items-start px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40">
              <span className="text-lg font-black tracking-tighter text-[#D32F2F] leading-none">
                aramex
              </span>
              <span className="text-[9px] font-semibold text-slate-500 tracking-wider">
                delivery unlimited
              </span>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {locale === "ar"
                  ? "شيت إكسيل أرامكس الرسمي (Aramex PDU Template)"
                  : "Official Aramex PDU Sheet Generator"}
              </h2>
              <p className="text-xs text-muted">
                {locale === "ar"
                  ? "مطابق 100% لقالب أرامكس الأصلي بالشعار والتنسيقات وأعمدة العنوان والهواتف وملاحظات الاستلام."
                  : "100% faithful to the official Aramex template with logo, address formatting, and formulas."}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Upload Batch Button */}
            {onUploadBatch && (
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingBatch}
                className="h-9 gap-1.5 text-xs font-bold border-border hover:bg-surface-elevated cursor-pointer"
                title={locale === "ar" ? "رفع ملف إكسيل لباتش شهادات جديد" : "Upload new certificate batch file"}
              >
                {isUploadingBatch ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 text-orange-600" />}
                <span>{locale === "ar" ? "رفع باتش جديد" : "Upload Batch"}</span>
              </Button>
            )}

            {/* Batch Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="batch-select" className="text-xs font-bold text-muted">
                {locale === "ar" ? "الباتش:" : "Batch:"}
              </label>
              <select
                id="batch-select"
                value={activeBatchId || ""}
                onChange={(e) => onSelectBatch(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none cursor-pointer max-w-[220px] truncate"
              >
                <option value="" disabled>
                  {locale === "ar" ? "-- اختر باتش --" : "-- Select a Batch --"}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName || b.name} ({b.studentCount || 0} {locale === "ar" ? "طالب" : "students"})
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Preview / Edit Mode */}
            {rows.length > 0 && (
              <Button
                variant={isEditing ? "primary" : "secondary"}
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "h-9 gap-1.5 text-xs font-bold cursor-pointer",
                  isEditing ? "bg-amber-600 hover:bg-amber-700 text-white" : "",
                )}
                title={locale === "ar" ? "التبديل بين وضع المعاينة والتعديل المباشر" : "Toggle Edit / Preview Mode"}
              >
                {isEditing ? <Eye className="size-4" /> : <Pencil className="size-4" />}
                <span>{isEditing ? (locale === "ar" ? "وضع المعاينة" : "Preview") : (locale === "ar" ? "تعديل الشيت" : "Edit Sheet")}</span>
              </Button>
            )}

            {/* Download Button */}
            {rows.length > 0 && (
              <Button
                variant="primary"
                onClick={() => void handleDownloadExcel()}
                disabled={isExporting}
                className="h-9 gap-1.5 text-xs font-bold bg-[#D32F2F] hover:bg-red-700 text-white cursor-pointer shadow-xs"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                <span>{locale === "ar" ? "تحميل شيت أرامكس المعتمد" : "Download Aramex Excel"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status Indicators & Overview Stats */}
        {activeBatch && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-soft/40 p-3">
              <span className="text-[11px] font-medium text-muted block">
                {locale === "ar" ? "إجمالي الشحنات" : "Total Shipments"}
              </span>
              <span className="text-lg font-bold text-foreground">{rows.length}</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft/40 p-3">
              <span className="text-[11px] font-medium text-muted block">
                {locale === "ar" ? "العناوين الكاملة (Full Address)" : "Full Addresses Ready"}
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {rows.filter((r) => Boolean(r.fullAddress?.trim())).length}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft/40 p-3">
              <span className="text-[11px] font-medium text-muted block">
                {locale === "ar" ? "المدن المحددة (City - Gov)" : "Cities Assigned"}
              </span>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                {rows.filter((r) => Boolean(r.selectedCityGov)).length}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft/40 p-3">
              <span className="text-[11px] font-medium text-muted block">
                {locale === "ar" ? "إجمالي الشهادات للتسليم" : "Total Reports"}
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {rows.reduce((sum, r) => sum + (Number(r.totalReports) || 1), 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Empty State when no batch or no rows */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">
          <Truck className="size-10 mx-auto mb-3 text-muted/40" />
          <h3 className="text-sm font-bold text-foreground">
            {locale === "ar" ? "لم يتم اختيار شيت أو لا توجد بيانات طلاب" : "No sheet selected or empty data"}
          </h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            {locale === "ar"
              ? "يرجى اختيار شيت من القائمة العلوية أو الضغط على «رفع باتش جديد» لرفع ملف إكسيل يحتوي على أعمدة العناوين (Governorate, City, Area, Street, Apartment, Floor, Landmark)."
              : "Please select a sheet from the dropdown above or click 'Upload Batch' to upload an Excel file containing address fields."}
          </p>
          {onUploadBatch && (
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingBatch}
                className="gap-2 bg-[#D32F2F] hover:bg-red-700 text-white cursor-pointer"
              >
                {isUploadingBatch ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                <span>{locale === "ar" ? "رفع ملف إكسيل جديد" : "Upload Excel File"}</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Interactive Table Workspace (Preview & Edit) matching official Aramex styles */
        <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
          {/* Table Controls & Filters Toolbar */}
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface-soft/40">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === "ar" ? "بحث بالاسم، التليفون، العنوان..." : "Search name, phone, address..."}
                  className="w-full h-8 ps-9 pe-3 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              {/* City Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted" />
                <select
                  value={selectedCityFilter}
                  onChange={(e) => setSelectedCityFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:border-red-500 outline-none cursor-pointer max-w-[220px]"
                >
                  <option value="all">{locale === "ar" ? "كل المدن" : "All Cities"}</option>
                  {ARAMEX_CITIES_LIST.map((c) => (
                    <option key={c.cityGov} value={c.cityGov}>
                      {c.cityGov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleAutoDetectCities}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-500/20"
                title={locale === "ar" ? "إعادة الكشف التلقائي عن المدن لجميع العناوين" : "Auto-detect cities for all addresses"}
              >
                <Sparkles className="size-3.5 text-sky-600" />
                <span>{locale === "ar" ? "كشف ذكي للمدن" : "Auto-Detect Cities"}</span>
              </Button>

              {/* Bulk City Apply */}
              <div className="flex items-center gap-1 border-s border-border ps-2">
                <select
                  value={bulkCityGov}
                  onChange={(e) => setBulkCityGov(e.target.value)}
                  className="h-8 px-2 rounded-xl border border-border bg-surface text-xs text-foreground focus:border-red-500 outline-none cursor-pointer max-w-[180px]"
                >
                  <option value="">{locale === "ar" ? "-- تعيين مدينة --" : "-- Select City --"}</option>
                  {ARAMEX_CITIES_LIST.map((c) => (
                    <option key={c.cityGov} value={c.cityGov}>
                      {c.cityGov}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={handleApplyBulkCity}
                  disabled={!bulkCityGov}
                  className="h-8 text-xs font-semibold px-2.5 cursor-pointer"
                >
                  {locale === "ar" ? "تطبيق" : "Apply"}
                </Button>
              </div>
            </div>
          </div>

          {/* Mode Indicator Banner */}
          {isEditing && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold">
                  {locale === "ar"
                    ? "وضع التعديل المباشر نشط: يمكنك تعديل الاسم، العنوان الكامل، المدينة، وأرقام التليفونات في أي صف مباشرة."
                    : "Edit Mode Active: You can edit student names, full addresses, cities, and phone numbers directly."}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="h-6 text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 cursor-pointer"
              >
                {locale === "ar" ? "إنهاء التعديل" : "Done Editing"}
              </Button>
            </div>
          )}

          {/* The Aramex Shipments Table (Official Aramex Template Look & Feel) */}
          <div className="overflow-x-auto" dir="ltr" style={{ direction: "ltr" }}>
            <table className="w-full border-collapse text-xs text-start" dir="ltr" style={{ direction: "ltr" }}>
              <thead>
                {/* Row 5: Super Header - Customer Details (Cols A-L) vs Shipper Details (Cols M-Q) */}
                <tr>
                  <th
                    colSpan={10}
                    className="p-2 text-center text-xs font-extrabold text-white uppercase tracking-wider border-b border-r border-[#6B0000]"
                    style={{ backgroundColor: "#8B0000" }}
                  >
                    Customer Details
                  </th>
                  <th
                    colSpan={5}
                    className="p-2 text-center text-xs font-extrabold uppercase tracking-wider border-b border-[#F5C2AF]"
                    style={{ backgroundColor: "#FCE4D6", color: "#800000" }}
                  >
                    Shipper Details
                  </th>
                </tr>

                {/* Row 6: Official Column Headers */}
                <tr className="bg-surface-soft border-b border-border text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="w-10 p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      className="size-3.5 rounded border-border text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="w-12 p-2.5 text-center">Attention</th>
                  <th className="min-w-[190px] p-2.5 text-start">Name</th>
                  <th className="min-w-[340px] p-2.5 text-start bg-red-500/5 text-red-700 dark:text-red-300 font-extrabold">
                    Full Address (فل ادريس)
                  </th>
                  <th className="min-w-[220px] p-2.5 text-start bg-sky-500/5 text-sky-700 dark:text-sky-300 font-extrabold">
                    City - Governorate
                  </th>
                  <th className="w-28 p-2.5 text-center">City / Dest / Gov</th>
                  <th className="min-w-[120px] p-2.5 text-start">Reference / Unique</th>
                  <th className="w-32 p-2.5 text-start">Mobile Number</th>
                  <th className="w-32 p-2.5 text-start">Tel Number</th>
                  <th className="w-20 p-2.5 text-center">Landline</th>

                  {/* Shipper Columns (Light green background matching official Aramex template) */}
                  <th
                    className="w-28 p-2.5 text-center border-l border-border"
                    style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                  >
                    Origin City
                  </th>
                  <th
                    className="w-24 p-2.5 text-center"
                    style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                  >
                    Account No
                  </th>
                  <th
                    className="w-24 p-2.5 text-center"
                    style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                  >
                    Shipper Ref
                  </th>
                  <th
                    className="w-20 p-2.5 text-center"
                    style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                  >
                    Commodity
                  </th>
                  <th
                    className="min-w-[280px] p-2.5 text-start"
                    style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                  >
                    Remarks (ملاحظات الاستلام)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredRows.map((r, idx) => {
                  const isSelected = selectedRowIds.has(r.id);
                  const totalReports = r.totalReports || 1;
                  const remarksText = `تم تسليم عدد * ${totalReports}   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى`;

                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-surface-soft/60 transition-colors",
                        isSelected && "bg-red-500/5",
                      )}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(r.id)}
                          className="size-3.5 rounded border-border text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>

                      {/* Attention / No. */}
                      <td className="p-2.5 text-center font-mono text-muted text-[11px]">
                        {r.serialNumber || idx + 1}
                      </td>

                      {/* Name (Arabic candidate name preferred) */}
                      <td className="p-2.5">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={r.studentNameAr || ""}
                              onChange={(e) => handleUpdateRowField(r.id, "studentNameAr", e.target.value)}
                              placeholder="الاسم بالعربي..."
                              className="w-full h-7 px-2 text-xs font-bold rounded border border-border bg-surface text-foreground"
                              dir="rtl"
                            />
                            <input
                              type="text"
                              value={r.studentNameEn || ""}
                              onChange={(e) => handleUpdateRowField(r.id, "studentNameEn", e.target.value)}
                              placeholder="Name in English..."
                              className="w-full h-6 px-2 text-[11px] rounded border border-border bg-surface text-muted"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-foreground text-xs leading-tight" dir="rtl">
                              {r.studentNameAr || r.studentNameEn}
                            </div>
                            {r.studentNameAr && (
                              <div className="text-[11px] text-muted font-medium mt-0.5">
                                {r.studentNameEn}
                              </div>
                            )}
                            {r.recipient && r.recipient !== r.studentNameAr && r.recipient !== r.studentNameEn && (
                              <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                                <span className="font-semibold">المستلم:</span> {r.recipient}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Full Address */}
                      <td className="p-2 bg-red-500/[0.02]">
                        {isEditing ? (
                          <textarea
                            rows={3}
                            value={r.fullAddress}
                            onChange={(e) => handleUpdateRowField(r.id, "fullAddress", e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-border/80 bg-surface text-foreground font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed"
                            placeholder="Complete address..."
                          />
                        ) : (
                          <div className="text-xs text-foreground font-medium leading-relaxed max-w-[440px] select-text">
                            {r.fullAddress}
                          </div>
                        )}
                      </td>

                      {/* City - Governorate Dropdown */}
                      <td className="p-2 bg-sky-500/[0.02]">
                        <select
                          value={r.selectedCityGov}
                          onChange={(e) => handleCityChange(r.id, e.target.value)}
                          className={cn(
                            "w-full h-8 px-2 rounded-lg border text-xs font-bold outline-none cursor-pointer transition-all",
                            r.selectedCityGov
                              ? "border-sky-400/80 bg-sky-50/50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              : "border-amber-400/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 focus:border-amber-500",
                          )}
                        >
                          {ARAMEX_CITIES_LIST.map((c) => (
                            <option key={c.cityGov} value={c.cityGov}>
                              {c.cityGov}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* City / Dest / Gov Auto-Calculated Details */}
                      <td className="p-2 text-center">
                        <div className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                          [{r.cityOption?.code || "---"}]
                        </div>
                        <div className="text-[11px] font-semibold text-foreground mt-0.5">
                          {r.cityOption?.city || "-"}
                        </div>
                        <div className="text-[10px] text-muted">
                          {r.cityOption?.gov || "-"}
                        </div>
                      </td>

                      {/* Reference / Unique */}
                      <td className="p-2 text-start text-xs text-muted font-medium">
                        {r.originalCity || r.area || "-"}
                      </td>

                      {/* Mobile Number */}
                      <td className="p-2 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={r.phone || ""}
                            onChange={(e) => handleUpdateRowField(r.id, "phone", e.target.value)}
                            placeholder="Mobile (01...)..."
                            className="w-full h-7 px-2 text-xs rounded border border-border bg-surface text-foreground font-mono"
                          />
                        ) : (
                          <div className="text-foreground font-semibold">{r.phone || "-"}</div>
                        )}
                      </td>

                      {/* Tel Number */}
                      <td className="p-2 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={r.phone2 || ""}
                            onChange={(e) => handleUpdateRowField(r.id, "phone2", e.target.value)}
                            placeholder="Tel..."
                            className="w-full h-7 px-2 text-xs rounded border border-border bg-surface text-foreground font-mono"
                          />
                        ) : (
                          <div className="text-muted">{r.phone2 || r.phone || "-"}</div>
                        )}
                      </td>

                      {/* Landline */}
                      <td className="p-2 text-center text-muted text-xs">-</td>

                      {/* Shipper Details (Light green background matching template) */}
                      <td
                        className="p-2 text-center text-xs font-semibold border-l border-border/80"
                        style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                      >
                        Alexandria
                      </td>
                      <td
                        className="p-2 text-center font-mono text-xs font-semibold"
                        style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                      >
                        233677
                      </td>
                      <td
                        className="p-2 text-center font-mono text-xs font-semibold"
                        style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                      >
                        3930356
                      </td>
                      <td
                        className="p-2 text-center text-xs"
                        style={{ backgroundColor: "#E2EFDA", color: "#385723" }}
                      >
                        -
                      </td>
                      <td
                        className="p-2"
                        style={{ backgroundColor: "#E2EFDA" }}
                      >
                        <div className="text-[11px] font-medium text-[#273d18] bg-white/70 dark:bg-black/30 p-2 rounded border border-emerald-300/60 leading-relaxed" dir="rtl">
                          {remarksText}
                        </div>
                        <div className="mt-1 text-[10px] text-[#385723] flex items-center justify-between">
                          <span>عدد الشهادات: <strong className="font-bold text-emerald-800 dark:text-emerald-300">{totalReports}</strong></span>
                          {r.newRequestId && <span className="font-mono text-[10px] opacity-75">{r.newRequestId}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer bar with summary count and quick export */}
          <div className="p-3.5 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-surface-soft/40 text-xs text-muted">
            <div>
              {locale === "ar"
                ? `عرض ${filteredRows.length} من إجمالي ${rows.length} شحنة`
                : `Showing ${filteredRows.length} of ${rows.length} shipments`}
            </div>

            <Button
              variant="primary"
              onClick={() => void handleDownloadExcel()}
              disabled={isExporting}
              className="h-8 gap-1.5 text-xs font-bold bg-[#D32F2F] hover:bg-red-700 text-white cursor-pointer shadow-xs"
            >
              {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span>{locale === "ar" ? "تحميل شيت أرامكس المعتمد (Excel)" : "Download Aramex Excel (.xlsx)"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
