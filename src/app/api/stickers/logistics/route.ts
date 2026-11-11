import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { buildBreadcrumbs, getFileMeta } from "@/lib/drive";
import { getDemoBreadcrumbs, getDemoDescendants, isDemoEnabled } from "@/lib/demo";
import { getReferenceSubfolderInfo } from "@/lib/stickers/est-reference-data";
import {
  generateBuildingCartonStickerPdf,
  generateExamBagChecklistPdf,
  generateCleanSkinMasterPdf,
  generateCleanSkinSubjectStickersPdf,
  generateCompleteLogisticsBundlePdf,
  type LogisticsStickerOptions,
} from "@/lib/stickers/logistics-stickers-pdf";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

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

    const roomNamesParam = url.searchParams.get("roomNames");
    if (roomNamesParam) {
      try {
        const parsed = JSON.parse(roomNamesParam);
        if (Array.isArray(parsed)) roomNames = parsed.map(String);
      } catch {
        roomNames = roomNamesParam.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    // If folderId is provided, resolve hierarchy and child rooms dynamically
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
          const childRooms = desc.folders.filter((f) =>
            /^(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,4}|room\s*\d+|قاعة\s*\d+)$/i.test(f.name),
          );
          if (childRooms.length > 0) {
            roomNames = childRooms.map((r) => r.name);
            totalRooms = roomNames.length;
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

        // Query direct or nested room subfolders
        try {
          const subRes = await drive.files.list({
            q: `'${resolvedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          const subs = subRes.data.files || [];
          const directRooms = subs.filter((f) =>
            /^(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,4}|room\s*\d+|قاعة\s*\d+)$/i.test(f.name || ""),
          );
          if (directRooms.length > 0) {
            roomNames = directRooms.map((r) => r.name || "").filter(Boolean);
            totalRooms = roomNames.length;
          }
        } catch {}
      }
    }

    // Fallback room names from reference data if not yet populated
    if (roomNames.length === 0 && building) {
      const refInfo = getReferenceSubfolderInfo({
        level: "building",
        governorate,
        center,
        building,
      });
      if (refInfo.childNames && refInfo.childNames.length > 0) {
        roomNames = refInfo.childNames;
        totalRooms = refInfo.childNames.length;
      }
    }

    const options: LogisticsStickerOptions = {
      examName,
      governorate: governorate || "Alexandria",
      center: center || "Abu Qir",
      building: building || "Building HQ",
      date,
      totalRooms: totalRooms || (roomNames.length > 0 ? roomNames.length : 12),
      totalStudents: totalStudents || (roomNames.length > 0 ? roomNames.length * 25 : 300),
      roomNames: roomNames.length > 0 ? roomNames : undefined,
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

