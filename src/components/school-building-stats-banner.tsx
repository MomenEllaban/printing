"use client";

import { useMemo } from "react";
import {
  School,
  Building2,
  Layers,
  DoorOpen,
  Users,
  FileSpreadsheet,
  Boxes,
  Printer,
  ChevronRight,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";
import type { SchoolOrBuildingStats } from "@/lib/stickers/est-reference-data";
import Link from "next/link";

export interface SchoolBuildingStatsBannerProps {
  stats: SchoolOrBuildingStats | null;
  floorStats?: { floorName: string; roomCount: number; rooms: string[] } | null;
  currentFolderName: string;
  isFloor: boolean;
  parentBuildingName?: string;
  governorate?: string;
  examName?: string;
  cycleName?: string;
  locale: Locale;
  buildingExcelItem?: { id: string; name: string } | null;
  floorFoldersInView?: Array<{ id: string; name: string }>;
  onNavigateToFloor?: (floorId: string) => void;
  onPrintSticker?: (orientation: "portrait" | "landscape") => void;
  onPrintExamStickers?: (orientation: "portrait" | "landscape") => void;
  onOpenBuildingExcel?: (fileId: string) => void;
}

export function SchoolBuildingStatsBanner({
  stats,
  floorStats,
  currentFolderName,
  isFloor,
  parentBuildingName,
  governorate,
  examName = "EST 1",
  cycleName,
  locale,
  buildingExcelItem,
  floorFoldersInView = [],
  onNavigateToFloor,
  onPrintSticker,
  onPrintExamStickers,
  onOpenBuildingExcel,
}: SchoolBuildingStatsBannerProps) {
  // If inside a Floor folder: render Floor overview
  if (isFloor) {
    const roomCount = floorStats?.roomCount ?? 0;
    const rooms = floorStats?.rooms ?? [];

    return (
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-linear-to-br from-indigo-500/10 via-surface-strong/80 to-purple-500/10 p-3.5 sm:p-4 mb-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Layers className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted font-medium">
                  {parentBuildingName ? `${parentBuildingName} /` : ""}
                </span>
                <h3 className="font-bold text-foreground text-base sm:text-lg truncate">
                  {currentFolderName}
                </h3>
                {governorate && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    <MapPin className="size-2.5" />
                    {governorate}
                  </span>
                )}
                <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  {examName}
                </span>
              </div>

              {/* Stats badges */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-foreground bg-surface/80 px-2 py-0.5 rounded-md border border-border/60">
                  <DoorOpen className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {roomCount > 0 ? roomCount : "—"} {locale === "ar" ? "قاعات بهذا الدور" : "Rooms on this floor"}
                  </span>
                </span>
                {roomCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-muted text-[11px]">
                    <Users className="size-3 text-muted" />
                    <span>~{roomCount * 25} {locale === "ar" ? "طالب متوقع" : "Est. students"}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Floor Quick Actions */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {onPrintExamStickers && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => onPrintExamStickers("portrait")}
                  className="text-xs h-8 px-2.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer"
                  title={
                    locale === "ar"
                      ? "طباعة ملصقات كيسة امتحانات الدور (طولي A4)"
                      : "Print floor exam placards (Portrait A4)"
                  }
                >
                  <Printer className="size-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{locale === "ar" ? "كيسة الامتحانات (طولي)" : "Bag Placard (P)"}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onPrintExamStickers("landscape")}
                  className="text-xs h-8 px-2.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer"
                  title={
                    locale === "ar"
                      ? "طباعة ملصقات كيسة امتحانات الدور (عرضي A4)"
                      : "Print floor exam placards (Landscape A4)"
                  }
                >
                  <Printer className="size-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{locale === "ar" ? "كيسة الامتحانات (عرضي)" : "Bag Placard (L)"}</span>
                </Button>
              </>
            )}

            {onPrintSticker && (
              <Button
                variant="secondary"
                onClick={() => onPrintSticker("portrait")}
                className="text-xs h-8 px-2.5 cursor-pointer"
                title={locale === "ar" ? "طباعة استيكر الدور" : "Print floor sticker"}
              >
                <Printer className="size-3.5" />
                <span>{locale === "ar" ? "استيكر الدور" : "Floor Sticker"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Room Pills list */}
        {rooms.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-muted me-1">
              {locale === "ar" ? "قاعات الدور:" : "Rooms:"}
            </span>
            {rooms.map((rm) => (
              <span
                key={rm}
                className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-mono font-bold text-foreground border border-border/70 shadow-2xs"
              >
                {rm}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If inside a School or Building folder: render Building / School overview
  if (stats) {
    const totalFloors = stats.totalFloors;
    const totalRooms = stats.totalRooms;
    const estStudents = totalRooms * 25;

    const logisticsParams = new URLSearchParams();
    if (cycleName) logisticsParams.set("cycle", cycleName);
    if (examName) logisticsParams.set("exam", examName);
    if (stats.governorate) logisticsParams.set("governorate", stats.governorate);
    if (stats.name) logisticsParams.set("building", stats.name);

    return (
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-linear-to-br from-sky-500/10 via-surface-strong/90 to-indigo-500/10 p-4 sm:p-5 mb-3.5 shadow-xs">
        {/* Top Row: Title, Badges, and Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <span className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/25">
              {stats.isSchool ? <School className="size-6" /> : <Building2 className="size-6" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-lg sm:text-xl truncate">
                  {stats.name}
                </h3>
                {stats.governorate && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-200 border border-amber-500/30">
                    <MapPin className="size-3 text-amber-600 dark:text-amber-400" />
                    <span>{stats.governorate}</span>
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-bold border",
                    stats.isSchool
                      ? "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30"
                      : "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
                  )}
                >
                  {stats.isSchool
                    ? locale === "ar"
                      ? "مدرسة رسمية"
                      : "Official School"
                    : locale === "ar"
                      ? "مركز جامعي"
                      : "Center"}
                </span>
                <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent border border-accent/30">
                  {examName}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                {locale === "ar"
                  ? "تفاصيل السنتر والمبنى وتوزيع الأدوار والقاعات للاختبار"
                  : "Building details, floor plans, and rooms allocation for EST"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Logistics Link */}
            <Link
              href={`/logistics?${logisticsParams.toString()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer transition-all shadow-xs"
              title={
                locale === "ar"
                  ? "فتح مركز اللوجستيات والكراتين لهذا المبنى"
                  : "Open Logistics Hub for this building"
              }
            >
              <Boxes className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>{locale === "ar" ? "اللوجستيات والكراتين" : "Logistics Hub"}</span>
            </Link>

            {/* Building Stickers Buttons */}
            {onPrintSticker && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => onPrintSticker("portrait")}
                  className="text-xs h-8 px-2.5 cursor-pointer border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10"
                  title={locale === "ar" ? "طباعة استيكر المبنى بالطول (Portrait)" : "Print building sticker (Portrait)"}
                >
                  <Printer className="size-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{locale === "ar" ? "استيكر المبنى (طولي)" : "Sticker (P)"}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onPrintSticker("landscape")}
                  className="text-xs h-8 px-2.5 cursor-pointer border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10"
                  title={locale === "ar" ? "طباعة استيكر المبنى بالعرض (Landscape)" : "Print building sticker (Landscape)"}
                >
                  <Printer className="size-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{locale === "ar" ? "استيكر المبنى (عرضي)" : "Sticker (L)"}</span>
                </Button>
              </>
            )}

            {/* Building Excel Master Register */}
            {buildingExcelItem && onOpenBuildingExcel && (
              <Button
                variant="secondary"
                onClick={() => onOpenBuildingExcel(buildingExcelItem.id)}
                className="text-xs h-8 px-2.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                title={locale === "ar" ? "فتح السجل العام المجمع للمبنى (Excel)" : "Open Building Master Register (Excel)"}
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{locale === "ar" ? "السجل العام (Excel)" : "Master Excel"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4 Metrics Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="rounded-xl border border-border/70 bg-surface/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <Layers className="size-3.5 text-sky-600 dark:text-sky-400" />
              <span>{locale === "ar" ? "إجمالي الأدوار" : "Total Floors"}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">
              {totalFloors} {locale === "ar" ? "أدوار" : "Floors"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <DoorOpen className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{locale === "ar" ? "إجمالي القاعات" : "Total Rooms"}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">
              {totalRooms} {locale === "ar" ? "قاعة" : "Rooms"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <Users className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>{locale === "ar" ? "الطلاب المتوقعين" : "Est. Students"}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">
              ~{estStudents} {locale === "ar" ? "طالب" : "Students"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>{locale === "ar" ? "طبيعة المركز" : "Center Model"}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              {locale === "ar" ? "المدرسة = السنتر والمبنى" : "School = Center & Bldg"}
            </p>
          </div>
        </div>

        {/* Floors and Rooms Summary Breakdown */}
        {stats.floors.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-sky-600 dark:text-sky-400" />
                <span>
                  {locale === "ar"
                    ? "توزيع الأدوار والقاعات (اضغط للدخول المباشر للدور):"
                    : "Floor Plan & Rooms (Click to jump to floor):"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stats.floors.map((fl) => {
                // Find matching folder in current view if available
                const matchingFloorFolder = floorFoldersInView.find(
                  (f) => f.name.trim().toLowerCase() === fl.floorName.trim().toLowerCase(),
                );

                return (
                  <button
                    key={fl.floorName}
                    type="button"
                    disabled={!matchingFloorFolder || !onNavigateToFloor}
                    onClick={() => {
                      if (matchingFloorFolder && onNavigateToFloor) {
                        onNavigateToFloor(matchingFloorFolder.id);
                      }
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-start border transition-all flex items-center gap-2",
                      matchingFloorFolder
                        ? "bg-surface hover:bg-surface-strong hover:border-sky-500/50 cursor-pointer shadow-2xs text-foreground"
                        : "bg-surface/50 opacity-80 border-border text-muted",
                    )}
                    title={
                      matchingFloorFolder
                        ? locale === "ar"
                          ? `انتقال مباشر إلى مجلد "${fl.floorName}"`
                          : `Jump to "${fl.floorName}" folder`
                        : undefined
                    }
                  >
                    <span className="font-bold">{fl.floorName}:</span>
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.2 text-[10px] font-bold text-sky-800 dark:text-sky-200">
                      {fl.roomCount} {locale === "ar" ? "قاعات" : "rooms"}
                    </span>
                    {matchingFloorFolder && <ChevronRight className="size-3 text-muted rtl:rotate-180" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

