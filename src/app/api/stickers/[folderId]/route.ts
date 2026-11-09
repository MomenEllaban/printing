import { NextResponse } from "next/server";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { buildBreadcrumbs, getFileMeta } from "@/lib/drive";
import { getDemoBreadcrumbs, isDemoEnabled } from "@/lib/demo";
import { getSettings } from "@/lib/settings";
import { buildStickerContent } from "@/lib/stickers/sticker-content";
import { generateStickerPdf } from "@/lib/stickers/sticker-pdf";
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
    const settings = await getSettings();

    const widthMm = Math.max(
      30,
      Math.min(300, Number(url.searchParams.get("width")) || settings.printing.stickerWidthMm || 100),
    );
    const heightMm = Math.max(
      20,
      Math.min(200, Number(url.searchParams.get("height")) || settings.printing.stickerHeightMm || 50),
    );
    const paperMode = (url.searchParams.get("paper") as "custom" | "a4") || settings.printing.stickerPaperMode || "custom";

    let breadcrumbs: Array<{ id?: string; name?: string | null }> = [];

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
      const isDemo = isDemoEnabled() && !connected;

      if (isDemo || folderId.startsWith("demo-")) {
        const demoData = getDemoBreadcrumbs(folderId);
        breadcrumbs = demoData.breadcrumbs;
        if (breadcrumbs.length === 0 && demoData.currentFolder) {
          breadcrumbs = [demoData.currentFolder];
        }
      } else {
        const { drive, rootFolderId } = await getDriveContextWithRoot();

        // Check if the requested folder exists and is a folder
        let resolvedFolderId = folderId;
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
      }
    }

    if (breadcrumbs.length === 0) {
      throw new AppError("Could not resolve folder hierarchy for sticker", {
        status: 404,
        code: "notFound",
      });
    }

    const stickerContent = buildStickerContent(breadcrumbs);
    const pdfBytes = await generateStickerPdf({
      lines: stickerContent.lines,
      widthMm,
      heightMm,
      paperMode,
    });

    const targetName = breadcrumbs[breadcrumbs.length - 1]?.name || "EST";
    const safeFilename = `Sticker-${targetName.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;

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

