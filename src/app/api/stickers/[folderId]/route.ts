import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { buildBreadcrumbs, getFileMeta } from "@/lib/drive";
import { getDemoBreadcrumbs, getDemoDescendants, isDemoEnabled } from "@/lib/demo";
import { getSettings } from "@/lib/settings";
import { buildStickerContent, type StickerSubfolderInfo } from "@/lib/stickers/sticker-content";
import { generateStickerPdf, generateExamStickersPdf } from "@/lib/stickers/sticker-pdf";
import { generateFloorExamStickersPdf, resolveFloorSubjectsData } from "@/lib/stickers/floor-exam-stickers-pdf";
import { isFloorFolderName, isRoomFolderName } from "@/lib/stickers/register-utils";
import { getRoomExamCounts } from "@/lib/stickers/est-room-data";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ folderId: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "sticker:generate", 120, 60_000);

    const { folderId } = await context.params;
    if (!folderId) {
      throw new AppError("Folder ID is required", { status: 400, code: "invalidRequest" });
    }

    const url = new URL(request.url);
    const customChainParam = url.searchParams.get("chain");
    const stickerType = url.searchParams.get("type"); // "regular" | "exam"
    const settings = await getSettings();

    const widthMm = Math.max(
      30,
      Math.min(300, Number(url.searchParams.get("width")) || settings.printing.stickerWidthMm || 100),
    );
    const heightMm = Math.max(
      20,
      Math.min(200, Number(url.searchParams.get("height")) || settings.printing.stickerHeightMm || 50),
    );
    const paperMode = (url.searchParams.get("paper") as "custom" | "a4") || settings.printing.stickerPaperMode || "a4";
    const orientation = (url.searchParams.get("orientation") as "portrait" | "landscape") || settings.printing.stickerOrientation || "portrait";

    let breadcrumbs: Array<{ id?: string; name?: string | null }> = [];
    let driveSubfolderInfo: StickerSubfolderInfo | undefined;
    let folderFiles: Array<{ name: string }> = [];
    let resolvedFolderId = folderId;
    let isDemo = false;
    let activeDrive: any = null;

    if (customChainParam) {
      try {
        const parsed = JSON.parse(customChainParam);
        if (Array.isArray(parsed)) {
          breadcrumbs = parsed.map((item) => (typeof item === "string" ? { name: item } : item));
        }
      } catch {
        breadcrumbs = customChainParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name }));
      }
    }

    if (breadcrumbs.length === 0) {
      const connection = await getConnection();
      const connected = connection?.connectionStatus === "connected";
      isDemo = isDemoEnabled() && !connected;

      if (isDemo || folderId.startsWith("demo-")) {
        isDemo = true;
        const demoData = getDemoBreadcrumbs(folderId);
        breadcrumbs = demoData.breadcrumbs;
        if (breadcrumbs.length === 0 && demoData.currentFolder) {
          breadcrumbs = [demoData.currentFolder];
        }
        try {
          const desc = getDemoDescendants([folderId]);
          folderFiles = desc.files.map((f) => ({ name: f.name }));
        } catch { }
      } else {
        const { drive, rootFolderId } = await getDriveContextWithRoot();
        activeDrive = drive;

        // Check if the requested folder exists and is a folder
        try {
          const meta = await getFileMeta(drive, folderId, { resolveShortcut: false });
          if (meta.mimeType === "application/vnd.google-apps.shortcut" && meta.shortcutDetails?.targetId) {
            resolvedFolderId = meta.shortcutDetails.targetId;
          }
        } catch (err) {
          console.warn("[sticker] Error reading folder metadata:", err);
        }

        const data = await buildBreadcrumbs(drive, rootFolderId, resolvedFolderId);
        breadcrumbs = data.breadcrumbs;
        if (breadcrumbs.length === 0 && data.currentFolder) {
          breadcrumbs = [data.currentFolder];
        }

        // Query direct subfolders to provide live count of floors or rooms
        try {
          const subRes = await drive.files.list({
            q: `'${resolvedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          const subs = subRes.data.files || [];
          if (subs.length > 0) {
            driveSubfolderInfo = {
              childCount: subs.length,
              childNames: subs.map((s) => s.name || "").filter(Boolean),
            };
          }
        } catch (err) {
          console.warn("[sticker] Error querying direct subfolders:", err);
        }

        // Query direct files to check for EST I room file naming patterns
        try {
          const filesRes = await drive.files.list({
            q: `'${resolvedFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name, createdTime, modifiedTime)",
            orderBy: "createdTime desc, modifiedTime desc",
            pageSize: 50,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          folderFiles = (filesRes.data.files || []).map((f) => ({ name: f.name || "" }));
        } catch (err) {
          console.warn("[sticker] Error querying direct files:", err);
        }
      }
    }

    const knownFilesParam = url.searchParams.get("knownFiles");
    if (knownFilesParam) {
      try {
        const parsedFiles = JSON.parse(knownFilesParam);
        if (Array.isArray(parsedFiles)) {
          for (const fn of parsedFiles) {
            if (typeof fn === "string" && !folderFiles.some((f) => f.name === fn)) {
              folderFiles.unshift({ name: fn });
            }
          }
        }
      } catch {}
    }

    if (breadcrumbs.length === 0) {
      throw new AppError("Could not resolve folder hierarchy for sticker", {
        status: 404,
        code: "notFound",
      });
    }

    const stickerContent = buildStickerContent(breadcrumbs, driveSubfolderInfo);
    const targetName = breadcrumbs[breadcrumbs.length - 1]?.name || "EST";
    const targetRoom = stickerContent.room || (stickerContent.level === "room" ? targetName : undefined);

    const roomCounts = targetRoom
      ? getRoomExamCounts({
        room: targetRoom,
        building: stickerContent.building,
        center: stickerContent.center,
        governorate: stickerContent.governorate,
        floor: stickerContent.floor,
        folderFiles,
        examName: stickerContent.examName,
      })
      : null;

    if (roomCounts) {
      stickerContent.totalStudents = roomCounts.totalStudents;
      stickerContent.litCount = roomCounts.litCount;
      stickerContent.mathCount = roomCounts.mathCount;
      stickerContent.essayCount = roomCounts.essayCount;
      stickerContent.hasEssay = roomCounts.hasEssay;
      stickerContent.subjects = roomCounts.subjects;
      stickerContent.breakdownText = roomCounts.breakdownText;
      stickerContent.examType = roomCounts.examType;
    }

    let pdfBytes: Uint8Array;
    let safeFilename: string;

    if (stickerType === "exam") {
      const isFloor =
        stickerContent.level === "floor" ||
        isFloorFolderName(targetName) ||
        (Boolean(driveSubfolderInfo?.childNames?.length) &&
          driveSubfolderInfo!.childNames!.some((cn) => isRoomFolderName(cn))) ||
        Boolean(stickerContent.floor && !stickerContent.room && !isRoomFolderName(targetName));

      if (isFloor) {
        const floorSubjects = await resolveFloorSubjectsData({
          resolvedFolderId,
          floorName: stickerContent.floor || targetName,
          stickerContent,
          drive: activeDrive,
          isDemo,
        });

        pdfBytes = await generateFloorExamStickersPdf({
          floorName: stickerContent.floor || targetName,
          examName: stickerContent.examName,
          governorate: stickerContent.governorate,
          center: stickerContent.center,
          building: stickerContent.building,
          date: stickerContent.cleanChain.find((c) =>
            /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*\d{4}\b/i.test(c),
          ),
          subjects: floorSubjects,
        });
        safeFilename = `Floor-Exam-Stickers-${targetName.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
      } else {
        pdfBytes = await generateExamStickersPdf({
          content: stickerContent,
          litCount: roomCounts?.litCount,
          mathCount: roomCounts?.mathCount,
          essayCount: roomCounts?.essayCount,
          subjects: roomCounts?.subjects ?? stickerContent.subjects,
          orientation,
        });
        safeFilename = `Exam-Stickers-${targetName.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
      }
    } else {
      pdfBytes = await generateStickerPdf({
        content: stickerContent,
        lines: stickerContent.lines,
        widthMm,
        heightMm,
        paperMode,
        orientation,
      });
      safeFilename = `Sticker-${targetName.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFilename)}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

