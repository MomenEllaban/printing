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
  generateCleanSkinSubjectStickersPdf,
  generateCompleteLogisticsBundlePdf,
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
              const roomsMap = new Map<string, { room: string; studentCount?: number; subjectsText?: string }>();

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
                    roomsMap.set(rKey, {
                      room: rf.name.trim(),
                      studentCount: stdCount,
                      subjectsText: subjText,
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
                    roomsMap.set(rKey, {
                      room: roomName.trim(),
                      studentCount: parsed?.totalStudents,
                      subjectsText: parsed?.breakdownText,
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
                totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 25), 0),
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
                return {
                  room: rf.name,
                  studentCount: stdCount,
                  subjectsText: subjText,
                };
              });
              floors = [
                {
                  floor: "General Floor",
                  rooms: rms,
                  totalStudents: rms.reduce((s, r) => s + (r.studentCount || 25), 0),
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
              const roomsMap = new Map<string, { room: string; studentCount?: number; subjectsText?: string }>();

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
                    roomsMap.set(rKey, {
                      room: rName,
                      studentCount: stdCount || 25,
                      subjectsText: subjText,
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
                      roomsMap.set(rKey, {
                        room: roomName,
                        studentCount: parsed?.totalStudents || 25,
                        subjectsText: parsed?.breakdownText,
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
                  totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 25), 0),
                });
              }
            }

            floors.sort((a, b) => getFloorSortWeight(a.floor) - getFloorSortWeight(b.floor));
          } else if (directRooms.length > 0) {
            const roomsMap = new Map<string, { room: string; studentCount?: number; subjectsText?: string }>();
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
                roomsMap.set(rKey, {
                  room: rName,
                  studentCount: stdCount || 25,
                  subjectsText: subjText,
                });
              }
            }
            const sortedRooms = Array.from(roomsMap.values()).sort((a, b) =>
              a.room.localeCompare(b.room, undefined, { numeric: true }),
            );
            floors.push({
              floor: "General Floor",
              rooms: sortedRooms,
              totalStudents: sortedRooms.reduce((s, r) => s + (r.studentCount || 25), 0),
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
          rooms: fl.rooms.map((rm) => ({ room: rm, studentCount: 25 })),
          totalStudents: fl.rooms.length * 25,
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
            entry.rooms.push({ room: r.room, studentCount: r.studentsEst1 || 25 });
            entry.totalStudents += r.studentsEst1 || 25;
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
      totalRooms = totalRooms || (roomNames.length > 0 ? roomNames.length : 12);
      totalStudents = totalStudents || (roomNames.length > 0 ? roomNames.length * 25 : 300);
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

