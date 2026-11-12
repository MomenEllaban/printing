import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { buildBreadcrumbs, getFileMeta } from "@/lib/drive";
import { getDemoBreadcrumbs, getDemoDescendants, isDemoEnabled } from "@/lib/demo";
import {
  getReferenceSubfolderInfo,
  EST_REFERENCE_DATA,
  OFFICIAL_EST_SCHOOLS,
  getFloorSortWeight,
} from "@/lib/stickers/est-reference-data";
import { parseEstRoomFileName } from "@/lib/stickers/est-room-data";
import { isRoomFolderName } from "@/lib/stickers/register-utils";
import {
  generateBuildingCartonStickerPdf,
  generateExamBagChecklistPdf,
  generateCleanSkinMasterPdf,
  generateMasterBuildingManifestPdf,
  generateCleanSkinDispatchLogPdf,
  generateCleanSkinSubjectStickersPdf,
  generateCompleteLogisticsBundlePdf,
  normalizeFloorsData,
  type LogisticsStickerOptions,
  type FloorRoomsData,
} from "@/lib/stickers/logistics-stickers-pdf";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

function isFloorFolderName(name?: string | null): boolean {
  if (!name) return false;
  return (
    /floor|دور|طابق|\b\d+(st|nd|rd|th)\s*floor\b|\bground(\s*floor)?\b|\bأرضي\b|\bbasement\b|\bبدروم\b|\bmezzanine\b|\bميزانين\b/i.test(
      name,
    ) || /^(ground|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s*(floor)?$/i.test(name.trim())
  );
}

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "logistics:generate", 120, 60_000);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "bundle";
    const folderId = url.searchParams.get("folderId");
    let governorate = url.searchParams.get("governorate") || "";
    let center = url.searchParams.get("center") || "";
    let building = url.searchParams.get("building") || "";
    let examName = url.searchParams.get("examName") || "EST 1";
    let date = url.searchParams.get("date") || "December 2026";
    let totalRooms = Number(url.searchParams.get("totalRooms")) || undefined;
    let totalStudents = Number(url.searchParams.get("totalStudents")) || undefined;
    let roomNames: string[] = [];
    let floors: FloorRoomsData[] = [];

    const roomNamesParam = url.searchParams.get("roomNames");
    if (roomNamesParam) {
      try {
        const parsed = JSON.parse(roomNamesParam);
        if (Array.isArray(parsed)) roomNames = parsed.map(String);
      } catch {
        roomNames = roomNamesParam.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const floorsParam = url.searchParams.get("floors");
    if (floorsParam) {
      try {
        const parsedFloors = JSON.parse(floorsParam);
        if (Array.isArray(parsedFloors)) floors = parsedFloors;
      } catch {}
    }

    // If folderId is provided, resolve hierarchy, child floors, and rooms dynamically from Drive files
    if (folderId) {
      const connection = await getConnection();
      const connected = connection?.connectionStatus === "connected";
      const isDemo = isDemoEnabled() && !connected;

      if (isDemo || folderId.startsWith("demo-")) {
        const demoData = getDemoBreadcrumbs(folderId);
        const crumbs = demoData.breadcrumbs;
        if (crumbs.length > 0) {
          const names = crumbs.map((c) => c.name);
          const estIdx = names.findIndex((n) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(n));
          const rel = estIdx >= 0 ? names.slice(estIdx) : names;
          if (rel[0]) examName = rel[0];
          if (rel[1]) governorate = rel[1];
          if (rel[2]) center = rel[2];
          if (rel[3]) building = rel[3];
        }

        // Search counterpart exam in Demo data
        const counterpartMap = new Map<string, { studentCount: number; subjectsText: string }>();
        try {
          const estIdx = crumbs.findIndex((c) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(c.name));
          if (estIdx >= 1) {
            const cycleId = crumbs[estIdx - 1]?.id;
            const curExam = crumbs[estIdx]?.name || "EST 1";
            const isEst1Cur = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(curExam);
            const cpExamName = isEst1Cur ? "EST 2" : "EST 1";
            const subPath = crumbs.slice(estIdx + 1);

            const allDesc = getDemoDescendants([cycleId]);
            const cpExamFolder = allDesc.folders.find(
              (f) => f.parentId === cycleId && f.name.toLowerCase() === cpExamName.toLowerCase(),
            );
            let curParentId = cpExamFolder?.id;
            if (curParentId && subPath.length > 0) {
              for (const seg of subPath) {
                const next = allDesc.folders.find(
                  (f) => f.parentId === curParentId && f.name.toLowerCase() === seg.name.toLowerCase(),
                );
                curParentId = next?.id;
                if (!curParentId) break;
              }
            }

            if (curParentId) {
              const cpFloors = allDesc.folders.filter((f) => f.parentId === curParentId && isFloorFolderName(f.name));
              for (const fl of cpFloors) {
                const cpRooms = allDesc.folders.filter((f) => f.parentId === fl.id);
                for (const rm of cpRooms) {
                  const rKey = rm.name.trim().toLowerCase();
                  if (!counterpartMap.has(rKey)) {
                    const rFiles = allDesc.files.filter((f) => f.parentId === rm.id);
                    let stdCount: number | undefined;
                    let subjText: string | undefined;
                    for (const f of rFiles) {
                      const parsed = parseEstRoomFileName(f.name);
                      if (parsed) {
                        stdCount = parsed.totalStudents;
                        subjText = parsed.breakdownText;
                        break;
                      }
                    }
                    counterpartMap.set(rKey, { studentCount: stdCount || 0, subjectsText: subjText || "" });
                  }
                }
              }
            }
          }
        } catch {}

        try {
          const desc = getDemoDescendants([folderId]);
          const floorFolders = desc.folders.filter(
            (f) => f.parentId === folderId && isFloorFolderName(f.name),
          );

          if (floorFolders.length > 0) {
            // Group duplicate floor folders by name
            const floorGroups = new Map<string, Array<{ id: string; name: string }>>();
            for (const fl of floorFolders) {
              const k = (fl.name || "").trim().toLowerCase();
              const grp = floorGroups.get(k) || [];
              grp.push({ id: fl.id, name: fl.name.trim() });
              floorGroups.set(k, grp);
            }

            floors = Array.from(floorGroups.entries()).map(([_, flList]) => {
              const displayFloorName = flList[0].name;
              const roomsMap = new Map<string, {
                room: string;
                studentCount?: number;
                subjectsText?: string;
                est1Count?: number;
                est1Subjects?: string;
                est2Count?: number;
                est2Subjects?: string;
              }>();

              for (const fl of flList) {
                const roomFolders = desc.folders.filter(
                  (f) =>
                    f.parentId === fl.id &&
                    (isRoomFolderName(f.name) ||
                      /^(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,4}|room\s*\d+|قاعة\s*\d+)$/i.test(f.name)),
                );

                for (const rf of roomFolders) {
                  const rKey = rf.name.trim().toLowerCase();
                  if (!roomsMap.has(rKey)) {
                    const rFiles = desc.files.filter((file) => file.parentId === rf.id);
                    let stdCount: number | undefined;
                    let subjText: string | undefined;
                    for (const rfFile of rFiles) {
                      const parsed = parseEstRoomFileName(rfFile.name);
                      if (parsed) {
                        stdCount = parsed.totalStudents;
                        subjText = parsed.breakdownText;
                        break;
                      }
                    }

                    const cp = counterpartMap.get(rKey);
                    const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                    let est1Count = isCurEst1 ? stdCount : cp?.studentCount;
                    let est1Subjects = isCurEst1 ? subjText : cp?.subjectsText;
                    let est2Count = !isCurEst1 ? stdCount : cp?.studentCount;
                    let est2Subjects = !isCurEst1 ? subjText : cp?.subjectsText;

                    roomsMap.set(rKey, {
                      room: rf.name.trim(),
                      studentCount: stdCount,
                      subjectsText: subjText,
                      est1Count,
                      est1Subjects,
                      est2Count,
                      est2Subjects,
                    });
                  }
                }

                // Check direct files in floor
                const directFiles = desc.files.filter((file) => file.parentId === fl.id);
                for (const df of directFiles) {
                  const parsed = parseEstRoomFileName(df.name);
                  const roomName = parsed?.room || df.name.replace(/\.[^/.]+$/, "");
                  const rKey = roomName.trim().toLowerCase();
                  if (!roomsMap.has(rKey)) {
                    const cp = counterpartMap.get(rKey);
                    const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                    let est1Count = isCurEst1 ? parsed?.totalStudents : cp?.studentCount;
                    let est1Subjects = isCurEst1 ? parsed?.breakdownText : cp?.subjectsText;
                    let est2Count = !isCurEst1 ? parsed?.totalStudents : cp?.studentCount;
                    let est2Subjects = !isCurEst1 ? parsed?.breakdownText : cp?.subjectsText;

                    roomsMap.set(rKey, {
                      room: roomName.trim(),
                      studentCount: parsed?.totalStudents,
                      subjectsText: parsed?.breakdownText,
                      est1Count,
                      est1Subjects,
                      est2Count,
                      est2Subjects,
                    });
                  }
                }
              }

              const sortedRooms = Array.from(roomsMap.values()).sort((a, b) =>
                a.room.localeCompare(b.room, undefined, { numeric: true }),
              );

              return {
                floor: displayFloorName,
                rooms: sortedRooms,
                totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 0), 0),
                est1Students: sortedRooms.reduce((s, r) => s + (r.est1Count || 0), 0),
                est2Students: sortedRooms.reduce((s, r) => s + (r.est2Count || 0), 0),
              };
            });

            floors.sort((a, b) => getFloorSortWeight(a.floor) - getFloorSortWeight(b.floor));
          } else {
            const directRooms = desc.folders.filter(
              (f) =>
                f.parentId === folderId &&
                (isRoomFolderName(f.name) ||
                  /^(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,4}|room\s*\d+|قاعة\s*\d+)$/i.test(f.name)),
            );
            if (directRooms.length > 0) {
              const rms = directRooms.map((rf) => {
                const rFiles = desc.files.filter((file) => file.parentId === rf.id);
                let stdCount: number | undefined;
                let subjText: string | undefined;
                for (const rfFile of rFiles) {
                  const parsed = parseEstRoomFileName(rfFile.name);
                  if (parsed) {
                    stdCount = parsed.totalStudents;
                    subjText = parsed.breakdownText;
                    break;
                  }
                }
                const rKey = rf.name.trim().toLowerCase();
                const cp = counterpartMap.get(rKey);
                const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                let est1Count = isCurEst1 ? stdCount : cp?.studentCount;
                let est1Subjects = isCurEst1 ? subjText : cp?.subjectsText;
                let est2Count = !isCurEst1 ? stdCount : cp?.studentCount;
                let est2Subjects = !isCurEst1 ? subjText : cp?.subjectsText;

                return {
                  room: rf.name,
                  studentCount: stdCount,
                  subjectsText: subjText,
                  est1Count,
                  est1Subjects,
                  est2Count,
                  est2Subjects,
                };
              });
              floors = [
                {
                  floor: "General Floor",
                  rooms: rms,
                  totalStudents: rms.reduce((s, r) => s + (r.studentCount || 0), 0),
                  est1Students: rms.reduce((s, r) => s + (r.est1Count || 0), 0),
                  est2Students: rms.reduce((s, r) => s + (r.est2Count || 0), 0),
                },
              ];
            }
          }
        } catch {}
      } else {
        const { drive, rootFolderId } = await getDriveContextWithRoot();
        let resolvedFolderId = folderId;
        try {
          const meta = await getFileMeta(drive, folderId, { resolveShortcut: false });
          if (meta.mimeType === "application/vnd.google-apps.shortcut" && meta.shortcutDetails?.targetId) {
            resolvedFolderId = meta.shortcutDetails.targetId;
          }
        } catch {}

        const data = await buildBreadcrumbs(drive, rootFolderId, resolvedFolderId);
        const crumbs = data.breadcrumbs;
        if (crumbs.length > 0) {
          const names = crumbs.map((c) => c.name || "").filter(Boolean);
          const estIdx = names.findIndex((n) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(n));
          const rel = estIdx >= 0 ? names.slice(estIdx) : names;
          if (rel[0]) examName = rel[0];
          if (rel[1]) governorate = rel[1];
          if (rel[2]) center = rel[2];
          if (rel[3]) building = rel[3];
        }

        // Search counterpart exam in Live Google Drive
        const counterpartMap = new Map<string, { studentCount: number; subjectsText: string }>();
        try {
          const estIdx = crumbs.findIndex((c) => /^EST(\s*[-_]?\s*([0-9]+|[IVXLCDM]+))?$/i.test(c.name || ""));
          if (estIdx >= 1) {
            const cycleId = crumbs[estIdx - 1]?.id;
            const curExam = crumbs[estIdx]?.name || "EST 1";
            const isEst1Cur = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(curExam);
            const cpExamName = isEst1Cur ? "EST 2" : "EST 1";
            const subPath = crumbs.slice(estIdx + 1).map((c) => (c.name || "").trim());

            if (cycleId) {
              const cpExamRes = await drive.files.list({
                q: `'${cycleId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${cpExamName}'`,
                fields: "files(id, name)",
                pageSize: 10,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
              });
              let curParentId = cpExamRes.data.files?.[0]?.id;
              if (curParentId && subPath.length > 0) {
                for (const seg of subPath) {
                  const segRes: any = await drive.files.list({
                    q: `'${curParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${seg}'`,
                    fields: "files(id, name)",
                    pageSize: 10,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                  });
                  curParentId = segRes.data.files?.[0]?.id;
                  if (!curParentId) break;
                }
              }

              if (curParentId) {
                const cpSubsRes = await drive.files.list({
                  q: `'${curParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                  fields: "files(id, name)",
                  pageSize: 100,
                  supportsAllDrives: true,
                  includeItemsFromAllDrives: true,
                });
                const cpFloors = (cpSubsRes.data.files || []).filter((f) => isFloorFolderName(f.name));
                for (const fl of cpFloors) {
                  const cpRoomsRes = await drive.files.list({
                    q: `'${fl.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: "files(id, name)",
                    pageSize: 100,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                  });
                  for (const rm of cpRoomsRes.data.files || []) {
                    const rKey = (rm.name || "").trim().toLowerCase();
                    if (!counterpartMap.has(rKey)) {
                      let sCount = 0;
                      let sText = "";
                      try {
                        const fRes = await drive.files.list({
                          q: `'${rm.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                          fields: "files(id, name)",
                          pageSize: 10,
                          supportsAllDrives: true,
                          includeItemsFromAllDrives: true,
                        });
                        for (const f of fRes.data.files || []) {
                          const parsed = parseEstRoomFileName(f.name || "");
                          if (parsed) {
                            sCount = parsed.totalStudents;
                            sText = parsed.breakdownText;
                            break;
                          }
                        }
                      } catch {}
                      counterpartMap.set(rKey, { studentCount: sCount, subjectsText: sText });
                    }
                  }
                }
              }
            }
          }
        } catch {}

        // Query floor subfolders under building
        try {
          const subRes = await drive.files.list({
            q: `'${resolvedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          const subs = subRes.data.files || [];
          const floorSubs = subs.filter((f) => isFloorFolderName(f.name));
          const directRooms = subs.filter(
            (f) =>
              isRoomFolderName(f.name) ||
              /^(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,4}|room\s*\d+|قاعة\s*\d+)$/i.test(f.name || ""),
          );

          if (floorSubs.length > 0) {
            // Group duplicate floor folders by name to merge Drive folders
            const floorGroups = new Map<string, Array<{ id: string; name: string }>>();
            for (const fl of floorSubs) {
              const k = (fl.name || "").trim().toLowerCase();
              const grp = floorGroups.get(k) || [];
              grp.push({ id: fl.id!, name: fl.name!.trim() });
              floorGroups.set(k, grp);
            }

            for (const [_, flList] of floorGroups.entries()) {
              const displayFloorName = flList[0].name;
              const roomsMap = new Map<
                string,
                {
                  room: string;
                  studentCount?: number;
                  subjectsText?: string;
                  est1Count?: number;
                  est1Subjects?: string;
                  est2Count?: number;
                  est2Subjects?: string;
                }
              >();

              for (const fl of flList) {
                const roomRes = await drive.files.list({
                  q: `'${fl.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                  fields: "files(id, name)",
                  pageSize: 100,
                  supportsAllDrives: true,
                  includeItemsFromAllDrives: true,
                });
                const floorRooms = roomRes.data.files || [];

                for (const rm of floorRooms) {
                  const rName = (rm.name || "").trim();
                  if (!rName) continue;
                  const rKey = rName.toLowerCase();
                  if (!roomsMap.has(rKey)) {
                    let stdCount: number | undefined;
                    let subjText: string | undefined;
                    try {
                      const fileRes = await drive.files.list({
                        q: `'${rm.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                        fields: "files(id, name)",
                        pageSize: 20,
                        supportsAllDrives: true,
                        includeItemsFromAllDrives: true,
                      });
                      for (const f of fileRes.data.files || []) {
                        const parsed = parseEstRoomFileName(f.name || "");
                        if (parsed) {
                          stdCount = parsed.totalStudents;
                          subjText = parsed.breakdownText;
                          break;
                        }
                      }
                    } catch {}
                    const cp = counterpartMap.get(rKey);
                    const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                    let est1Count = isCurEst1 ? stdCount : cp?.studentCount;
                    let est1Subjects = isCurEst1 ? subjText : cp?.subjectsText;
                    let est2Count = !isCurEst1 ? stdCount : cp?.studentCount;
                    let est2Subjects = !isCurEst1 ? subjText : cp?.subjectsText;

                    roomsMap.set(rKey, {
                      room: rName,
                      studentCount: stdCount,
                      subjectsText: subjText,
                      est1Count,
                      est1Subjects,
                      est2Count,
                      est2Subjects,
                    });
                  }
                }

                // Also inspect direct files inside the floor folder
                try {
                  const directFloorFiles = await drive.files.list({
                    q: `'${fl.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: "files(id, name)",
                    pageSize: 50,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                  });
                  for (const f of directFloorFiles.data.files || []) {
                    const parsed = parseEstRoomFileName(f.name || "");
                    const roomName = parsed?.room || (f.name || "").replace(/\.[^/.]+$/, "").trim();
                    if (!roomName) continue;
                    const rKey = roomName.toLowerCase();
                    if (!roomsMap.has(rKey)) {
                      const cp = counterpartMap.get(rKey);
                      const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                      let est1Count = isCurEst1 ? parsed?.totalStudents : cp?.studentCount;
                      let est1Subjects = isCurEst1 ? parsed?.breakdownText : cp?.subjectsText;
                      let est2Count = !isCurEst1 ? parsed?.totalStudents : cp?.studentCount;
                      let est2Subjects = !isCurEst1 ? parsed?.breakdownText : cp?.subjectsText;

                      roomsMap.set(rKey, {
                        room: roomName,
                        studentCount: parsed?.totalStudents,
                        subjectsText: parsed?.breakdownText,
                        est1Count,
                        est1Subjects,
                        est2Count,
                        est2Subjects,
                      });
                    }
                  }
                } catch {}
              }

              const sortedRooms = Array.from(roomsMap.values()).sort((a, b) =>
                a.room.localeCompare(b.room, undefined, { numeric: true }),
              );

              if (sortedRooms.length > 0) {
                floors.push({
                  floor: displayFloorName,
                  rooms: sortedRooms,
                  totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 0), 0),
                  est1Students: sortedRooms.reduce((s, r) => s + (r.est1Count || 0), 0),
                  est2Students: sortedRooms.reduce((s, r) => s + (r.est2Count || 0), 0),
                });
              }
            }

            floors.sort((a, b) => getFloorSortWeight(a.floor) - getFloorSortWeight(b.floor));
          } else if (directRooms.length > 0) {
            const roomsMap = new Map<string, {
              room: string;
              studentCount?: number;
              subjectsText?: string;
              est1Count?: number;
              est1Subjects?: string;
              est2Count?: number;
              est2Subjects?: string;
            }>();
            for (const rm of directRooms) {
              const rName = (rm.name || "").trim();
              if (!rName) continue;
              const rKey = rName.toLowerCase();
              if (!roomsMap.has(rKey)) {
                let stdCount: number | undefined;
                let subjText: string | undefined;
                try {
                  const fileRes = await drive.files.list({
                    q: `'${rm.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: "files(id, name)",
                    pageSize: 20,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                  });
                  for (const f of fileRes.data.files || []) {
                    const parsed = parseEstRoomFileName(f.name || "");
                    if (parsed) {
                      stdCount = parsed.totalStudents;
                      subjText = parsed.breakdownText;
                      break;
                    }
                  }
                } catch {}
                const cp = counterpartMap.get(rKey);
                const isCurEst1 = !/EST\s*[-_]?\s*2\b|EST\s*II\b/i.test(examName);
                let est1Count = isCurEst1 ? stdCount : cp?.studentCount;
                let est1Subjects = isCurEst1 ? subjText : cp?.subjectsText;
                let est2Count = !isCurEst1 ? stdCount : cp?.studentCount;
                let est2Subjects = !isCurEst1 ? subjText : cp?.subjectsText;

                roomsMap.set(rKey, {
                  room: rName,
                  studentCount: stdCount,
                  subjectsText: subjText,
                  est1Count,
                  est1Subjects,
                  est2Count,
                  est2Subjects,
                });
              }
            }
            const sortedRooms = Array.from(roomsMap.values()).sort((a, b) =>
              a.room.localeCompare(b.room, undefined, { numeric: true }),
            );
            floors.push({
              floor: "General Floor",
              rooms: sortedRooms,
              totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 0), 0),
              est1Students: sortedRooms.reduce((s, r) => s + (r.est1Count || 0), 0),
              est2Students: sortedRooms.reduce((s, r) => s + (r.est2Count || 0), 0),
            });
          }
        } catch {}
      }
    }

    // Fallback: Check official EST schools first for canonical definition
    if (floors.length === 0 && building) {
      const cleanB = building.toLowerCase().trim();
      const official = OFFICIAL_EST_SCHOOLS.find(
        (s) =>
          s.schoolName.toLowerCase() === cleanB ||
          s.fullFolderName.toLowerCase() === cleanB ||
          cleanB.includes(s.schoolName.toLowerCase()) ||
          s.schoolName.toLowerCase().includes(cleanB),
      );
      if (official) {
        floors = official.floors.map((fl) => ({
          floor: fl.floorName,
          rooms: fl.rooms.map((rm) => ({
            room: rm,
            studentCount: 0,
            est1Count: undefined,
            est1Subjects: undefined,
            est2Count: undefined,
            est2Subjects: undefined,
          })),
          totalStudents: 0,
          est1Students: 0,
          est2Students: 0,
        }));
      }
    }

    // Fallback room names and floors from reference data if not yet populated
    if (floors.length === 0 && building) {
      const cleanB = building.toLowerCase().trim();
      const refRows = EST_REFERENCE_DATA.filter((r) => {
        const rb = r.building.toLowerCase().trim();
        return (
          (!governorate || r.governorate === governorate) &&
          (!center || r.testCenter === center) &&
          (rb === cleanB || cleanB.includes(rb) || rb.includes(cleanB))
        );
      });

      if (refRows.length > 0) {
        const floorMap = new Map<
          string,
          { rooms: { room: string; studentCount: number }[]; totalStudents: number }
        >();
        for (const r of refRows) {
          const fl = r.floor || "General Floor";
          const entry = floorMap.get(fl) || { rooms: [], totalStudents: 0 };
          if (r.room && !entry.rooms.some((rm) => rm.room.toLowerCase() === r.room.toLowerCase())) {
            entry.rooms.push({ room: r.room, studentCount: r.studentsEst1 || 0 });
            entry.totalStudents += r.studentsEst1 || 0;
          }
          floorMap.set(fl, entry);
        }
        floors = Array.from(floorMap.entries()).map(([floorName, data]) => ({
          floor: floorName,
          rooms: data.rooms.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true })),
          totalStudents: data.totalStudents,
        }));
        floors.sort((a, b) => getFloorSortWeight(a.floor) - getFloorSortWeight(b.floor));
      }
    }

    // Fallback room names if still empty
    if (roomNames.length === 0 && building) {
      const refInfo = getReferenceSubfolderInfo({
        level: "building",
        governorate,
        center,
        building,
      });
      if (refInfo.childNames && refInfo.childNames.length > 0) {
        roomNames = refInfo.childNames;
      }
    }

    if (floors.length > 0) {
      totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);
      totalStudents = floors.reduce((sum, f) => sum + (f.totalStudents || 0), 0);
      roomNames = floors.flatMap((f) => f.rooms.map((r) => (typeof r === "string" ? r : r.room)));
    } else {
      totalRooms = totalRooms || (roomNames.length > 0 ? roomNames.length : 0);
      totalStudents = totalStudents || 0;
    }

    const options: LogisticsStickerOptions = {
      examName,
      governorate: governorate || "Alexandria",
      center: center || "Abu Qir",
      building: building || "Building HQ",
      date,
      totalRooms,
      totalStudents,
      roomNames: roomNames.length > 0 ? roomNames : undefined,
      floors: floors.length > 0 ? floors : undefined,
      boxNumber: Number(url.searchParams.get("boxNumber")) || 1,
      totalBoxes: Number(url.searchParams.get("totalBoxes")) || 1,
      securitySeal: url.searchParams.get("securitySeal") || undefined,
      notes: url.searchParams.get("notes") || undefined,
    };

    if (type === "hierarchy") {
      const norm = normalizeFloorsData(options);
      const totalFloorsCount = norm.length;
      const allRooms = norm.flatMap((f) => f.rooms);
      const totalRoomsCount = allRooms.length;
      const est1Total = norm.reduce((s, f) => s + (f.est1Students || 0), 0);
      const est2Total = norm.reduce((s, f) => s + (f.est2Students || 0), 0);
      const grandTotal = est1Total + est2Total;

      return NextResponse.json({
        governorate: options.governorate || governorate,
        center: options.center || center,
        building: options.building || building,
        examName: options.examName || examName,
        date: options.date || date,
        totalFloors: totalFloorsCount,
        totalRooms: totalRoomsCount,
        est1TotalCandidates: est1Total,
        est2TotalCandidates: est2Total,
        grandTotalCandidates: grandTotal,
        floors: norm,
      });
    }

    let pdfBytes: Uint8Array;
    let filename: string;

    switch (type) {
      case "carton":
        pdfBytes = await generateBuildingCartonStickerPdf(options);
        filename = `Carton-${options.building}.pdf`;
        break;
      case "bag":
        pdfBytes = await generateExamBagChecklistPdf(options);
        filename = `Bag-Checklist-${options.building}.pdf`;
        break;
      case "manifest":
        pdfBytes = await generateMasterBuildingManifestPdf(options);
        filename = `Master-Manifest-${options.building}.pdf`;
        break;
      case "clean_skin_log":
        pdfBytes = await generateCleanSkinDispatchLogPdf(options);
        filename = `Clean-Skin-Log-${options.building}.pdf`;
        break;
      case "clean_skin_master":
        pdfBytes = await generateCleanSkinMasterPdf(options);
        filename = `Clean-Skin-Master-${options.building}.pdf`;
        break;
      case "clean_skin_subjects":
        pdfBytes = await generateCleanSkinSubjectStickersPdf(options);
        filename = `Clean-Skin-Subjects-${options.building}.pdf`;
        break;
      case "bundle":
      default:
        pdfBytes = await generateCompleteLogisticsBundlePdf(options);
        filename = `Logistics-Bundle-${options.building}.pdf`;
        break;
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, "_"))}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

