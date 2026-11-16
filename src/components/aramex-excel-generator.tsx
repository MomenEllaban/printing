"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import type { StudentWithReceipt } from "@/lib/certificates-parser";
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
}

export function AramexExcelGenerator({
  batches,
  activeBatchId,
  onSelectBatch,
  activeBatchStudents,
  loadingBatches = false,
}: AramexExcelGeneratorProps) {
  const { locale } = useI18n();

  const [rows, setRows] = useState<AramexRowItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");
  const [bulkCityGov, setBulkCityGov] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

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

  // Update a single row's Full Address
  const handleFullAddressChange = useCallback((id: string, newAddress: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          fullAddress: newAddress,
        };
      }),
    );
  }, []);

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

  // Download Aramex Excel Workbook matching the official carrier format
  const handleDownloadExcel = useCallback(() => {
    if (rows.length === 0) {
      toast.error(locale === "ar" ? "لا توجد بيانات لتصديرها" : "No data to export");
      return;
    }

    const batchLabel = (activeBatch?.shortName || activeBatch?.name || "Aramex-Batch").replace(
      /[^a-zA-Z0-9_\u0600-\u06FF]/g,
      "_",
    );
    const wb = generateAramexWorkbook(rows, "Sheet1");
    XLSX.writeFile(wb, `Aramex_Shipments_${batchLabel}.xlsx`);

    toast.success(
      locale === "ar"
        ? "تم تحميل شيت أرامكس الرسمي (Excel) بنجاح بالمطابقة الكاملة!"
        : "Official Aramex Excel sheet downloaded successfully with 100% template fidelity!",
    );
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
      {/* Step 1: Sheet Selection & Overview Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Truck className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  {locale === "ar" ? "توليد وتجهيز شيت إكسيل أرامكس" : "Aramex Excel Sheet Generator"}
                </h2>
                <p className="text-xs text-muted">
                  {locale === "ar"
                    ? "اختر الشيت المطلوب لتحويل عناوينه إلى (Full Address) وتوليد شيت أرامكس الرسمي بكامل خاناته وملاحظات الاستلام."
                    : "Select a sheet to generate full address and build the official Aramex shipment sheet."}
                </p>
              </div>
            </div>
          </div>

          {/* Batch Selector Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="batch-select" className="text-xs font-bold text-muted">
                {locale === "ar" ? "الشيت المستهدف:" : "Target Sheet:"}
              </label>
              <select
                id="batch-select"
                value={activeBatchId || ""}
                onChange={(e) => onSelectBatch(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer max-w-[260px] truncate"
              >
                <option value="" disabled>
                  {locale === "ar" ? "-- اختر شيت من القائمة --" : "-- Select a Sheet --"}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName || b.name} ({b.studentCount || 0} {locale === "ar" ? "طالب" : "students"})
                  </option>
                ))}
              </select>
            </div>

            {rows.length > 0 && (
              <Button
                variant="primary"
                onClick={handleDownloadExcel}
                className="h-9 gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-xs"
              >
                <Download className="size-4" />
                <span>{locale === "ar" ? "تحميل شيت أرامكس Excel" : "Download Aramex Excel"}</span>
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
                {locale === "ar" ? "الشحنات المحددة للتعديل" : "Selected Rows"}
              </span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {selectedRowIds.size}
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
              ? "يرجى اختيار شيت من القائمة العلوية أو التأكد من رفع ملف إكسيل يحتوي على أعمدة العناوين (Governorate, City, Area, Street, Apartment, Floor, Landmark)."
              : "Please select a sheet from the dropdown above containing shipping address columns."}
          </p>
        </div>
      ) : (
        /* Step 2: Interactive Table Workspace */
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
                  className="w-full h-8 ps-9 pe-3 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* City Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted" />
                <select
                  value={selectedCityFilter}
                  onChange={(e) => setSelectedCityFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:border-orange-500 outline-none cursor-pointer max-w-[220px]"
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
                  className="h-8 px-2 rounded-xl border border-border bg-surface text-xs text-foreground focus:border-orange-500 outline-none cursor-pointer max-w-[180px]"
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

          {/* The Aramex Shipments Table */}
          <div className="overflow-x-auto" dir="ltr" style={{ direction: "ltr" }}>
            <table className="w-full border-collapse text-xs text-start" dir="ltr" style={{ direction: "ltr" }}>
              <thead>
                <tr className="bg-surface-soft border-b border-border text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="w-10 p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      className="size-3.5 rounded border-border text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </th>
                  <th className="w-12 p-2.5 text-center">#</th>
                  <th className="min-w-[190px] p-2.5 text-start">Student Name (Arabic)</th>
                  <th className="w-32 p-2.5 text-start">Phones</th>
                  <th className="min-w-[280px] p-2.5 text-start bg-orange-500/5 text-orange-700 dark:text-orange-300 font-extrabold">
                    Full Address (فل ادريس)
                  </th>
                  <th className="min-w-[220px] p-2.5 text-start bg-sky-500/5 text-sky-700 dark:text-sky-300 font-extrabold">
                    City - Governorate (سيتى)
                  </th>
                  <th className="min-w-[220px] p-2.5 text-start">Remarks (الملاحظات وعدد الشهادات)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.map((r, idx) => {
                  const isSelected = selectedRowIds.has(r.id);
                  const remarksText = `تم تسليم عدد * ${r.totalReports || 1}   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى`;

                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-surface-soft/60 transition-colors",
                        isSelected && "bg-orange-500/5",
                      )}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(r.id)}
                          className="size-3.5 rounded border-border text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>

                      {/* Attention / No. */}
                      <td className="p-2.5 text-center font-mono text-muted text-[11px]">
                        {r.serialNumber || idx + 1}
                      </td>

                      {/* Name (Arabic preferred) */}
                      <td className="p-2.5">
                        <div className="font-bold text-foreground text-xs leading-tight" dir="rtl">
                          {r.studentNameAr || r.studentNameEn}
                        </div>
                        {r.studentNameAr && (
                          <div className="text-[11px] text-muted font-medium mt-0.5">
                            {r.studentNameEn}
                          </div>
                        )}
                        {r.recipient && r.recipient !== r.studentNameAr && r.recipient !== r.studentNameEn && (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
                            <span className="font-semibold">المستلم:</span> {r.recipient}
                          </div>
                        )}
                      </td>

                      {/* Phone Numbers */}
                      <td className="p-2.5 font-mono text-[11px] text-muted">
                        <div>{r.phone || "-"}</div>
                        {r.phone2 && r.phone2 !== r.phone && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{r.phone2}</div>
                        )}
                      </td>

                      {/* Full Address (Editable Column) */}
                      <td className="p-1.5 bg-orange-500/[0.02]">
                        <textarea
                          rows={2}
                          value={r.fullAddress}
                          onChange={(e) => handleFullAddressChange(r.id, e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-border/80 bg-surface text-foreground font-medium focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none leading-relaxed"
                          placeholder="Complete address..."
                        />
                      </td>

                      {/* City Dropdown (Aramex Selection Column) */}
                      <td className="p-1.5 bg-sky-500/[0.02]">
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
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            [{r.cityOption?.code || "---"}]
                          </span>
                          <span>{r.cityOption?.city || ""}</span>
                          <span>•</span>
                          <span>{r.cityOption?.gov || ""}</span>
                        </div>
                      </td>

                      {/* Remarks & Total Reports */}
                      <td className="p-2.5">
                        <div className="text-[11px] font-medium text-foreground bg-surface-soft/60 p-2 rounded-lg border border-border/60 leading-relaxed" dir="rtl">
                          {remarksText}
                        </div>
                        <div className="mt-1 text-[10px] text-muted">
                          عدد الشهادات: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{r.totalReports || 1}</strong>
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
              onClick={handleDownloadExcel}
              className="h-8 gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-xs"
            >
              <Download className="size-3.5" />
              <span>{locale === "ar" ? "تحميل شيت أرامكس المعتمد (Excel)" : "Download Aramex Excel (.xlsx)"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
