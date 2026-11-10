"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Pencil,
  Save,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { EST_LOGO_BASE64 } from "@/lib/stickers/est-logo-base64";
import {
  computeRoomSpans,
  parseSheetDetails,
  type SheetData,
  type ParsedProctorRow,
  type RoomSpanResult,
} from "@/lib/stickers/building-excel";

export interface ExcelRegisterWorkspaceProps {
  sheets: SheetData[];
  activeTabIdx: number;
  setActiveTabIdx: (idx: number) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  viewAll: boolean;
  setViewAll: (viewAll: boolean) => void;
  buildingName?: string;
  onCellChange: (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIdx: number, sheetIdx?: number) => void;
  onDeleteLastRow: (sheetIdx?: number) => void;
  onAddTab?: () => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  onPrint?: (singleSheet?: boolean) => void;
  isModal?: boolean;
}

export function ExcelRegisterWorkspace({
  sheets,
  activeTabIdx,
  setActiveTabIdx,
  isEditing,
  setIsEditing,
  viewAll,
  setViewAll,
  buildingName,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onDeleteLastRow,
  onAddTab,
  onSave,
  saving = false,
  onPrint,
  isModal = false,
}: ExcelRegisterWorkspaceProps) {
  const { locale } = useI18n();
  const [search, setSearch] = useState("");

  if (!sheets || sheets.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        {locale === "ar" ? "لا توجد صفحات أو بيانات في ملف الإكسيل" : "No sheets found in this workbook"}
      </div>
    );
  }

  const currentSheet = sheets[activeTabIdx] ?? sheets[0];

  return (
    <div className="w-full space-y-4">
      {/* Tab Navigator & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-xs">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin max-w-full">
          {sheets.map((sheet, idx) => {
            const isActive = activeTabIdx === idx && !viewAll;
            return (
              <button
                key={sheet.name}
                type="button"
                onClick={() => {
                  setActiveTabIdx(idx);
                  setViewAll(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-bold transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-surface-elevated text-muted-foreground hover:text-foreground border border-border hover:border-emerald-500/40",
                )}
              >
                <span>{sheet.name}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive ? "bg-white/20 text-white" : "bg-surface-soft text-muted-foreground",
                  )}
                >
                  {sheet.rows.length}
                </span>
              </button>
            );
          })}

          {isEditing && onAddTab && (
            <button
              type="button"
              onClick={onAddTab}
              className="px-2.5 py-1.5 text-xs rounded-xl font-semibold border border-dashed border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{locale === "ar" ? "إضافة دور/تاب" : "Add Tab"}</span>
            </button>
          )}

          {!isEditing && sheets.length > 1 && (
            <button
              type="button"
              onClick={() => setViewAll(!viewAll)}
              className={cn(
                "px-2.5 py-1.5 text-xs rounded-xl font-bold border transition-colors shrink-0 cursor-pointer",
                viewAll
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "border-border hover:bg-surface-soft text-muted-foreground",
              )}
            >
              {locale === "ar" ? "عرض الكل معاً" : "View All"}
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 ms-auto">
          {/* Real-time search inside sheets */}
          {!isEditing && (
            <div className="relative w-full sm:w-52">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "ar" ? "بحث بالاسم أو الروم..." : "Search sheet..."}
                className="w-full h-8 ps-8 pe-3 text-xs rounded-xl bg-surface-soft border border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          )}

          {/* Edit / View Toggle Button */}
          <Button
            type="button"
            variant={isEditing ? "primary" : "secondary"}
            onClick={() => setIsEditing(!isEditing)}
            className="h-8 gap-1.5 text-xs font-bold cursor-pointer"
            title={locale === "ar" ? "تعديل البيانات والخلايا مباشرة داخل الإكسيل" : "Edit sheet data"}
          >
            <Pencil className="size-3.5" />
            <span>{isEditing ? (locale === "ar" ? "معاينة" : "View") : (locale === "ar" ? "تعديل" : "Edit")}</span>
          </Button>

          {/* Save Button */}
          {isEditing && onSave && (
            <Button
              type="button"
              variant="primary"
              onClick={() => void onSave()}
              disabled={saving}
              className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{locale === "ar" ? "حفظ التعديلات" : "Save Changes"}</span>
            </Button>
          )}

          {/* Clean Landscape Print Buttons */}
          {!isEditing && onPrint && (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onPrint(false)}
                className="h-8 gap-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer"
                title={locale === "ar" ? "طباعة جميع التابات بتنسيق رسمي A4 بالعرض بدون هوامش متصفح" : "Print all tabs formatted A4 Landscape"}
              >
                <Printer className="size-3.5 text-indigo-600" />
                <span>{locale === "ar" ? "طباعة الكل (A4)" : "Print All"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onPrint(true)}
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
                title={locale === "ar" ? "طباعة التاب الحالي فقط" : "Print current tab only"}
              >
                <Printer className="size-3.5" />
                <span>{locale === "ar" ? "هذا التاب" : "Tab"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editing Alert Banner */}
      {isEditing && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">
              {locale === "ar"
                ? "وضع التعديل المباشر نشط: يظهر رقم الروم أمام كل مراقب بوضوح. كرر رقم الروم للمراقبين في نفس اللجنة لدمجهم تلقائياً في الطباعة والمعاينة."
                : "Edit Mode Active: Room numbers are clearly visible on every row. Proctors with the same room will be merged automatically."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onAddRow}
              className="h-7 text-[11px] gap-1 font-bold px-2.5 bg-surface border border-border"
            >
              <Plus className="size-3" />
              <span>{locale === "ar" ? "+ إضافة مراقب" : "+ Add Proctor"}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDeleteLastRow(activeTabIdx)}
              className="h-7 text-[11px] gap-1 font-bold px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800"
              title={locale === "ar" ? "حذف آخر مراقب تمت إضافته" : "Delete last added proctor"}
            >
              <Trash2 className="size-3" />
              <span>{locale === "ar" ? "حذف آخر مراقب" : "Delete Last"}</span>
            </Button>
            {onSave && (
              <Button
                type="button"
                variant="primary"
                onClick={() => void onSave()}
                disabled={saving}
                className="h-7 text-[11px] gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                <span>{locale === "ar" ? "حفظ" : "Save"}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sheets Content Container */}
      <div className="space-y-6">
        {(viewAll ? sheets : [currentSheet]).map((sheet, sIdx) => {
          const sheetRealIdx = viewAll ? sIdx : activeTabIdx;
          const parsed = parseSheetDetails(sheet, buildingName);

          // Apply search filter if active
          const q = search.trim().toLowerCase();
          const filteredRows = q
            ? parsed.dataRows.filter(
                (r) =>
                  String(r.name).toLowerCase().includes(q) ||
                  String(r.room).toLowerCase().includes(q) ||
                  String(r.mobile).toLowerCase().includes(q) ||
                  String(r.proctorType).toLowerCase().includes(q),
              )
            : parsed.dataRows;

          if (isEditing) {
            // Ergonomic, Comfortable Edit Mode
            return (
              <div
                key={sheet.name}
                className="bg-surface-elevated border border-border rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Edit Mode Header Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-amber-500/10 border-b border-amber-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Pencil className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>{sheet.name}</span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
                          {locale === "ar" ? "تعديل بيانات المراقبين واللجان" : "Editing Proctors & Rooms"}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {locale === "ar"
                          ? "يظهر رقم الروم أمام كل مراقب بوضوح. كرر رقم الروم للمراقبين في نفس اللجنة لدمجهم تلقائياً."
                          : "Room numbers are clearly visible on every row. Proctors with the same room will be merged automatically."}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs font-bold gap-1.5 py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    onClick={onAddRow}
                  >
                    <Plus className="size-3.5" />
                    <span>{locale === "ar" ? "+ إضافة مراقب جديد" : "+ Add Proctor"}</span>
                  </Button>
                </div>

                {/* Clean Sheet Metadata Settings Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-surface-soft/40 border-b border-border">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      {locale === "ar" ? "اسم السنتر والمبنى (Center):" : "Center / Building:"}
                    </label>
                    <input
                      type="text"
                      value={parsed.center}
                      onChange={(e) => onCellChange(sheetRealIdx, 0, 1, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      {locale === "ar" ? "التاريخ (Date):" : "Date:"}
                    </label>
                    <input
                      type="text"
                      value={parsed.date}
                      onChange={(e) => onCellChange(sheetRealIdx, 0, 5, `Date: ${e.target.value}`)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      {locale === "ar" ? "نوع الامتحان (EST Type):" : "EST Type:"}
                    </label>
                    <input
                      type="text"
                      value={parsed.estType}
                      onChange={(e) => onCellChange(sheetRealIdx, 0, 7, `EST Type : ${e.target.value}`)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      {locale === "ar" ? "رئيس السنتر (Head of Center):" : "Head of Center:"}
                    </label>
                    <input
                      type="text"
                      value={parsed.headName}
                      onChange={(e) => {
                        for (let r = sheet.rows.length - 1; r >= 0; r--) {
                          const val = String(sheet.rows[r]?.[1] ?? "").trim();
                          if (/Mohamed\s*Nabil|Head/i.test(val)) {
                            onCellChange(sheetRealIdx, r + 1 < sheet.rows.length ? r + 1 : r, 1, e.target.value);
                            break;
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Focused, Comfortable Proctors Table */}
                <div className="overflow-x-auto p-3">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-soft border-b border-border text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        <th className="w-10 p-2 text-center">#</th>
                        <th className="w-16 p-2 text-center">1. No.</th>
                        <th className="p-2 text-start min-w-[200px]">2. Name (اسم المراقب)</th>
                        <th className="w-32 p-2 text-start">3. Proctor Type</th>
                        <th className="w-32 p-2 text-start">4. Mobile</th>
                        <th className="w-16 p-2 text-center">5. IP/EP</th>
                        <th className="w-24 p-2 text-center bg-sky-500/10 text-sky-700 dark:text-sky-300 font-extrabold">
                          6. Room (اللجنة)
                        </th>
                        <th className="w-28 p-2 text-center">7. Arrival Sig</th>
                        <th className="w-20 p-2 text-center">8. Time (حضور)</th>
                        <th className="w-28 p-2 text-center">9. Departure Sig</th>
                        <th className="w-20 p-2 text-center">10. Time (انصراف)</th>
                        <th className="w-20 p-2 text-center text-rose-600 dark:text-rose-400 font-extrabold">{locale === "ar" ? "حذف" : "Delete"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsed.dataRows.map((r, dIdx) => {
                        return (
                          <tr key={dIdx} className="hover:bg-surface-soft/60 transition-colors">
                            <td className="p-2 text-center text-muted-foreground font-mono text-[11px]">
                              {dIdx + 1}
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[0] ?? r.no)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 0, e.target.value)}
                                className="w-full px-2 py-1 text-center font-bold bg-surface rounded border border-border focus:border-emerald-500 outline-none text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[1] ?? r.name)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 1, e.target.value)}
                                className="w-full px-2.5 py-1 font-semibold bg-surface rounded border border-border focus:border-emerald-500 outline-none text-xs"
                                placeholder="Full name..."
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={String(sheet.rows[r.rawRowIdx]?.[2] ?? r.proctorType)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 2, e.target.value)}
                                className="w-full px-2 py-1 bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none font-semibold cursor-pointer"
                              >
                                <option value="Proctor">Proctor</option>
                                <option value="Senior">Senior</option>
                                <option value="Roaming">Roaming</option>
                                <option value="Control Room Assistant">Control Room Assistant</option>
                                <option value="Head">Head</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[3] ?? r.mobile)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 3, e.target.value)}
                                className="w-full px-2 py-1 font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={String((sheet.rows[r.rawRowIdx]?.[4] ?? r.ipEp) || "EP")}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 4, e.target.value)}
                                className="w-full px-1 py-1 text-center font-bold bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none cursor-pointer"
                              >
                                <option value="EP">EP</option>
                                <option value="IP">IP</option>
                              </select>
                            </td>
                            <td className="p-1 bg-sky-500/5">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[5] ?? r.room)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 5, e.target.value)}
                                className="w-full px-2 py-1 text-center font-extrabold bg-surface rounded border border-sky-400 dark:border-sky-700 text-sky-900 dark:text-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-xs shadow-2xs"
                                placeholder="e.g. 401"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[6] ?? r.arrivalSignature)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 6, e.target.value)}
                                className="w-full px-2 py-1 text-center bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none"
                                placeholder="Signature..."
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[7] ?? r.arrivalTime)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 7, e.target.value)}
                                className="w-full px-1.5 py-1 text-center font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                                placeholder="__ : __"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[8] ?? r.departureSignature)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 8, e.target.value)}
                                className="w-full px-2 py-1 text-center bg-surface rounded border border-border text-xs focus:border-emerald-500 outline-none"
                                placeholder="Signature..."
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={String(sheet.rows[r.rawRowIdx]?.[9] ?? r.departureTime)}
                                onChange={(e) => onCellChange(sheetRealIdx, r.rawRowIdx, 9, e.target.value)}
                                className="w-full px-1.5 py-1 text-center font-mono text-xs bg-surface rounded border border-border focus:border-emerald-500 outline-none"
                                placeholder="__ : __"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => onDeleteRow(r.rawRowIdx, sheetRealIdx)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-lg border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer shadow-2xs"
                                title={locale === "ar" ? "حذف هذا المراقب نهائيًا" : "Delete proctor"}
                              >
                                <Trash2 className="size-3.5" />
                                <span>{locale === "ar" ? "حذف" : "Delete"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5 pb-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs font-bold gap-1.5 py-2 px-5 border-dashed border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                      onClick={onAddRow}
                    >
                      <Plus className="size-3.5" />
                      <span>{locale === "ar" ? "+ إضافة مراقب جديد" : "+ Add Proctor"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs font-bold gap-1.5 py-2 px-4 border-dashed border-rose-500/50 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-pointer"
                      onClick={() => onDeleteLastRow(sheetRealIdx)}
                      title={locale === "ar" ? "حذف آخر مراقب تمت إضافته" : "Delete last added proctor"}
                    >
                      <Trash2 className="size-3.5" />
                      <span>{locale === "ar" ? "حذف آخر مراقب" : "Delete Last Proctor"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          // Official High-Fidelity Formatted View with EST Logo, Header & 10 Columns
          const centerClean = parsed.center.replace(/^Center\s*:\s*/i, "").trim();
          const { spanMap, resolvedRoomMap } = computeRoomSpans(filteredRows);

          return (
            <div
              key={sheet.name}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden text-slate-900 dark:text-slate-100"
            >
              {/* Top Examination Banner with Official Logo */}
              <div className="p-5 border-b-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Logo & Examination Title */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src={`data:image/jpeg;base64,${EST_LOGO_BASE64}`}
                      alt="EST Official Logo"
                      className="h-14 w-auto object-contain rounded drop-shadow-xs"
                    />
                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-wider text-slate-900 dark:text-white uppercase">
                        Proctor Attendance & Assignment Register
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span className="font-extrabold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px]">
                          Center :
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {centerClean}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sheet Tab Badge */}
                  <div className="text-center px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <div className="text-xs font-black">{sheet.name}</div>
                    <div className="text-[10px] font-semibold opacity-90">
                      {locale === "ar" ? "تاب معتمد" : "Official Sheet"}
                    </div>
                  </div>

                  {/* Meta Box */}
                  <div className="flex items-center gap-4 text-xs font-semibold bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Date:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{parsed.date}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">EST Type:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{parsed.estType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Proctors & Rooms - 10 Columns */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-extrabold text-[11px] uppercase tracking-wide">
                      <th className="w-10 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">No.</th>
                      <th className="py-2.5 px-3 text-start border-e border-slate-300 dark:border-slate-700">Name</th>
                      <th className="w-28 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Proctor Type</th>
                      <th className="w-28 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Mobile</th>
                      <th className="w-14 py-2.5 px-1 text-center border-e border-slate-300 dark:border-slate-700">IP / EP</th>
                      <th className="w-20 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700 font-extrabold">Room</th>
                      <th className="w-32 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Arrival Signature</th>
                      <th className="w-16 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Time</th>
                      <th className="w-32 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Departure Signature</th>
                      <th className="w-16 py-2.5 px-2 text-center border-e border-slate-300 dark:border-slate-700">Time</th>
                      <th className="w-14 py-2.5 px-1 text-center no-print text-rose-600 font-bold">{locale === "ar" ? "حذف" : "Del"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {filteredRows.map((r, rowIdx) => {
                      const isSenior = /Senior/i.test(r.proctorType);
                      const isRoaming = /Roaming/i.test(r.proctorType);
                      const isHead = /Head/i.test(r.proctorType);

                      const roomSpan = spanMap.get(rowIdx);
                      const shouldRenderRoomCell = roomSpan !== undefined;
                      const roomDisplay = resolvedRoomMap.get(rowIdx) || r.room || "";

                      return (
                        <tr
                          key={rowIdx}
                          className={cn(
                            "hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors",
                            isSenior && "bg-amber-50/40 dark:bg-amber-950/20 font-bold",
                            isRoaming && "bg-sky-50/30 dark:bg-sky-950/15",
                          )}
                        >
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500 border-e border-slate-200 dark:border-slate-800">
                            {r.no}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 border-e border-slate-200 dark:border-slate-800">
                            {r.name}
                          </td>
                          <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                                isSenior
                                  ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300"
                                  : isRoaming
                                  ? "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300"
                                  : isHead
                                  ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300"
                                  : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300",
                              )}
                            >
                              {r.proctorType}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-center text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800">
                            {r.mobile}
                          </td>
                          <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {r.ipEp || "EP"}
                            </span>
                          </td>

                          {/* Merged Room Cell: One large cell with room name centered, matching Excel */}
                          {shouldRenderRoomCell && (
                            <td
                              rowSpan={roomSpan}
                              className="py-3 px-3 text-center align-middle font-bold border-e border-slate-300 dark:border-slate-700 bg-sky-50/50 dark:bg-sky-950/20 text-slate-900 dark:text-slate-100"
                            >
                              <div className="font-extrabold text-xs sm:text-sm tracking-wide text-slate-900 dark:text-slate-100">
                                {roomDisplay}
                              </div>
                            </td>
                          )}

                          <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                            {r.arrivalSignature ? (
                              <span className="font-mono text-xs">{r.arrivalSignature}</span>
                            ) : (
                              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            {r.arrivalTime === ":" ? "__ : __" : (r.arrivalTime || "__ : __")}
                          </td>
                          <td className="py-2.5 px-2 text-center border-e border-slate-200 dark:border-slate-800 min-w-[90px]">
                            {r.departureSignature ? (
                              <span className="font-mono text-xs">{r.departureSignature}</span>
                            ) : (
                              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 h-4 mx-2" />
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-e border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            {r.departureTime === ":" ? "__ : __" : (r.departureTime || "__ : __")}
                          </td>
                          <td className="py-2.5 px-1 text-center no-print">
                            <button
                              type="button"
                              onClick={() => onDeleteRow(r.rawRowIdx, sheetRealIdx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title={locale === "ar" ? "حذف هذا المراقب" : "Delete this proctor"}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Official Signature Footer Bar */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-300 gap-4">
                <div>
                  <span className="font-bold text-slate-500">{locale === "ar" ? "رئيس السنتر:" : "Head of Center:"} </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{parsed.headName}</span>
                </div>
                <div className="font-medium text-slate-500">
                  <span>{locale === "ar" ? "التوقيع:" : "Signature:"} </span>
                  <span className="font-mono">___________________________________</span>
                </div>
                <div className="font-medium text-slate-500">
                  <span>{locale === "ar" ? "التاريخ:" : "Date:"} </span>
                  <span className="font-mono">___ / ___ / 2026</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

