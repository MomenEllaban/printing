"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Boxes,
  Package,
  Printer,
  Eye,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Building2,
  School,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/locale-provider";
import { EST_REFERENCE_DATA } from "@/lib/stickers/est-reference-data";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import { toast } from "sonner";

export default function LogisticsHubPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  // Filter selections
  const [examType, setExamType] = useState<"EST 1" | "EST 2">("EST 1");
  const [governorate, setGovernorate] = useState<string>("Alexandria");
  const [center, setCenter] = useState<string>("Abu Qir");
  const [building, setBuilding] = useState<string>("Pharmacy");
  const [sessionDate, setSessionDate] = useState<string>("December 2026");
  const [boxNumber, setBoxNumber] = useState<number>(1);
  const [totalBoxes, setTotalBoxes] = useState<number>(1);
  const [securitySeal, setSecuritySeal] = useState<string>("");

  // Loading & Preview state
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    open: boolean;
    url: string | null;
    title: string;
    customTitle?: string;
    customDescription?: string;
  }>({
    open: false,
    url: null,
    title: "",
  });

  // Extract unique options from reference data
  const governorates = useMemo(() => {
    return Array.from(new Set(EST_REFERENCE_DATA.map((r) => r.governorate).filter(Boolean)));
  }, []);

  const centers = useMemo(() => {
    return Array.from(
      new Set(
        EST_REFERENCE_DATA.filter((r) => !governorate || r.governorate === governorate)
          .map((r) => r.testCenter)
          .filter(Boolean),
      ),
    );
  }, [governorate]);

  const buildings = useMemo(() => {
    return Array.from(
      new Set(
        EST_REFERENCE_DATA.filter(
          (r) =>
            (!governorate || r.governorate === governorate) &&
            (!center || r.testCenter === center),
        )
          .map((r) => r.building)
          .filter(Boolean),
      ),
    );
  }, [governorate, center]);

  // Derived rooms for selected building
  const buildingRooms = useMemo(() => {
    const rows = EST_REFERENCE_DATA.filter(
      (r) =>
        (!governorate || r.governorate === governorate) &&
        (!center || r.testCenter === center) &&
        (!building || r.building === building),
    );
    const rooms = Array.from(new Set(rows.map((r) => r.room).filter(Boolean)));
    const totalStudents = rows.reduce((sum, r) => sum + (r.studentsEst1 || 25), 0);
    return {
      rooms,
      totalRooms: rooms.length > 0 ? rooms.length : 12,
      totalStudents: totalStudents > 0 ? totalStudents : 300,
    };
  }, [governorate, center, building]);

  // Execute Action (Show or Print)
  const handleLogisticsAction = useCallback(
    async (
      type: "carton" | "bag" | "clean_skin_master" | "clean_skin_subjects" | "bundle",
      action: "show" | "print",
    ) => {
      const actionKey = `${type}-${action}`;
      if (busyAction) return;

      setBusyAction(actionKey);
      const toastId = toast.loading(
        action === "show"
          ? isAr
            ? "جاري إنشاء ومعاينة ملف الطباعة..."
            : "Generating PDF preview..."
          : isAr
          ? "جاري إرسال المستند للطباعة..."
          : "Sending document to printer...",
      );

      try {
        const query = new URLSearchParams({
          type,
          examName: examType,
          governorate,
          center,
          building,
          date: sessionDate,
          totalRooms: String(buildingRooms.totalRooms),
          totalStudents: String(buildingRooms.totalStudents),
          roomNames: JSON.stringify(buildingRooms.rooms),
          boxNumber: String(boxNumber),
          totalBoxes: String(totalBoxes),
        });
        if (securitySeal) query.set("securitySeal", securitySeal);

        const res = await fetch(`/api/stickers/logistics?${query.toString()}`);
        if (!res.ok) {
          throw new Error(isAr ? "فشل إنشاء ملف الطباعة اللوجستية" : "Failed to generate logistics PDF");
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);

        if (action === "show") {
          let title = "Logistics PDF";
          let customTitle = "";
          let customDescription = "";

          if (type === "carton") {
            title = `Carton - ${building}`;
            customTitle = isAr ? `ستيكر كرتونة المبنى — ${building}` : `Building Carton Placard — ${building}`;
            customDescription = isAr
              ? "مقاس A4 بالعرض — يلصق على الكرتونة الكبيرة التي تحوي جميع أكياس ومظاريف المبنى مع مسرد القاعات."
              : "A4 Landscape — Affixed to the outside of the master carton containing all room envelopes.";
          } else if (type === "bag") {
            title = `Bag Checklist - ${building}`;
            customTitle = isAr ? `بيان شنطة الامتحانات (Checklist) — ${building}` : `Exam Transit Bag Checklist — ${building}`;
            customDescription = isAr
              ? `مقاس A4 — قائمة فحص المواد وتأشير الـ Checkboxes لـ ${examType} وبيانات القفل الأمني.`
              : `A4 Checklist — Subject checklists with checkboxes for ${examType} and security seal tracking.`;
          } else if (type === "clean_skin_master") {
            title = `Clean Skin Master - ${building}`;
            customTitle = isAr ? `مظروف أوراق الطوارئ والاحتياطي (Clean Skin Master)` : `Clean Skin Emergency Master Packet`;
            customDescription = isAr
              ? "مقاس A4 — ستيكر كيس الطوارئ الخارجي مع جدول توثيق صرف الأوراق الإضافية بالقاعات."
              : "A4 — Emergency reserve master envelope with on-site dispatch tracking log.";
          } else if (type === "clean_skin_subjects") {
            title = `Clean Skin Subjects - ${building}`;
            customTitle = isAr ? `ستيكرات المواد الاحتياطية (Clean Skin)` : `Clean Skin Subject Stickers`;
            customDescription = isAr
              ? "مقاس ربع A4 — خانة العدد مسطرة لكتابة الرقم يدوياً بالقلم بعد التعبئة الفعلية."
              : "Quarter-A4 — Quantity box formatted for manual pen entry after actual packing.";
          } else {
            title = `Logistics Bundle - ${building}`;
            customTitle = isAr ? `الحزمة اللوجستية الكاملة للمبنى — ${building}` : `Complete Logistics Bundle — ${building}`;
            customDescription = isAr
              ? "ملف مجمع شامل (الكرتونة + شنطة المواد + كيس الطوارئ + ستيكرات المواد الاحتياطية)."
              : "All-in-one bundle: Building Carton, Bag Checklist, Clean Skin Master, and Subject Stickers.";
          }

          setPreviewState({
            open: true,
            url: objectUrl,
            title,
            customTitle,
            customDescription,
          });
          toast.success(isAr ? "تم فتح المعاينة بنجاح" : "Preview opened", { id: toastId });
        } else {
          // Direct print via hidden iframe
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          iframe.src = objectUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              const w = window.open(objectUrl, "_blank");
              w?.focus();
              w?.print();
            }
          };
          toast.success(isAr ? "تم إرسال المستند للطباعة" : "Sent to printer", { id: toastId });
        }
      } catch (err) {
        console.error("[logistics-action] Error:", err);
        toast.error(err instanceof Error ? err.message : isAr ? "حدث خطأ أثناء الطباعة" : "Print failed", {
          id: toastId,
        });
      } finally {
        setBusyAction(null);
      }
    },
    [
      busyAction,
      isAr,
      examType,
      governorate,
      center,
      building,
      sessionDate,
      buildingRooms,
      boxNumber,
      totalBoxes,
      securitySeal,
    ],
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">
            <Package className="size-3.5" />
            <span>{isAr ? "العمليات اللوجستية وتجهيز الامتحانات" : "Exam Operations & Logistics"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="size-7 text-indigo-600 dark:text-indigo-400" />
            <span>{isAr ? "مركز الاستيكرات واللوجستيات" : "Logistics & Stickers Hub"}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isAr
              ? "طباعة استيكرات الكراتين، شنط الامتحانات، وقوائم الفحص، وأوراق الطوارئ (Clean Skin) لـ EST 1 و EST 2."
              : "Generate and print Building Carton Placards, Transit Bag Checklists, and Clean Skin Reserve Envelopes."}
          </p>
        </div>

        {/* Master Quick Bundle Button */}
        <button
          type="button"
          onClick={() => handleLogisticsAction("bundle", "print")}
          disabled={Boolean(busyAction)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          {busyAction === "bundle-print" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Printer className="size-4" />
          )}
          <span>{isAr ? "طباعة الحزمة الكاملة للمبنى 🖨️" : "Print Complete Building Bundle 🖨️"}</span>
        </button>
      </div>

      {/* Control Selector Bar */}
      <div className="card p-4 sm:p-5 border border-border shadow-xs bg-surface-soft/40 backdrop-blur-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Exam Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-indigo-500" />
              <span>{isAr ? "نوع الامتحان" : "Exam Session"}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface border border-border">
              <button
                type="button"
                onClick={() => setExamType("EST 1")}
                className={cn(
                  "py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                  examType === "EST 1"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                EST I
              </button>
              <button
                type="button"
                onClick={() => setExamType("EST 2")}
                className={cn(
                  "py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                  examType === "EST 2"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                EST II
              </button>
            </div>
          </div>

          {/* Governorate */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-sky-500" />
              <span>{isAr ? "المحافظة" : "Governorate"}</span>
            </label>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {governorates.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Test Center */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center gap-1.5">
              <School className="size-3.5 text-emerald-500" />
              <span>{isAr ? "السنتر / المركز" : "Test Center"}</span>
            </label>
            <select
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {centers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Building */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-amber-500" />
              <span>{isAr ? "المبنى" : "Building"}</span>
            </label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Details: Session Date, Box Count, Security Seal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-border/50 text-xs">
          <div>
            <span className="font-semibold text-muted block mb-1">
              {isAr ? "تاريخ الدورة / Session:" : "Session Date:"}
            </span>
            <input
              type="text"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              placeholder="December 2026"
              className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="font-semibold text-muted block mb-1">
                {isAr ? "رقم الكرتونة:" : "Box #:"}
              </span>
              <input
                type="number"
                min={1}
                value={boxNumber}
                onChange={(e) => setBoxNumber(Number(e.target.value) || 1)}
                className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface"
              />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-muted block mb-1">
                {isAr ? "إجمالي الكراتين:" : "Total Boxes:"}
              </span>
              <input
                type="number"
                min={1}
                value={totalBoxes}
                onChange={(e) => setTotalBoxes(Number(e.target.value) || 1)}
                className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface"
              />
            </div>
          </div>

          <div>
            <span className="font-semibold text-muted block mb-1">
              {isAr ? "رقم القفل الأمني (اختياري):" : "Security Seal # (Optional):"}
            </span>
            <input
              type="text"
              value={securitySeal}
              onChange={(e) => setSecuritySeal(e.target.value)}
              placeholder="e.g. EST-SEAL-88492"
              className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface"
            />
          </div>
        </div>

        {/* Live Detected Stats Banner */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-3">
            <span className="font-bold flex items-center gap-1">
              <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{buildingRooms.totalRooms} {isAr ? "قاعة مسجلة بالمبنى" : "Rooms in Building"}</span>
            </span>
            <span className="text-muted/60">•</span>
            <span>{buildingRooms.totalStudents} {isAr ? "طالب ممتحن تقديري" : "Estimated Candidates"}</span>
          </div>
          <span className="font-mono text-[11px] text-muted">
            {buildingRooms.rooms.slice(0, 8).join(", ")}
            {buildingRooms.rooms.length > 8 ? ` +${buildingRooms.rooms.length - 8}` : ""}
          </span>
        </div>
      </div>

      {/* Main 4 Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Building Carton Sticker (A4 Landscape) */}
        <div className="card p-5 border-2 border-border/80 hover:border-indigo-500/50 transition-all rounded-2xl flex flex-col justify-between group shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <Package className="size-4" />
                <span>{isAr ? "كرتونة المبنى" : "Building Carton"}</span>
              </div>
              <span className="text-[11px] font-semibold text-muted bg-surface-strong px-2 py-0.5 rounded">
                A4 Landscape
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground">
              {isAr ? "ستيكر كرتونة أكياس المبنى" : "Master Building Carton Placard"}
            </h3>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              {isAr
                ? "يُلصق على الكرتونة الكبيرة التي تحوي جميع أظرف وأكياس لجان المبنى بالكامل. يحتوي على مسرد كامل للقاعات (Room Directory)، إجمالي الطلاب، وخانة القفل الأمني."
                : "Affixed to the master carton box containing all room dossiers. Includes the full room directory grid, total candidates count, and security seal tracking."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              {building} — {buildingRooms.totalRooms} {isAr ? "قاعة" : "Rooms"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLogisticsAction("carton", "show")}
                disabled={Boolean(busyAction)}
                className="btn btn-secondary text-xs h-9 px-3 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "carton-show" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{isAr ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogisticsAction("carton", "print")}
                disabled={Boolean(busyAction)}
                className="btn btn-primary text-xs h-9 px-3.5 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "carton-print" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                <span>{isAr ? "طباعة" : "Print"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Exam Transit Bag Checklist (A4 Portrait) */}
        <div className="card p-5 border-2 border-border/80 hover:border-emerald-500/50 transition-all rounded-2xl flex flex-col justify-between group shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <FileCheck2 className="size-4" />
                <span>{isAr ? "بيان الشنطة" : "Bag Checklist"}</span>
              </div>
              <span className="text-[11px] font-semibold text-muted bg-surface-strong px-2 py-0.5 rounded">
                A4 Portrait
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground">
              {isAr ? "بيان فحص شنطة الامتحانات (Checklist)" : "Exam Transit Bag Security Checklist"}
            </h3>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              {isAr
                ? `يُلصق على شنطة نقل الامتحانات. يحتوي على جدول بجميع المواد لـ ${examType} مع مربعات اختيار [ ] للتأشير بالقلم عند وضع المظاريف، وتوثيق عدد الأكياس والقفل الأمني.`
                : `Affixed to the transit bag. Features check-boxes [ ] for all ${examType} subjects, envelope count verification, and chain-of-custody seal signatures.`}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              {examType}: {examType === "EST 2" ? "Math 1, Math 2, Bio, Chem, Phy" : "Lit, Math, Essay"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLogisticsAction("bag", "show")}
                disabled={Boolean(busyAction)}
                className="btn btn-secondary text-xs h-9 px-3 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "bag-show" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{isAr ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogisticsAction("bag", "print")}
                disabled={Boolean(busyAction)}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "bag-print" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                <span>{isAr ? "طباعة" : "Print"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Clean Skin Master Outer Envelope (A4 Portrait) */}
        <div className="card p-5 border-2 border-border/80 hover:border-rose-500/50 transition-all rounded-2xl flex flex-col justify-between group shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <ShieldAlert className="size-4" />
                <span>{isAr ? "طوارئ الكنترول" : "Emergency Master"}</span>
              </div>
              <span className="text-[11px] font-semibold text-muted bg-surface-strong px-2 py-0.5 rounded">
                A4 Master Envelope
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground">
              {isAr ? "كيس أوراق الطوارئ والاحتياطي (Clean Skin Master)" : "Clean Skin Master Emergency Envelope"}
            </h3>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              {isAr
                ? "يُلصق على كيس الطوارئ الخارجي الخاص بكنترول المبنى. يحتوي على تحذيرات أمنية مشددة وجدول مسطر جاهز للكتابة اليدوية لتوثيق صرف أي ورقة احتياطية لأي قاعة."
                : "Affixed to the master emergency packet for building control. Features strict security warnings and a full manual dispatch tracking log sheet."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              {isAr ? "سجل توثيق واستبدال التالف" : "Replacement & Incident Log"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLogisticsAction("clean_skin_master", "show")}
                disabled={Boolean(busyAction)}
                className="btn btn-secondary text-xs h-9 px-3 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "clean_skin_master-show" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span>{isAr ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogisticsAction("clean_skin_master", "print")}
                disabled={Boolean(busyAction)}
                className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-3.5 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "clean_skin_master-print" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                <span>{isAr ? "طباعة" : "Print"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Clean Skin Subject Stickers (Quarter A4) */}
        <div className="card p-5 border-2 border-border/80 hover:border-amber-500/50 transition-all rounded-2xl flex flex-col justify-between group shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Boxes className="size-4" />
                <span>{isAr ? "ستيكرات المواد (طوارئ)" : "Subject Spare Stickers"}</span>
              </div>
              <span className="text-[11px] font-semibold text-muted bg-surface-strong px-2 py-0.5 rounded">
                Quarter A4 (4-up)
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground">
              {isAr ? "ستيكرات المواد الاحتياطية (كتابة يدوية للعدد)" : "Clean Skin Subject Stickers (Manual Count)"}
            </h3>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              {isAr
                ? "ستيكرات لكل مادة بمقاس ربع صفحة A4 متناسقة تماماً مع ستيكرات الامتحانات، مع ترك خانة العدد فارغة ومسطرة لكتابة العدد الفعلي بالقلم بعد التجهيز."
                : "Quarter-A4 stickers for each subject. Features a prominent blank quantity underline so staff can write the actual packet count with a pen after packing."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              {isAr ? "خانة عدد فارغة [ _____ ] نسخ" : "Blank count box [ _____ ] copies"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLogisticsAction("clean_skin_subjects", "show")}
                disabled={Boolean(busyAction)}
                className="btn btn-secondary text-xs h-9 px-3 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "clean_skin_subjects-show" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{isAr ? "معاينة" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogisticsAction("clean_skin_subjects", "print")}
                disabled={Boolean(busyAction)}
                className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-3.5 gap-1.5 cursor-pointer font-bold"
              >
                {busyAction === "clean_skin_subjects-print" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                <span>{isAr ? "طباعة" : "Print"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Bundle Master Card */}
      <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-surface to-purple-500/10 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Boxes className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                {isAr
                  ? "الحزمة اللوجستية المجمعة للمبنى (Complete Logistics Bundle)"
                  : "All-in-One Building Logistics Bundle"}
              </h3>
            </div>
            <p className="text-xs text-muted max-w-2xl">
              {isAr
                ? "توليد ملف PDF موحد يحتوي على جميع المستندات اللوجستية أعلاه لمبنى " +
                  building +
                  " دفعة واحدة (الكرتونة + الشنطة + كيس الطوارئ + استيكرات المواد)."
                : "Generates one consolidated PDF containing all logistics carrier sheets for " +
                  building +
                  " in a single print job."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleLogisticsAction("bundle", "show")}
              disabled={Boolean(busyAction)}
              className="flex-1 sm:flex-initial btn btn-secondary text-xs h-10 px-4 font-bold cursor-pointer"
            >
              {busyAction === "bundle-show" ? (
                <Loader2 className="size-4 animate-spin text-indigo-600" />
              ) : (
                <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{isAr ? "معاينة شاملة" : "Preview All"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("bundle", "print")}
              disabled={Boolean(busyAction)}
              className="flex-1 sm:flex-initial btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 px-5 font-bold cursor-pointer shadow-sm shadow-indigo-500/25"
            >
              {busyAction === "bundle-print" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              <span>{isAr ? "طباعة الحزمة كاملة" : "Print Bundle"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Live Preview Modal */}
      <StickerPreviewModal
        open={previewState.open}
        onClose={() => setPreviewState({ open: false, url: null, title: "" })}
        pdfUrl={previewState.url}
        title={previewState.title}
        customTitle={previewState.customTitle}
        customDescription={previewState.customDescription}
      />
    </div>
  );
}
