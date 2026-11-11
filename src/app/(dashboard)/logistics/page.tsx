"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  Printer,
  Eye,
  Sparkles,
  Loader2,
  Building2,
  Calendar,
  Layers,
  RefreshCw,
  FolderCheck,
  MapPin,
  School,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/locale-provider";
import { parseSchoolFolderName, OFFICIAL_EST_SCHOOLS, getFloorSortWeight } from "@/lib/stickers/est-reference-data";
import { parseEstRoomFileName } from "@/lib/stickers/est-room-data";
import { isFloorFolderName } from "@/lib/stickers/register-utils";
import { StickerPreviewModal } from "@/components/sticker-preview-modal";
import { toast } from "sonner";
import type { DriveItem } from "@/lib/types";

interface DriveFolderOption {
  id: string;
  name: string;
}

interface DestinationOption {
  id: string;
  name: string;
  isSchools: boolean;
  cityName?: string;
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
    est1Count?: number;
    est1Subjects?: string;
    est2Count?: number;
    est2Subjects?: string;
    isAssn?: boolean;
  }>;
  totalStudents: number;
  est1Students?: number;
  est2Students?: number;
}

export default function LogisticsHubPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();
  const urlFolderId = searchParams.get("folderId") || undefined;
  const urlBuilding = searchParams.get("building") || undefined;
  const urlExam = searchParams.get("exam") || undefined;
  const urlCycle = searchParams.get("cycle") || undefined;
  const [urlHandled, setUrlHandled] = useState<boolean>(false);

  // 1. Session / Cycle
  const [sessions, setSessions] = useState<DriveFolderOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSessionName, setSelectedSessionName] = useState<string>("December 2026");
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);

  // 2. Exam (EST 1 / EST 2)
  const [exams, setExams] = useState<DriveFolderOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedExamName, setSelectedExamName] = useState<string>("EST 1");
  const [loadingExams, setLoadingExams] = useState<boolean>(false);

  // 3. Category / Destination (المدارس أو إحدى المدن/المحافظات)
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [selectedDest, setSelectedDest] = useState<DestinationOption | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState<boolean>(false);

  // 4A. Schools (عند اختيار المدارس)
  const [schools, setSchools] = useState<DriveSchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<DriveSchoolOption | null>(null);
  const [loadingSchools, setLoadingSchools] = useState<boolean>(false);

  // 4B. Center & Building (عند اختيار مدينة/محافظة)
  const [centers, setCenters] = useState<DriveFolderOption[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [selectedCenterName, setSelectedCenterName] = useState<string>("");
  const [loadingCenters, setLoadingCenters] = useState<boolean>(false);

  const [buildings, setBuildings] = useState<DriveFolderOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedBuildingName, setSelectedBuildingName] = useState<string>("");
  const [loadingBuildings, setLoadingBuildings] = useState<boolean>(false);

  // Live floors & rooms extracted from Google Drive
  const [liveFloors, setLiveFloors] = useState<LiveFloorData[]>([]);
  const [loadingFloors, setLoadingFloors] = useState<boolean>(false);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [est1TotalCandidates, setEst1TotalCandidates] = useState<number>(0);
  const [est2TotalCandidates, setEst2TotalCandidates] = useState<number>(0);

  // True whenever any part of the asynchronous Drive data loading chain is active
  const isAnyLoading =
    loadingSessions ||
    loadingExams ||
    loadingDestinations ||
    loadingSchools ||
    loadingCenters ||
    loadingBuildings ||
    loadingFloors;

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
  // STEP 1: Load Session Folders (e.g. December 2026)
  // ----------------------------------------------------
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/drive/files?pageSize=100", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        setIsDriveConnected(true);
        const folders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);

        const dateFolders = folders.filter((f) =>
          /^(december|october|november|january|february|march|april|may|june|july|august|september|oct|nov|dec)\s*\d{4}/i.test(
            f.name.trim(),
          ) || /session|cycle|دورة/i.test(f.name),
        );

        const list: DriveFolderOption[] =
          dateFolders.length > 0
            ? dateFolders.map((f) => ({ id: f.id, name: f.name }))
            : folders.map((f) => ({ id: f.id, name: f.name }));

        // Prioritize December 2026 first, then January 2027, March 2027
        list.sort((a, b) => {
          if (/december\s*2026/i.test(a.name)) return -1;
          if (/december\s*2026/i.test(b.name)) return 1;
          if (/january\s*2027/i.test(a.name)) return -1;
          if (/january\s*2027/i.test(b.name)) return 1;
          return a.name.localeCompare(b.name);
        });

        if (list.length > 0) {
          setSessions(list);
          setSelectedSessionId(list[0].id);
          setSelectedSessionName(list[0].name);
        } else {
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
        // Strictly match EST 1 or EST 2 folders, and exclude non-exam files/folders like schedules
        const estFolders = folders
          .filter((f) => {
            const name = f.name.trim();
            return /^EST\s*[-_]?\s*[12]\b/i.test(name) && !/schedule|proposed|note|guide/i.test(name);
          })
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const list: DriveFolderOption[] =
          estFolders.length > 0
            ? estFolders.map((f) => ({ id: f.id, name: f.name }))
            : folders
                .filter((f) => !/schedule|proposed|note|guide/i.test(f.name))
                .map((f) => ({ id: f.id, name: f.name }));

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
  // STEP 5: Core Hierarchy Loader (Floors, Rooms, Candidates)
  // ----------------------------------------------------
  const loadTargetHierarchy = useCallback(
    async (
      targetFolderId: string,
      targetType: "school" | "building",
      governorateName?: string,
      buildingName?: string,
    ) => {
      if (!targetFolderId) return;
      setLoadingFloors(true);
      try {
        // 1. Try unified server-side cross-exam hierarchy scanner first
        try {
          const hierRes = await fetch(
            `/api/stickers/logistics?type=hierarchy&folderId=${encodeURIComponent(targetFolderId)}&building=${encodeURIComponent(buildingName || "")}&governorate=${encodeURIComponent(governorateName || "")}&examName=${encodeURIComponent(selectedExamName)}&date=${encodeURIComponent(selectedSessionName)}`,
            { cache: "no-store" },
          );
          if (hierRes.ok) {
            const hierData = await hierRes.json();
            if (Array.isArray(hierData.floors) && hierData.floors.length > 0) {
              setLiveFloors(hierData.floors);
              setEst1TotalCandidates(hierData.est1TotalCandidates || 0);
              setEst2TotalCandidates(hierData.est2TotalCandidates || 0);
              return;
            }
          }
        } catch {}

        const res = await fetch(
          `/api/drive/folders/descendants?folderId=${encodeURIComponent(targetFolderId)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.folders)) {
          const allFolders: DriveItem[] = data.folders;
          const allFiles: DriveItem[] = Array.isArray(data.files) ? data.files : [];

          // 1. Resolve Floor Folders (direct or descendant)
          let floorFolders = allFolders.filter(
            (f) => f.parentId === targetFolderId && isFloorFolderName(f.name),
          );

          if (floorFolders.length === 0) {
            floorFolders = allFolders.filter((f) => isFloorFolderName(f.name));
          }

          if (floorFolders.length === 0) {
            floorFolders = allFolders.filter((f) => f.parentId === targetFolderId);
          }

          // GROUP BY FLOOR NAME to merge duplicate floor folders in Google Drive into ONE single floor
          const floorMap = new Map<string, { floorName: string; folderIds: string[] }>();
          for (const fl of floorFolders) {
            const key = fl.name.trim().toLowerCase();
            const existing = floorMap.get(key) || { floorName: fl.name.trim(), folderIds: [] };
            existing.folderIds.push(fl.id);
            floorMap.set(key, existing);
          }

          const uniqueFloorEntries = Array.from(floorMap.values());
          uniqueFloorEntries.sort((a, b) => getFloorSortWeight(a.floorName) - getFloorSortWeight(b.floorName));

          if (uniqueFloorEntries.length > 0) {
            const computedFloors: LiveFloorData[] = uniqueFloorEntries.map((fe) => {
              const roomsMap = new Map<string, { room: string; studentCount: number; subjectsText?: string }>();

              for (const flId of fe.folderIds) {
                // Subfolders under this floor folder
                const roomFolders = allFolders.filter((f) => f.parentId === flId);
                for (const rf of roomFolders) {
                  const rName = rf.name.trim();
                  if (!rName) continue;
                  const rKey = rName.toLowerCase();
                  if (!roomsMap.has(rKey)) {
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

                    roomsMap.set(rKey, {
                      room: rName,
                      studentCount: stdCount,
                      subjectsText: subjText,
                    });
                  }
                }

                // Direct files under this floor folder
                const directFiles = allFiles.filter((file) => file.parentId === flId);
                for (const df of directFiles) {
                  const parsed = parseEstRoomFileName(df.name);
                  const roomName = (parsed?.room || df.name.replace(/\.[^/.]+$/, "")).trim();
                  if (!roomName) continue;
                  const rKey = roomName.toLowerCase();
                  if (!roomsMap.has(rKey)) {
                    roomsMap.set(rKey, {
                      room: roomName,
                      studentCount: parsed?.totalStudents || 25,
                      subjectsText: parsed?.breakdownText,
                    });
                  }
                }
              }

              // School fallback if rooms are still empty in Drive for an official school
              if (roomsMap.size === 0 && targetType === "school") {
                const official = OFFICIAL_EST_SCHOOLS.find(
                  (s) =>
                    s.schoolName.toLowerCase() === (buildingName || "").toLowerCase() ||
                    s.fullFolderName.toLowerCase() === (buildingName || "").toLowerCase() ||
                    (buildingName || "").toLowerCase().includes(s.schoolName.toLowerCase()),
                );
                const officialFloor = official?.floors.find(
                  (ofl) => ofl.floorName.toLowerCase() === fe.floorName.toLowerCase(),
                );
                if (officialFloor) {
                  for (const rm of officialFloor.rooms) {
                    roomsMap.set(rm.toLowerCase(), { room: rm, studentCount: 25 });
                  }
                }
              }

              const sortedRooms = Array.from(roomsMap.values()).sort((a, b) =>
                a.room.localeCompare(b.room, undefined, { numeric: true }),
              );

              return {
                floor: fe.floorName,
                rooms: sortedRooms,
                totalStudents: sortedRooms.reduce((sum, r) => sum + r.studentCount, 0),
              };
            });

            // Filter out empty floors if other valid floors exist
            const validFloors = computedFloors.filter((f) => f.rooms.length > 0);
            setLiveFloors(validFloors.length > 0 ? validFloors : computedFloors);
          } else {
            // Full fallback to official schools definitions if no folders in Drive yet
            if (targetType === "school") {
              const official = OFFICIAL_EST_SCHOOLS.find(
                (s) =>
                  s.schoolName.toLowerCase() === (buildingName || "").toLowerCase() ||
                  s.fullFolderName.toLowerCase() === (buildingName || "").toLowerCase() ||
                  (buildingName || "").toLowerCase().includes(s.schoolName.toLowerCase()),
              );
              if (official) {
                setLiveFloors(
                  official.floors.map((fl) => ({
                    floor: fl.floorName,
                    rooms: fl.rooms.map((rm) => ({ room: rm, studentCount: 25 })),
                    totalStudents: fl.rooms.length * 25,
                  })),
                );
              } else {
                setLiveFloors([]);
              }
            } else {
              setLiveFloors([]);
            }
          }
        }
      } catch (err) {
        console.error("[logistics] Failed to load target hierarchy:", err);
      } finally {
        setLoadingFloors(false);
      }
    },
    [],
  );

  // ----------------------------------------------------
  // STEP 4B: Load Buildings inside selected Center
  // ----------------------------------------------------
  const loadBuildings = useCallback(
    async (centerId: string, centerName: string, cityName: string) => {
      if (!centerId) return;
      setLoadingBuildings(true);
      try {
        const res = await fetch(`/api/drive/files?folder=${encodeURIComponent(centerId)}&pageSize=100`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          const subFolders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);

          // If subfolders exist, they are buildings (e.g. Science And Technology, Pharmacy)
          // If no subfolders, or only floor folders, center itself acts as the building
          const hasFloorFolders = subFolders.some((f) => isFloorFolderName(f.name));
          let bList: DriveFolderOption[] = [];

          if (subFolders.length > 0 && !hasFloorFolders) {
            bList = subFolders.map((f) => ({ id: f.id, name: f.name }));
          } else {
            bList = [{ id: centerId, name: centerName }];
          }

          setBuildings(bList);
          if (bList.length > 0) {
            const targetBuilding = urlFolderId
              ? bList.find(
                  (b) =>
                    b.id === urlFolderId ||
                    b.name.toLowerCase() === (urlBuilding || "").toLowerCase() ||
                    (urlBuilding || "").toLowerCase().includes(b.name.toLowerCase()),
                ) || bList[0]
              : bList[0];

            setSelectedBuildingId(targetBuilding.id);
            setSelectedBuildingName(targetBuilding.name);
            void loadTargetHierarchy(targetBuilding.id, "building", cityName, targetBuilding.name);
          }
        }
      } catch (err) {
        console.error("[logistics] Failed to load buildings:", err);
      } finally {
        setLoadingBuildings(false);
      }
    },
    [loadTargetHierarchy],
  );

  // ----------------------------------------------------
  // STEP 4A: Load Centers inside selected City/Governorate
  // ----------------------------------------------------
  const loadCenters = useCallback(
    async (cityFolderId: string, cityName: string) => {
      if (!cityFolderId) return;
      setLoadingCenters(true);
      try {
        const res = await fetch(
          `/api/drive/files?folder=${encodeURIComponent(cityFolderId)}&pageSize=100`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          const centerFolders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);
          const cList: DriveFolderOption[] = centerFolders.map((f) => ({ id: f.id, name: f.name }));
          setCenters(cList);

          if (cList.length > 0) {
            setSelectedCenterId(cList[0].id);
            setSelectedCenterName(cList[0].name);
            void loadBuildings(cList[0].id, cList[0].name, cityName);
          } else {
            setBuildings([]);
            setSelectedBuildingId("");
            setSelectedBuildingName("");
            setLiveFloors([]);
          }
        }
      } catch (err) {
        console.error("[logistics] Failed to load centers:", err);
      } finally {
        setLoadingCenters(false);
      }
    },
    [loadBuildings],
  );

  // ----------------------------------------------------
  // STEP 4: Load Schools from Schools folder (or reference)
  // ----------------------------------------------------
  const loadSchools = useCallback(
    async (schoolsFolderId?: string) => {
      setLoadingSchools(true);
      try {
        let loadedSchools: DriveSchoolOption[] = [];

        if (schoolsFolderId && schoolsFolderId !== "schools") {
          const res = await fetch(
            `/api/drive/files?folder=${encodeURIComponent(schoolsFolderId)}&pageSize=100`,
            { cache: "no-store" },
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok && Array.isArray(data.items)) {
            const driveFolders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);
            if (driveFolders.length > 0) {
              loadedSchools = driveFolders.map((sf) => {
                const parsed = parseSchoolFolderName(sf.name);
                return {
                  id: sf.id,
                  name: parsed.schoolName || sf.name,
                  fullFolderName: sf.name,
                  governorate: parsed.governorate,
                };
              });
            }
          }
        }

        // If no school folders found in drive folder yet, populate with official schools definitions
        if (loadedSchools.length === 0) {
          loadedSchools = OFFICIAL_EST_SCHOOLS.map((s) => ({
            id: s.fullFolderName,
            name: s.schoolName,
            fullFolderName: s.fullFolderName,
            governorate: s.governorate,
          }));
        }

        setSchools(loadedSchools);
        if (loadedSchools.length > 0) {
          const targetSchool = urlFolderId
            ? loadedSchools.find(
                (s) =>
                  s.id === urlFolderId ||
                  s.name.toLowerCase() === (urlBuilding || "").toLowerCase() ||
                  s.fullFolderName.toLowerCase() === (urlBuilding || "").toLowerCase() ||
                  (urlBuilding || "").toLowerCase().includes(s.name.toLowerCase()),
              ) || loadedSchools[0]
            : loadedSchools[0];

          setSelectedSchoolId(targetSchool.id);
          setSelectedSchool(targetSchool);
          void loadTargetHierarchy(
            targetSchool.id,
            "school",
            targetSchool.governorate,
            targetSchool.name,
          );
        }
      } catch (err) {
        console.error("[logistics] Failed to load schools:", err);
      } finally {
        setLoadingSchools(false);
      }
    },
    [loadTargetHierarchy],
  );

  // ----------------------------------------------------
  // STEP 3: Load Destinations (Schools or City Folders) inside selected exam
  // ----------------------------------------------------
  const loadDestinations = useCallback(
    async (examId: string) => {
      if (!examId) return;
      setLoadingDestinations(true);
      try {
        const res = await fetch(`/api/drive/files?folder=${encodeURIComponent(examId)}&pageSize=100`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          const folders: DriveItem[] = data.items.filter((i: DriveItem) => i.isFolder);

          const schoolsFolder = folders.find((f) => /^schools$/i.test(f.name.trim()));

          // City folders under the exam (exclude Schools and auxiliary schedules)
          const cityFolders = folders.filter(
            (f) =>
              !/^schools$/i.test(f.name.trim()) &&
              !/schedule|جدول|backup/i.test(f.name.trim()),
          );

          const destList: DestinationOption[] = [];

          // Option 1: Schools
          destList.push({
            id: schoolsFolder ? schoolsFolder.id : "schools",
            name: isAr ? "🏫 المدارس (Schools)" : "🏫 Schools",
            isSchools: true,
          });

          // Option 2..N: Cities / Governorates from Drive
          for (const cf of cityFolders) {
            destList.push({
              id: cf.id,
              name: `📍 ${cf.name}`,
              isSchools: false,
              cityName: cf.name,
            });
          }

          setDestinations(destList);

          if (destList.length > 0) {
            const parsedSchool = urlBuilding ? parseSchoolFolderName(urlBuilding) : null;
            const isSchoolFromUrl = Boolean(
              parsedSchool?.isOfficialSchool ||
              (urlBuilding && OFFICIAL_EST_SCHOOLS.some(
                (s) =>
                  s.schoolName.toLowerCase() === urlBuilding.toLowerCase() ||
                  s.fullFolderName.toLowerCase() === urlBuilding.toLowerCase() ||
                  urlBuilding.toLowerCase().includes(s.schoolName.toLowerCase()),
              )),
            );

            let selected = destList[0];
            if (isSchoolFromUrl) {
              selected = destList.find((d) => d.isSchools) || destList[0];
            } else if (urlBuilding) {
              const matchedCity = destList.find(
                (d) => !d.isSchools && d.cityName && urlBuilding.toLowerCase().includes(d.cityName.toLowerCase()),
              );
              if (matchedCity) selected = matchedCity;
            }

            setSelectedDestId(selected.id);
            setSelectedDest(selected);

            if (selected.isSchools) {
              void loadSchools(selected.id);
            } else if (selected.cityName) {
              void loadCenters(selected.id, selected.cityName);
            }
          }
        }
      } catch (err) {
        console.error("[logistics] Failed to load destinations:", err);
      } finally {
        setLoadingDestinations(false);
      }
    },
    [isAr, loadSchools, loadCenters],
  );

  useEffect(() => {
    if (selectedExamId) {
      void loadDestinations(selectedExamId);
    }
  }, [selectedExamId, loadDestinations]);

  // Derived Active Destination Details
  const isSchoolMode = selectedDest?.isSchools ?? true;

  const activeBuildingName = useMemo(() => {
    if (isSchoolMode) {
      return selectedSchool?.name || selectedSchool?.fullFolderName || "Building HQ";
    }
    return selectedBuildingName || selectedCenterName || "Building HQ";
  }, [isSchoolMode, selectedSchool, selectedBuildingName, selectedCenterName]);

  const activeCenterName = useMemo(() => {
    if (isSchoolMode) {
      return selectedSchool?.name || "Main School";
    }
    return selectedCenterName || "Main Center";
  }, [isSchoolMode, selectedSchool, selectedCenterName]);

  const activeGovernorateName = useMemo(() => {
    if (isSchoolMode) {
      return selectedSchool?.governorate || "Alexandria";
    }
    return selectedDest?.cityName || "Alexandria";
  }, [isSchoolMode, selectedSchool, selectedDest]);

  const activeTargetFolderId = useMemo(() => {
    if (isSchoolMode) return selectedSchoolId;
    return selectedBuildingId || selectedCenterId;
  }, [isSchoolMode, selectedSchoolId, selectedBuildingId, selectedCenterId]);

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
      type: "carton" | "bag" | "manifest" | "clean_skin_master" | "clean_skin_log" | "clean_skin_subjects" | "bundle",
      action: "show" | "print",
    ) => {
      const actionKey = `${type}-${action}`;
      if (busyAction) return;

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
          governorate: activeGovernorateName,
          center: activeCenterName,
          building: activeBuildingName,
          date: selectedSessionName,
          totalRooms: String(totalRoomsCount || 12),
          totalStudents: String(totalCandidatesCount || 300),
          roomNames: JSON.stringify(allRoomNames),
          floors: JSON.stringify(liveFloors),
          boxNumber: String(boxNumber),
          totalBoxes: String(totalBoxes),
        });
        if (activeTargetFolderId) query.set("folderId", activeTargetFolderId);
        if (securitySeal) query.set("securitySeal", securitySeal);

        const res = await fetch(`/api/stickers/logistics?${query.toString()}`);
        if (!res.ok) {
          throw new Error(isAr ? "فشل إنشاء ملف الطباعة اللوجستية" : "Failed to generate logistics PDF");
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);

        toast.dismiss(toastId);

        if (action === "show") {
          const titles: Record<string, string> = {
            carton: isAr ? "معاينة ستيكر كرتونة المبنى" : "Building Carton Placard",
            bag: isAr ? "معاينة بيان شنطة الامتحانات" : "Transit Bag Exam Checklist",
            manifest: isAr ? "معاينة بيان الحصر العام للمبنى واللجان (EST I & EST II)" : "Master Center & Building Examination Manifest",
            clean_skin_master: isAr ? "معاينة ملف طوارئ الكنترول الشامل (صفحتين: بيان الحصر + سجل الصرف)" : "Emergency Reserve Master Packet (2 Pages: Manifest + Log)",
            clean_skin_log: isAr ? "معاينة سجل صرف الطوارئ (Incident Log Sheet)" : "Emergency Dispatch Log Sheet",
            clean_skin_subjects: isAr ? "معاينة استيكرات المواد للطوارئ" : "Clean Skin Subjects Stickers",
            bundle: isAr ? "معاينة حزمة اللوجستيات الشاملة للمبنى" : "Complete Building Logistics Bundle",
          };
          setPreviewState({
            open: true,
            url: objectUrl,
            title: titles[type] || "Logistics PDF Preview",
          });
        } else {
          const printWindow = window.open(objectUrl, "_blank");
          if (printWindow) {
            printWindow.focus();
            printWindow.onload = () => printWindow.print();
          } else {
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
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            };
          }
          toast.success(isAr ? "تم إرسال الملف للطباعة بنجاح" : "Document sent to printer successfully");
        }
      } catch (err: unknown) {
        toast.dismiss(toastId);
        const msg = err instanceof Error ? err.message : "Error generating document";
        toast.error(msg);
      } finally {
        setBusyAction(null);
      }
    },
    [
      busyAction,
      isAr,
      selectedExamName,
      activeGovernorateName,
      activeCenterName,
      activeBuildingName,
      selectedSessionName,
      totalRoomsCount,
      totalCandidatesCount,
      allRoomNames,
      liveFloors,
      boxNumber,
      totalBoxes,
      activeTargetFolderId,
      securitySeal,
    ],
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isAr ? "متصل مباشرة بمجلدات Google Drive" : "Live Google Drive Connected"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="size-7 text-indigo-600 dark:text-indigo-400" />
            <span>{isAr ? "منصة استيكرات ووثائق اللوجستيات (EST Logistics Hub)" : "Logistics & Stickers Hub"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl">
            {isAr
              ? "قراءة ديناميكية مباشرة من مجلدات درايف: اختر الدورة والاختبار والمدينة أو المدارس لاستخراج الأدوار والقاعات وأعداد الطلاب بدقة."
              : "Automatic dynamic reading from Google Drive folders for cycles, exams, cities or schools, and printable logistics materials."}
          </p>
        </div>

        {/* Master Quick Bundle Button */}
        <button
          type="button"
          onClick={() => handleLogisticsAction("bundle", "print")}
          disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {busyAction === "bundle-print" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isAnyLoading ? (
            <Loader2 className="size-4 animate-spin opacity-80" />
          ) : (
            <Printer className="size-4" />
          )}
          <span>
            {isAnyLoading && !busyAction
              ? isAr
                ? "جاري تحميل البيانات..."
                : "Loading Data..."
              : isAr
              ? "طباعة الحزمة الكاملة للمبنى 🖨️"
              : "Print Complete Building Bundle 🖨️"}
          </span>
        </button>
      </div>

      {/* Real-time Global Loading & Drive Sync Banner */}
      {isAnyLoading && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 animate-pulse text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2.5">
            <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>
              {isAr
                ? "جاري قراءة البيانات اللوجستية وتوزيع القاعات المباشر من Google Drive..."
                : "Loading logistics metadata and live room structure from Google Drive..."}
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">
            {loadingFloors
              ? isAr ? "جاري معالجة القاعات والأدوار..." : "Resolving rooms & floors..."
              : isAr ? "جاري فحص المجلدات..." : "Scanning folders..."}
          </span>
        </div>
      )}

      {/* Dynamic Drive Selector Bar */}
      <div className="card p-4 sm:p-5 border border-border shadow-xs bg-surface-soft/40 backdrop-blur-xs space-y-4">
        {/* ROW 1: Cycle, Exam, and Destination Category */}
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

          {/* Step 3: Destination Category (المدارس أو إحدى المدن/المحافظات) */}
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-rose-500" />
                <span>{isAr ? "3. الوجهة (المدارس أو المدينة)" : "3. Destination (Schools/City)"}</span>
              </span>
              {loadingDestinations && <Loader2 className="size-3 animate-spin text-muted" />}
            </label>
            <select
              value={selectedDestId}
              onChange={(e) => {
                const found = destinations.find((d) => d.id === e.target.value);
                if (found) {
                  setSelectedDestId(found.id);
                  setSelectedDest(found);
                  if (found.isSchools) {
                    void loadSchools(found.id);
                  } else if (found.cityName) {
                    void loadCenters(found.id, found.cityName);
                  }
                }
              }}
              disabled={loadingDestinations || destinations.length === 0}
              className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Dependent Selectors (Schools OR Centers & Buildings) */}
        <div className="pt-2 border-t border-border/50">
          {isSchoolMode ? (
            /* CASE A: Schools Dropdown */
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <School className="size-3.5 text-emerald-500" />
                  <span>{isAr ? "4. اختيار المدرسة (School)" : "4. Select School"}</span>
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
                    void loadTargetHierarchy(found.id, "school", found.governorate, found.name);
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
          ) : (
            /* CASE B: City Mode -> Center Dropdown & Building Dropdown */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Center */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="size-3.5 text-blue-500" />
                    <span>{isAr ? "4. السنتر (Test Center)" : "4. Test Center"}</span>
                  </span>
                  {loadingCenters && <Loader2 className="size-3 animate-spin text-muted" />}
                </label>
                <select
                  value={selectedCenterId}
                  onChange={(e) => {
                    const found = centers.find((c) => c.id === e.target.value);
                    if (found) {
                      setSelectedCenterId(found.id);
                      setSelectedCenterName(found.name);
                      if (selectedDest?.cityName) {
                        void loadBuildings(found.id, found.name, selectedDest.cityName);
                      }
                    }
                  }}
                  disabled={loadingCenters || centers.length === 0}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                >
                  {centers.length > 0 ? (
                    centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏛️ {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {loadingCenters ? (isAr ? "جاري التحميل..." : "Loading...") : (isAr ? "لا توجد سناتر" : "No centers")}
                    </option>
                  )}
                </select>
              </div>

              {/* Select Building */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-purple-500" />
                    <span>{isAr ? "5. المبنى (Building)" : "5. Building"}</span>
                  </span>
                  {loadingBuildings && <Loader2 className="size-3 animate-spin text-muted" />}
                </label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    const found = buildings.find((b) => b.id === e.target.value);
                    if (found) {
                      setSelectedBuildingId(found.id);
                      setSelectedBuildingName(found.name);
                      void loadTargetHierarchy(
                        found.id,
                        "building",
                        selectedDest?.cityName,
                        found.name,
                      );
                    }
                  }}
                  disabled={loadingBuildings || buildings.length === 0}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                >
                  {buildings.length > 0 ? (
                    buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {loadingBuildings ? (isAr ? "جاري التحميل..." : "Loading...") : (isAr ? "لا توجد مباني" : "No buildings")}
                    </option>
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Live Detected Stats Banner from Google Drive */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <FolderCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{activeBuildingName}</span>
              {activeGovernorateName && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {activeGovernorateName}
                </span>
              )}
            </span>
            <span className="text-muted/60">•</span>
            {loadingFloors ? (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                <Loader2 className="size-3.5 animate-spin" />
                <span>{isAr ? "جاري قراءة الأدوار والقاعات..." : "Reading floors & rooms..."}</span>
              </span>
            ) : (
              <>
                <span className="font-bold flex items-center gap-1">
                  <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{totalFloorsCount} {isAr ? "أدوار" : "Floors"}</span>
                </span>
                <span className="text-muted/60">•</span>
                <span className="font-bold flex items-center gap-1">
                  <Boxes className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{totalRoomsCount} {isAr ? "قاعات / لجان" : "Rooms"}</span>
                </span>
                <span className="text-muted/60">•</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {est1TotalCandidates || totalCandidatesCount} {isAr ? "طالب EST 1" : "EST I"}
                </span>
                <span className="text-muted/60">•</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {est2TotalCandidates || totalCandidatesCount} {isAr ? "طالب EST 2" : "EST II"}
                </span>
                <span className="text-muted/60">•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(est1TotalCandidates || totalCandidatesCount) + (est2TotalCandidates || totalCandidatesCount)} {isAr ? "إجمالي الحصر" : "Grand Total"}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTargetFolderId) {
                void loadTargetHierarchy(
                  activeTargetFolderId,
                  isSchoolMode ? "school" : "building",
                  activeGovernorateName,
                  activeBuildingName,
                );
              }
            }}
            disabled={loadingFloors}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title={isAr ? "إعادة قراءة محتويات المجلد من الدرايف" : "Refresh from Drive"}
          >
            <RefreshCw className={cn("size-3", loadingFloors && "animate-spin")} />
            <span>{isAr ? "تحديث الداتا" : "Refresh"}</span>
          </button>
        </div>

        {/* Live Floors and Rooms Chips Preview or Loading Skeleton */}
        {loadingFloors ? (
          <div className="pt-3 border-t border-border/40">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center">
              <div className="flex flex-col items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs font-bold">
                  {isAr
                    ? "جاري تجميع وتوحيد بيانات الأدوار والقاعات من الدرايف..."
                    : "Fetching, deduplicating, and aggregating live floors and rooms from Google Drive..."}
                </span>
                <span className="text-[11px] text-muted">
                  {isAr
                    ? "يتم فرز القاعات تصاعدياً ومنع تكرار أي أدوار"
                    : "Rooms are naturally sorted and duplicate floor folders merged automatically"}
                </span>
              </div>
            </div>
          </div>
        ) : liveFloors.length > 0 ? (
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
                    <div className="flex flex-wrap gap-1.5">
                      {fl.rooms.map((rm) => (
                        <span
                          key={rm.room}
                          title={
                            (rm.est1Subjects ? `EST I: ${rm.est1Subjects}\n` : "") +
                            (rm.est2Subjects ? `EST II: ${rm.est2Subjects}` : "")
                          }
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-soft border border-border text-[10.5px] font-mono text-foreground hover:border-indigo-500/50 transition-colors"
                        >
                          <span className="font-bold">{rm.room}</span>
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                            E1:{rm.est1Count ?? rm.studentCount}
                          </span>
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                            E2:{rm.est2Count ?? 25}
                          </span>
                        </span>
                      ))}
                    </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-border/40 text-center py-3 text-xs text-muted">
            {isAr
              ? "لم يتم العثور على قاعات أو أدوار في هذا المجلد حالياً"
              : "No floors or rooms found for the selected building."}
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
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "carton-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "جاري التحميل..." : "Loading..."
                  : isAr ? "معاينة PDF" : "Preview PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("carton", "print")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "carton-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "تحميل..." : "Loading..."
                  : isAr ? "طباعة فورية" : "Print Placard"}
              </span>
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
              ? "بيان A4 رأسي ملصق على شنطة نقل أوراق الإجابة والأسئلة لتأكيد استلام أكياس كل قاعة والمظاريف المغلقة."
              : "A4 Portrait checklist affixed to the transit bag with subject breakdowns and packing verification for EST."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("bag", "show")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "bag-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "جاري التحميل..." : "Loading..."
                  : isAr ? "معاينة PDF" : "Preview PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("bag", "print")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "bag-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "تحميل..." : "Loading..."
                  : isAr ? "طباعة البيان" : "Print Checklist"}
              </span>
            </button>
          </div>
        </div>

        {/* CARD 3: Master Center & Building Examination Manifest (Single Page Blueprint) */}
        <div className="card p-5 border border-indigo-500/30 hover:border-indigo-500/50 shadow-xs transition-all relative overflow-hidden group bg-indigo-500/[0.02]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                📋
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  A4 Strict Single Page
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "بيان الحصر العام للجان ومبنى الامتحان" : "Master Center & Building Manifest"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
              EST I & II Manifest
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? "ورقة مقاس A4 واحدة تجمع كافة تفاصيل السنتر والمبنى: الأدوار، القاعات، مواد الامتحان في كل قاعة، وأعداد الطلاب لـ EST 1 و EST 2 مع إجمالي الحصر."
              : "Strict single-page master blueprint detailing center, building, floors, rooms, subjects for both EST I & EST II, and total candidate allocations."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("manifest", "show")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "manifest-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "جاري التحميل..." : "Loading..."
                  : isAr ? "معاينة البيان" : "Preview Manifest"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("manifest", "print")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "manifest-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "تحميل..." : "Loading..."
                  : isAr ? "طباعة البيان" : "Print Manifest"}
              </span>
            </button>
          </div>
        </div>

        {/* CARD 4: Official Clean Skin Emergency Reserve Packet (Master Custody - 2 Pages) */}
        <div className="card p-5 border border-red-500/30 hover:border-red-500/50 shadow-xs transition-all relative overflow-hidden group bg-red-500/[0.02]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                🛡️
              </div>
              <div>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                  A4 2-Page Master Dossier
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "كيس طوارئ الكنترول وبيان الحصر الشامل" : "Emergency Reserve Master Packet"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold">
              2 Pages (Manifest + Log)
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isAr
              ? "حزمة متكاملة من صفحتين: صفحة 1 بيان الحصر الشامل لكافة اللجان والمبنى، وصفحة 2 جدول سجل صرف الطوارئ لكيس الكنترول المسطر بـ 18 صفاً."
              : "Comprehensive 2-page Master Control Dossier: Page 1 Master Building Manifest + Page 2 Emergency Dispatch Log Sheet with 18 incident tracking rows."}
          </p>

          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_master", "show")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "clean_skin_master-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "جاري التحميل..." : "Loading..."
                  : isAr ? "معاينة (2 صفحة)" : "Preview (2 Pages)"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_master", "print")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "clean_skin_master-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "تحميل..." : "Loading..."
                  : isAr ? "طباعة الباقة (2 صفحة)" : "Print Packet (2 Pages)"}
              </span>
            </button>
          </div>

          {/* Sub-action quick preview pills */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
            <span className="text-muted text-[10.5px]">
              {isAr ? "معاينة الصفحات منفردة:" : "Standalone Sheets:"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLogisticsAction("manifest", "show")}
                disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
              >
                {isAr ? "صفحة 1: بيان الحصر" : "Pg 1: Manifest"}
              </button>
              <span className="text-muted/40">•</span>
              <button
                type="button"
                onClick={() => handleLogisticsAction("clean_skin_log", "show")}
                disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
                className="text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
              >
                {isAr ? "صفحة 2: سجل الصرف" : "Pg 2: Incident Log"}
              </button>
            </div>
          </div>
        </div>

        {/* CARD 4: Clean Skin Individual Subjects Stickers */}
        <div className="card p-5 border border-orange-500/30 hover:border-orange-500/50 shadow-xs transition-all relative overflow-hidden group bg-orange-500/[0.02]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg">
                🏷️
              </div>
              <div>
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
                  Quarter A4 (4-up)
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  {isAr ? "ستيكرات مواد الطوارئ (Subject Packets)" : "Clean Skin Subject Stickers"}
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-bold">
              Quarter-A4
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
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-surface-soft hover:bg-surface-strong text-foreground text-xs font-bold border border-border transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "clean_skin_subjects-show" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "جاري التحميل..." : "Loading..."
                  : isAr ? "معاينة PDF" : "Preview PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleLogisticsAction("clean_skin_subjects", "print")}
              disabled={Boolean(busyAction) || isAnyLoading || totalRoomsCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {busyAction === "clean_skin_subjects-print" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAnyLoading ? (
                <Loader2 className="size-3.5 animate-spin opacity-70" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>
                {isAnyLoading && !busyAction
                  ? isAr ? "تحميل..." : "Loading..."
                  : isAr ? "طباعة الستيكرات" : "Print Stickers"}
              </span>
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
