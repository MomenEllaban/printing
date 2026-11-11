"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  Package,
  Printer,
  Eye,
  Sparkles,
  Loader2,
  Building2,
  Calendar,
  Layers,
  FolderTree,
  RefreshCw,
  FolderCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/locale-provider";
import { parseSchoolFolderName, OFFICIAL_EST_SCHOOLS } from "@/lib/stickers/est-reference-data";
import { parseEstRoomFileName } from "@/lib/stickers/est-room-data";
import { isFloorFolderName, isRoomFolderName } from "@/lib/stickers/register-utils";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import { toast } from "sonner";
import type { DriveItem } from "@/lib/types";

interface DriveFolderOption {
  id: string;
  name: string;
}

interface DriveSchoolOption {
  id: string;
  name: string;
  fullFolderName: string;
  governorate?: string;
}

interface LiveFloorData {
  floor: string;
  rooms: Array<{
    room: string;
    studentCount: number;
    subjectsText?: string;
  }>;
  totalStudents: number;
}

export default function LogisticsHubPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();
  const urlFolderId = searchParams.get("folderId") || undefined;
  const urlBuilding = searchParams.get("building") || undefined;

  // 1. Dynamic Drive State
  const [sessions, setSessions] = useState<DriveFolderOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSessionName, setSelectedSessionName] = useState<string>("December 2026");
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);

  const [exams, setExams] = useState<DriveFolderOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedExamName, setSelectedExamName] = useState<string>("EST 1");
  const [loadingExams, setLoadingExams] = useState<boolean>(false);

  const [schools, setSchools] = useState<DriveSchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<DriveSchoolOption | null>(null);
  const [loadingSchools, setLoadingSchools] = useState<boolean>(false);

  const [liveFloors, setLiveFloors] = useState<LiveFloorData[]>([]);
  const [loadingFloors, setLoadingFloors] = useState<boolean>(false);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);

  // Manual Dispatch Overrides
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

  // ----------------------------------------------------
  // STEP 1: Load Session / Cycle Folders (e.g. December 2026)
  // ----------------------------------------------------
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/drive/files?pageSize=100", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        setIsDriveConnected(true);
        const folders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);

        // Find date / session folders
        const dateFolders = folders.filter((f) =>
          /^(december|october|november|january|february|march|april|may|june|july|august|september|oct|nov|dec)\s*\d{4}/i.test(
            f.name.trim(),
          ) || /session|cycle|دورة/i.test(f.name),
        );

        const list: DriveFolderOption[] =
          dateFolders.length > 0
            ? dateFolders.map((f) => ({ id: f.id, name: f.name }))
            : folders.map((f) => ({ id: f.id, name: f.name }));

        if (list.length > 0) {
          setSessions(list);
          setSelectedSessionId(list[0].id);
          setSelectedSessionName(list[0].name);
        } else {
          // Fallback root session
          const fallback = [{ id: "root", name: "December 2026" }];
          setSessions(fallback);
          setSelectedSessionId("root");
          setSelectedSessionName("December 2026");
        }
      }
    } catch (err) {
      console.error("[logistics] Failed to load sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // ----------------------------------------------------
  // STEP 2: Load Exam Folders (EST 1, EST 2) inside selected session
  // ----------------------------------------------------
  const loadExams = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setLoadingExams(true);
    try {
      const url =
        sessionId === "root"
          ? "/api/drive/files?pageSize=100"
          : `/api/drive/files?folder=${encodeURIComponent(sessionId)}&pageSize=100`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        const folders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);
        const estFolders = folders.filter((f) => /^EST/i.test(f.name.trim()));
        const list: DriveFolderOption[] =
          estFolders.length > 0
            ? estFolders.map((f) => ({ id: f.id, name: f.name }))
            : folders.map((f) => ({ id: f.id, name: f.name }));

        setExams(list);
        if (list.length > 0) {
          const est1 = list.find((e) => /EST\s*[-_]?\s*1\b|EST\s*I\b/i.test(e.name)) || list[0];
          setSelectedExamId(est1.id);
          setSelectedExamName(est1.name);
        }
      }
    } catch (err) {
      console.error("[logistics] Failed to load exams:", err);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      void loadExams(selectedSessionId);
    }
  }, [selectedSessionId, loadExams]);

  // ----------------------------------------------------
  // STEP 3: Load Schools / Buildings inside selected exam folder
  // ----------------------------------------------------
  const loadSchools = useCallback(
    async (examId: string) => {
      if (!examId) return;
      setLoadingSchools(true);
      try {
        const res = await fetch(`/api/drive/files?folder=${encodeURIComponent(examId)}&pageSize=100`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          const folders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);

          // Check if there is a "Schools" subfolder
          const schoolsFolder = folders.find((f) => /^schools$/i.test(f.name.trim()));
          let schoolFolders: DriveItem[] = [];

          if (schoolsFolder) {
            const sRes = await fetch(
              `/api/drive/files?folder=${encodeURIComponent(schoolsFolder.id)}&pageSize=100`,
              { cache: "no-store" },
            );
            const sData = await sRes.json().catch(() => ({}));
            if (sRes.ok && Array.isArray(sData.items)) {
              schoolFolders = sData.items.filter((i: DriveItem) => i.isFolder);
            }
          } else {
            // Check if folders are Governorates
            const govFolders = folders.filter((f) =>
              /^(cairo|alexandria|giza|qalyubia|dakahlia|menofia|suez|القاهرة|الإسكندرية)/i.test(
                f.name.trim(),
              ),
            );
            if (govFolders.length > 0) {
              for (const gf of govFolders) {
                const gRes = await fetch(
                  `/api/drive/files?folder=${encodeURIComponent(gf.id)}&pageSize=100`,
                  { cache: "no-store" },
                );
                const gData = await gRes.json().catch(() => ({}));
                if (gRes.ok && Array.isArray(gData.items)) {
                  schoolFolders.push(...gData.items.filter((i: DriveItem) => i.isFolder));
                }
              }
            } else {
              schoolFolders = folders;
            }
          }

          const schoolOptions: DriveSchoolOption[] = schoolFolders.map((sf) => {
            const parsed = parseSchoolFolderName(sf.name);
            return {
              id: sf.id,
              name: parsed.schoolName || sf.name,
              fullFolderName: sf.name,
              governorate: parsed.governorate,
            };
          });

          setSchools(schoolOptions);

          if (schoolOptions.length > 0) {
            // Check if URL specifies this folder or building
            let matched = urlFolderId ? schoolOptions.find((s) => s.id === urlFolderId) : null;
            if (!matched && urlBuilding) {
              const uClean = urlBuilding.toLowerCase().trim();
              matched = schoolOptions.find(
                (s) =>
                  s.fullFolderName.toLowerCase().trim() === uClean ||
                  s.name.toLowerCase().trim() === uClean,
              );
            }
            const chosen = matched || schoolOptions[0];
            setSelectedSchoolId(chosen.id);
            setSelectedSchool(chosen);
          }
        }
      } catch (err) {
        console.error("[logistics] Failed to load schools:", err);
      } finally {
        setLoadingSchools(false);
      }
    },
    [urlFolderId, urlBuilding],
  );

  useEffect(() => {
    if (selectedExamId) {
      void loadSchools(selectedExamId);
    }
  }, [selectedExamId, loadSchools]);

  // ----------------------------------------------------
  // STEP 4: Load Floors, Rooms, and Candidates from Google Drive files
  // ----------------------------------------------------
  const loadSchoolDetails = useCallback(async (schoolId: string) => {
    if (!schoolId) return;
    setLoadingFloors(true);
    try {
      const res = await fetch(
        `/api/drive/folders/descendants?folderId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.folders)) {
        const allFolders: DriveItem[] = data.folders;
        const allFiles: DriveItem[] = Array.isArray(data.files) ? data.files : [];

        // Direct floor folders under school
        let floorFolders = allFolders.filter(
          (f) => f.parentId === schoolId && isFloorFolderName(f.name),
        );

        if (floorFolders.length === 0) {
          floorFolders = allFolders.filter((f) => f.parentId === schoolId);
        }

        if (floorFolders.length > 0) {
          const computedFloors: LiveFloorData[] = floorFolders.map((fl) => {
            const roomFolders = allFolders.filter(
              (f) =>
                f.parentId === fl.id &&
                (isRoomFolderName(f.name) ||
                  /^([A-Za-z0-9_-]+|room\s*\d+|قاعة\s*\d+)$/i.test(f.name)),
            );

            const rms: LiveFloorData["rooms"] = roomFolders.map((rf) => {
              const rFiles = allFiles.filter((file) => file.parentId === rf.id);
              let stdCount = 25;
              let subjText: string | undefined;

              for (const rfFile of rFiles) {
                const parsed = parseEstRoomFileName(rfFile.name);
                if (parsed) {
                  stdCount = parsed.totalStudents;
                  subjText = parsed.breakdownText;
                  break;
                }
              }

              return {
                room: rf.name,
                studentCount: stdCount,
                subjectsText: subjText,
              };
            });

            // Also check files directly in floor
            const directFiles = allFiles.filter((file) => file.parentId === fl.id);
            for (const df of directFiles) {
              const parsed = parseEstRoomFileName(df.name);
              if (parsed?.room && !rms.some((r) => r.room === parsed.room)) {
                rms.push({
                  room: parsed.room,
                  studentCount: parsed.totalStudents,
                  subjectsText: parsed.breakdownText,
                });
              }
            }

            return {
              floor: fl.name,
              rooms: rms,
              totalStudents: rms.reduce((sum, r) => sum + r.studentCount, 0),
            };
          });

          setLiveFloors(computedFloors);
        } else {
          // If no subfolders in Drive yet, fallback to reference structure for preview
          const official = OFFICIAL_EST_SCHOOLS.find(
            (s) =>
              s.schoolName.toLowerCase() === (selectedSchool?.name || "").toLowerCase() ||
              s.fullFolderName.toLowerCase() === (selectedSchool?.fullFolderName || "").toLowerCase(),
          );
          if (official) {
            setLiveFloors(
              official.floors.map((fl) => ({
                floor: fl.floorName,
                rooms: fl.rooms.map((rm) => ({ room: rm, studentCount: 25 })),
                totalStudents: fl.rooms.length * 25,
              })),
            );
          }
        }
      }
    } catch (err) {
      console.error("[logistics] Failed to load school details:", err);
    } finally {
      setLoadingFloors(false);
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedSchoolId) {
      void loadSchoolDetails(selectedSchoolId);
    }
  }, [selectedSchoolId, loadSchoolDetails]);

  // Derived Totals
  const totalFloorsCount = liveFloors.length;
  const totalRoomsCount = useMemo(
    () => liveFloors.reduce((sum, fl) => sum + fl.rooms.length, 0),
    [liveFloors],
  );
  const totalCandidatesCount = useMemo(
    () => liveFloors.reduce((sum, fl) => sum + fl.totalStudents, 0),
    [liveFloors],
  );
  const allRoomNames = useMemo(
    () => liveFloors.flatMap((fl) => fl.rooms.map((r) => r.room)),
    [liveFloors],
  );

  // Execute Action (Show or Print)
  const handleLogisticsAction = useCallback(
    async (
      type: "carton" | "bag" | "clean_skin_master" | "clean_skin_subjects" | "bundle",
      action: "show" | "print",
    ) => {
      const actionKey = `${type}-${action}`;
      if (busyAction) return;

      const buildingName = selectedSchool?.name || selectedSchool?.fullFolderName || "Building HQ";
      const governorateName = selectedSchool?.governorate || "Alexandria";

      setBusyAction(actionKey);
      const toastId = toast.loading(
        action === "show"
          ? isAr
            ? "جاري إنشاء ومعاينة ملف الطباعة من بيانات Google Drive..."
            : "Generating PDF preview from Google Drive data..."
          : isAr
          ? "جاري إرسال المستند للطباعة..."
          : "Sending document to printer...",
      );

      try {
        const query = new URLSearchParams({
          type,
          examName: selectedExamName,
          governorate: governorateName,
          center: buildingName,
          building: buildingName,
          date: selectedSessionName,
          totalRooms: String(totalRoomsCount || 12),
          totalStudents: String(totalCandidatesCount || 300),
          roomNames: JSON.stringify(allRoomNames),
          floors: JSON.stringify(liveFloors),
          boxNumber: String(boxNumber),
          totalBoxes: String(totalBoxes),
        });
        if (selectedSchoolId) query.set("folderId", selectedSchoolId);
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
            title = `Carton - ${buildingName}`;
            customTitle = isAr
              ? `ستيكر كرتونة المبنى — ${buildingName}`
              : `Building Carton Placard — ${buildingName}`;
            customDescription = isAr
              ? "مقاس A4 بالعرض — يلصق على الكرتونة الكبيرة التي تحوي جميع أكياس ومظاريف المبنى مع مسرد الأدوار والقاعات."
              : "A4 Landscape — Affixed to the outside of the master carton containing all room dossiers grouped by floor.";
          } else if (type === "bag") {
            title = `Bag Checklist - ${buildingName}`;
            customTitle = isAr
              ? `بيان شنطة الامتحانات (Checklist) — ${buildingName}`
              : `Exam Transit Bag Checklist — ${buildingName}`;
            customDescription = isAr
              ? `مقاس A4 — قائمة فحص المواد وتأشير الـ Checkboxes لـ ${selectedExamName}.`
              : `A4 Checklist — Subject checklists with checkboxes for ${selectedExamName}.`;
          } else if (type === "clean_skin_master") {
            title = `Clean Skin Master - ${buildingName}`;
            customTitle = isAr
              ? `مظروف أوراق الطوارئ والاحتياطي (Clean Skin Master)`
              : `Clean Skin Emergency Master Packet`;
            customDescription = isAr
              ? "مقاس A4 صفحة واحدة — ستيكر كيس الطوارئ الخارجي مع جدول توثيق صرف الأوراق الإضافية."
              : "A4 Single Page — Emergency reserve master envelope with on-site dispatch tracking log.";
          } else if (type === "clean_skin_subjects") {
            title = `Clean Skin Subjects - ${buildingName}`;
            customTitle = isAr
              ? `ستيكرات المواد الاحتياطية (Clean Skin)`
              : `Clean Skin Subject Stickers`;
            customDescription = isAr
              ? "مقاس ربع A4 — خانة العدد مسطرة لكتابة الرقم يدوياً بالقلم بعد التعبئة الفعلية."
              : "Quarter-A4 — Quantity box formatted for manual pen entry after actual packing.";
          } else {
            title = `Logistics Bundle - ${buildingName}`;
            customTitle = isAr
              ? `الحزمة اللوجستية الكاملة للمبنى — ${buildingName}`
              : `Complete Logistics Bundle — ${buildingName}`;
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
      selectedExamName,
      selectedSessionName,
      selectedSchool,
      selectedSchoolId,
      totalRoomsCount,
      totalCandidatesCount,
      allRoomNames,
      liveFloors,
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
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isDriveConnected
                ? isAr
                  ? "متصل مباشرة بمجلدات Google Drive"
                  : "Live Google Drive Connected"
                : isAr
                ? "جاري الاتصال بـ Google Drive..."
                : "Connecting to Google Drive..."}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="size-7 text-indigo-600 dark:text-indigo-400" />
            <span>{isAr ? "مركز الاستيكرات واللوجستيات" : "Logistics & Stickers Hub"}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isAr
              ? "قراءة تلقائية مباشرة من مجلدات Google Drive لاختيار الدورة والامتحان والمدرسة وطباعة الاستيكرات والبيانات."
              : "Automatic dynamic reading from Google Drive folders for cycles, exams, schools, and printable logistics placarded materials."}
          </p>
        </div>

        {/* Master Quick Bundle Button */}
        <button
          type="button"
          onClick={() => handleLogisticsAction("bundle", "print")}
          disabled={Boolean(busyAction) || loadingFloors}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busyAction === "bundle-print" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Printer className="size-4" />
          )}
          <span>{isAr ? "طباعة الحزمة الكاملة للمبنى 🖨️" : "Print Complete Building Bundle 🖨️"}</span>
        </button>
      </div>

      {/* Dynamic Drive Selector Bar */}
      <div className="card p-4 sm:p-5 border border-border shadow-xs bg-surface-soft/40 backdrop-blur-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Step 1: Session / Cycle Folder (فولدر الدورة) */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-amber-500" />
                <span>{isAr ? "1. فولدر الدورة (Session)" : "1. Cycle Folder"}</span>
              </span>
              {loadingSessions && <Loader2 className="size-3 animate-spin text-muted" />}
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                const found = sessions.find((s) => s.id === e.target.value);
                if (found) {
                  setSelectedSessionId(found.id);
                  setSelectedSessionName(found.name);
                }
              }}
              disabled={loadingSessions}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  📁 {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Exam Folder (EST 1 / EST 2) */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-indigo-500" />
                <span>{isAr ? "2. فولدر الاختبار (Exam)" : "2. Exam Folder"}</span>
              </span>
              {loadingExams && <Loader2 className="size-3 animate-spin text-muted" />}
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                const found = exams.find((ex) => ex.id === e.target.value);
                if (found) {
                  setSelectedExamId(found.id);
                  setSelectedExamName(found.name);
                }
              }}
              disabled={loadingExams || exams.length === 0}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {exams.length > 0 ? (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    📋 {ex.name}
                  </option>
                ))
              ) : (
                <option value="">
                  {loadingExams ? (isAr ? "جاري التحميل..." : "Loading...") : (isAr ? "لا توجد مجلدات اختبار" : "No exam folders")}
                </option>
              )}
            </select>
          </div>

          {/* Step 3: School / Center / Building Folder (المدرسة أو المبنى) */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-emerald-500" />
                <span>{isAr ? "3. المدرسة أو المبنى (School)" : "3. School / Center"}</span>
              </span>
              {loadingSchools && <Loader2 className="size-3 animate-spin text-muted" />}
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                const found = schools.find((s) => s.id === e.target.value);
                if (found) {
                  setSelectedSchoolId(found.id);
                  setSelectedSchool(found);
                }
              }}
              disabled={loadingSchools || schools.length === 0}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  🏫 {sc.fullFolderName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Detected Stats Banner from Google Drive */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <FolderCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{selectedSchool?.name || "Loading School..."}</span>
              {selectedSchool?.governorate && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {selectedSchool.governorate}
                </span>
              )}
            </span>
            <span className="text-muted/60">•</span>
            <span className="font-bold flex items-center gap-1">
              <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                {loadingFloors ? (
                  <Loader2 className="size-3 animate-spin inline" />
                ) : (
                  `${totalFloorsCount} ${isAr ? "أدوار" : "Floors"}`
                )}
              </span>
            </span>
            <span className="text-muted/60">•</span>
            <span className="font-bold">
              {totalRoomsCount} {isAr ? "قاعة مسجلة" : "Rooms"}
            </span>
            <span className="text-muted/60">•</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {totalCandidatesCount} {isAr ? "طالب ممتحن (من أسماء الملفات)" : "Assigned Candidates"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedSchoolId) void loadSchoolDetails(selectedSchoolId);
            }}
            disabled={loadingFloors}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            title={isAr ? "إعادة قراءة محتويات المجلد من الدرايف" : "Refresh from Drive"}
          >
            <RefreshCw className={cn("size-3", loadingFloors && "animate-spin")} />
            <span>{isAr ? "تحديث الداتا" : "Refresh"}</span>
          </button>
        </div>

        {/* Live Floors and Rooms Chips Preview */}
        {liveFloors.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <span className="text-[11px] font-bold text-muted block mb-2">
              {isAr ? "دليل الأدوار والقاعات المستخرج تلقائياً من الدرايف:" : "Directory Extracted from Drive:"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {liveFloors.map((fl) => (
                <div
                  key={fl.floor}
                  className="rounded-lg border border-border/80 bg-surface/60 p-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-foreground mb-1.5 border-b border-border/40 pb-1">
                    <span>🏢 {fl.floor}</span>
                    <span className="text-[10px] text-muted font-mono">
                      {fl.rooms.length} {isAr ? "لجان" : "rooms"} ({fl.totalStudents} {isAr ? "طالب" : "cand."})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fl.rooms.map((rm) => (
                      <span
                        key={rm.room}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-soft border border-border text-[10.5px] font-mono text-foreground"
                      >
                        <span>{rm.room}</span>
                        <span className="text-muted text-[9.5px]">({rm.studentCount})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main 4 Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: Master Building Carton Placard */}
        <div className="card p-5 border border-border/80 hover:border-indigo-500/40 shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  A4 Landscape
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "ستيكر كرتونة المبنى الرئيسية" : "Master Building Carton Placard"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
              Carton Sticker
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? "ورقة مقاس A4 بالعرض تلصق على الكرتونة الخارجية التي تحتوي على جميع أكياس ومظاريف المبنى مع مسرد الأدوار والقاعات بالكامل ومربعات [ ] للتأكيد."
              : "A4 Landscape placard affixed to the master carton, detailing total floors, rooms, candidates, and packing check-off boxes."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("carton", "show")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer"
            >
              {busyAction === "carton-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>{isAr ? "معاينة PDF" : "Preview PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("carton", "print")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {busyAction === "carton-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>{isAr ? "طباعة فورية" : "Print Placard"}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: Transit Bag Exam Checklist */}
        <div className="card p-5 border border-border/80 hover:border-indigo-500/40 shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                🎒
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  A4 Portrait
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "بيان محتويات شنطة الامتحانات (Checklist)" : "Transit Bag Exam Checklist"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
              Bag Manifest
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? `بيان مقاس A4 يلصق على شنطة المواد لـ ${selectedExamName}، يعرض جميع المواد مع خانات التأشير [✓] والقفل الأمني.`
              : `A4 Portrait checklist affixed to the transit bag with subject breakdowns and packing verification for ${selectedExamName}.`}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("bag", "show")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer"
            >
              {busyAction === "bag-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>{isAr ? "معاينة PDF" : "Preview PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("bag", "print")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {busyAction === "bag-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>{isAr ? "طباعة البيان" : "Print Checklist"}</span>
            </button>
          </div>
        </div>

        {/* CARD 3: Clean Skin Master Envelope */}
        <div className="card p-5 border border-border/80 hover:border-red-500/40 shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                🚨
              </div>
              <div>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                  A4 Single Page
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "ستيكر كيس الطوارئ (Clean Skin Master)" : "Clean Skin Master Emergency Placard"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold">
              Emergency Reserve
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? "ستيكر مقاس A4 صفحة واحدة بالضبط، يلصق على كيس الاحتياطي الخارجي مع جدول شبكي لتسجيل صرف الأوراق الطارئة للقاعات."
              : "Strict single-page A4 emergency reserve placard with structured incident dispatch log sheet and safe printer margins."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_master", "show")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer"
            >
              {busyAction === "clean_skin_master-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>{isAr ? "معاينة PDF" : "Preview PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_master", "print")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {busyAction === "clean_skin_master-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>{isAr ? "طباعة الكيس" : "Print Master"}</span>
            </button>
          </div>
        </div>

        {/* CARD 4: Clean Skin Subject Stickers (Quarter A4) */}
        <div className="card p-5 border border-border/80 hover:border-red-500/40 shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold text-lg">
                🏷️
              </div>
              <div>
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
                  Quarter A4 (4-up)
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "ستيكرات المواد الاحتياطية (Clean Skin)" : "Clean Skin Subject Stickers (4-Up)"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-bold">
              Quarter A4
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? "ستيكرات ربع A4 مقسمة 4 في الصفحة، مجهزة للمواد مع خانة عدد فارغة ومسطرة لكتابة العدد يدوياً بالقلم بعد التعبئة."
              : "Quarter-A4 stickers (4-up on A4 landscape) with blank quantity boxes formatted for manual pen entry."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_subjects", "show")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer"
            >
              {busyAction === "clean_skin_subjects-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>{isAr ? "معاينة PDF" : "Preview PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_subjects", "print")}
              disabled={Boolean(busyAction)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {busyAction === "clean_skin_subjects-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>{isAr ? "طباعة الستيكرات" : "Print Stickers"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal for PDF Preview */}
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
