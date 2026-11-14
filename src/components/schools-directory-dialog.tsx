"use client";

import { useState, useMemo } from "react";
import {
  School,
  Building2,
  Layers,
  DoorOpen,
  Users,
  Search,
  X,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  OFFICIAL_EST_SCHOOLS,
  OFFICIAL_EST_CENTERS,
  OFFICIAL_GOVERNORATES,
  getSchoolOrBuildingStats,
  type SchoolOrBuildingStats,
} from "@/lib/stickers/est-reference-data";
import { Button, Input, Modal } from "./ui";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";

export interface SchoolsDirectoryDialogProps {
  open: boolean;
  onClose: () => void;
  onNavigateToFolder: (target: {
    name: string;
    governorate: string;
    isSchool: boolean;
  }) => Promise<void> | void;
  locale: Locale;
  currentExam?: string;
  isNavigating?: boolean;
}

export function SchoolsDirectoryDialog({
  open,
  onClose,
  onNavigateToFolder,
  locale,
  currentExam = "EST 1",
  isNavigating = false,
}: SchoolsDirectoryDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedGov, setSelectedGov] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "school" | "center">("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [navigatingName, setNavigatingName] = useState<string | null>(null);

  // Build unified directory list combining schools and centers
  const directoryItems: SchoolOrBuildingStats[] = useMemo(() => {
    const list: SchoolOrBuildingStats[] = [];

    // 1. All 18 Official Schools
    for (const school of OFFICIAL_EST_SCHOOLS) {
      const stats = getSchoolOrBuildingStats(school.schoolName, school.governorate);
      if (stats) {
        list.push(stats);
      }
    }

    // 2. All 7 University Campuses / Centers
    for (const center of OFFICIAL_EST_CENTERS) {
      const stats = getSchoolOrBuildingStats(center.centerName, center.governorate);
      if (stats) {
        list.push(stats);
      }
    }

    return list;
  }, []);

  // Filter items by search, governorate, and type
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directoryItems.filter((item) => {
      // Governorate filter
      if (selectedGov !== "all" && item.governorate?.toLowerCase() !== selectedGov.toLowerCase()) {
        return false;
      }

      // Type filter
      if (typeFilter === "school" && !item.isSchool) return false;
      if (typeFilter === "center" && !item.isCenter) return false;

      // Text search
      if (!q) return true;
      const matchName = item.name.toLowerCase().includes(q) || item.cleanName.toLowerCase().includes(q);
      const matchGov = item.governorate?.toLowerCase().includes(q) || false;
      const matchRoom = item.floors.some((fl) =>
        fl.rooms.some((r) => r.toLowerCase().includes(q) || fl.floorName.toLowerCase().includes(q)),
      );

      return matchName || matchGov || matchRoom;
    });
  }, [directoryItems, search, selectedGov, typeFilter]);

  const toggleExpandCard = (name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleCardNavigate = async (item: SchoolOrBuildingStats) => {
    setNavigatingName(item.name);
    try {
      await onNavigateToFolder({
        name: item.name,
        governorate: item.governorate || "",
        isSchool: item.isSchool,
      });
      onClose();
    } finally {
      setNavigatingName(null);
    }
  };

  const totalSchoolsCount = OFFICIAL_EST_SCHOOLS.length;
  const totalCentersCount = OFFICIAL_EST_CENTERS.length;
  const totalRoomsCount = directoryItems.reduce((sum, item) => sum + item.totalRooms, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        locale === "ar"
          ? "🏫 دليل المدارس والسناتر الامتحانية (EST)"
          : "🏫 Schools & Centers Directory (EST)"
      }
      description={
        locale === "ar"
          ? `تصفح ${totalSchoolsCount} مدرسة دولية و ${totalCentersCount} مراكز جامعية (${totalRoomsCount} قاعة) والانتقال السريع لأي مجلد`
          : `Browse ${totalSchoolsCount} official schools and ${totalCentersCount} centers (${totalRoomsCount} rooms) with quick jump`
      }
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] flex flex-col">
        {/* Search & Exam Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "ابحث باسم المدرسة، المركز، القاعة، أو المحافظة..."
                  : "Search school, center, room, or governorate..."
              }
              className="h-9 ps-9 pe-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer p-0.5"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-muted">
              {locale === "ar" ? "الاختبار:" : "Exam:"}
            </span>
            <span className="inline-flex items-center rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent border border-accent/30">
              {currentExam}
            </span>
          </div>
        </div>

        {/* Filters Bar: Governorates & Type */}
        <div className="space-y-2">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted font-medium">{locale === "ar" ? "النوع:" : "Type:"}</span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                typeFilter === "all"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface text-muted hover:bg-surface-strong hover:text-foreground",
              )}
            >
              {locale === "ar" ? `الكل (${directoryItems.length})` : `All (${directoryItems.length})`}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("school")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1",
                typeFilter === "school"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-surface text-muted hover:bg-surface-strong hover:text-foreground",
              )}
            >
              <School className="size-3" />
              <span>{locale === "ar" ? `مدارس (${totalSchoolsCount})` : `Schools (${totalSchoolsCount})`}</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("center")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1",
                typeFilter === "center"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-surface text-muted hover:bg-surface-strong hover:text-foreground",
              )}
            >
              <Building2 className="size-3" />
              <span>{locale === "ar" ? `سناتر جامعية (${totalCentersCount})` : `Centers (${totalCentersCount})`}</span>
            </button>
          </div>

          {/* Governorate Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-muted font-medium shrink-0">
              {locale === "ar" ? "المحافظة:" : "City:"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedGov("all")}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors",
                selectedGov === "all"
                  ? "bg-foreground text-background font-bold"
                  : "bg-surface text-muted hover:text-foreground",
              )}
            >
              {locale === "ar" ? "جميع المحافظات" : "All Cities"}
            </button>
            {OFFICIAL_GOVERNORATES.map((gov) => {
              const count = directoryItems.filter(
                (i) => i.governorate?.toLowerCase() === gov.toLowerCase(),
              ).length;
              return (
                <button
                  key={gov}
                  type="button"
                  onClick={() => setSelectedGov(gov)}
                  className={cn(
                    "px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1",
                    selectedGov.toLowerCase() === gov.toLowerCase()
                      ? "bg-foreground text-background font-bold"
                      : "bg-surface text-muted hover:text-foreground",
                  )}
                >
                  <span>{gov}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pe-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <School className="size-10 mx-auto text-muted/40 mb-2" />
              <p className="font-semibold">
                {locale === "ar" ? "لم يتم العثور على نتائج مطابقة" : "No matching schools or centers found"}
              </p>
              <p className="text-xs mt-1">
                {locale === "ar" ? "جرب البحث باسم آخر أو إزالة الفلاتر" : "Try a different search term or filter"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedCards.has(item.name);
              const isLoading = isNavigating && navigatingName === item.name;

              return (
                <div
                  key={item.name}
                  className="rounded-xl border border-border/80 bg-surface/50 hover:bg-surface/90 hover:border-accent/40 p-3 sm:p-4 transition-all shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
                          {item.isSchool ? <School className="size-4" /> : <Building2 className="size-4" />}
                        </span>
                        <h4 className="font-bold text-foreground text-sm sm:text-base truncate">
                          {item.name}
                        </h4>
                        {item.governorate && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            <MapPin className="size-2.5" />
                            {item.governorate}
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold border",
                            item.isSchool
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                              : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
                          )}
                        >
                          {item.isSchool
                            ? locale === "ar"
                              ? "مدرسة رسمية"
                              : "School"
                            : locale === "ar"
                              ? "مركز جامعي"
                              : "Center"}
                        </span>
                      </div>

                      {/* Stats Pills */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Layers className="size-3.5 text-sky-600 dark:text-sky-400" />
                          <span>
                            {item.totalFloors} {locale === "ar" ? "أدوار" : "Floors"}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <DoorOpen className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {item.totalRooms} {locale === "ar" ? "قاعة" : "Rooms"}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Users className="size-3.5 text-muted" />
                          <span>~{item.totalRooms * 25} {locale === "ar" ? "طالب" : "Students"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        onClick={() => toggleExpandCard(item.name)}
                        className="text-xs h-8 px-2.5 cursor-pointer"
                        title={
                          isExpanded
                            ? locale === "ar"
                              ? "إخفاء تفاصيل الأدوار"
                              : "Hide floors details"
                            : locale === "ar"
                              ? "عرض تفاصيل الأدوار والقاعات"
                              : "View floors and rooms details"
                        }
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-3.5" />
                            <span className="hidden sm:inline">{locale === "ar" ? "إخفاء" : "Hide"}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3.5" />
                            <span className="hidden sm:inline">{locale === "ar" ? "التفاصيل" : "Details"}</span>
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => void handleCardNavigate(item)}
                        disabled={isLoading}
                        className="text-xs h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer shadow-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="size-3.5" />
                        )}
                        <span>{locale === "ar" ? "انتقال للمجلد" : "Open Folder"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Floors & Rooms List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in-50 duration-150">
                      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <Layers className="size-3 text-sky-600 dark:text-sky-400" />
                        <span>
                          {locale === "ar"
                            ? "توزيع الأدوار والقاعات الرسمية:"
                            : "Floors & Rooms Directory:"}
                        </span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.floors.map((fl) => (
                          <div
                            key={fl.floorName}
                            className="rounded-lg bg-surface-strong/70 border border-border/50 p-2"
                          >
                            <div className="flex items-center justify-between font-semibold text-foreground mb-1">
                              <span>{fl.floorName}</span>
                              <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-800 dark:text-sky-200">
                                {fl.roomCount} {locale === "ar" ? "قاعات" : "rooms"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted line-clamp-2">
                              {fl.rooms.join(" • ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

