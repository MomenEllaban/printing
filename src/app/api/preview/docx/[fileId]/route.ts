import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { exportDownloadUrl, getFileMeta, mediaDownloadUrl, resolveExportFormat } from "@/lib/drive";
import { getDemoItem, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { MIME, isGoogleWorkspaceFile } from "@/lib/file-utils";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "preview:docx", 60, 60_000);
    const { fileId } = await context.params;
    const settings = await getSettings();

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    if (isDemoEnabled() && !connected) {
      if (getDemoItem(fileId)) {
        throw new AppError("DOCX preview is not available for demo data. Connect Google Drive to preview Word documents.", {
          status: 415,
          code: "unsupportedType",
        });
      }
      throw new AppError("File not found", { status: 404, code: "fileNotFound" });
    }

    const { oauth, drive } = await getDriveContextWithRoot();
    const accessToken = oauth.credentials.access_token;
    if (!accessToken) throw new AppError("Google authorization expired", { status: 401, code: "tokenRefresh" });

    const meta = await getFileMeta(drive, fileId);
    const effectiveFileId = meta.shortcutDetails?.targetId || fileId;
    const mimeType = meta.mimeType ?? "";
    const maxBytes = settings.preview.maxPreviewSizeMb * 1024 * 1024;
    if (meta.size && Number(meta.size) > maxBytes) {
      throw new AppError("File is too large to preview", { status: 413, code: "fileTooLarge" });
    }

    if (mimeType === MIME.doc) {
      throw new AppError("Legacy .doc preview is not supported. Download the file or convert it to DOCX.", {
        status: 415,
        code: "unsupportedType",
      });
    }

    let upstream: Response;
    if (isGoogleWorkspaceFile(mimeType)) {
      const resolved = resolveExportFormat(mimeType, "docx");
      if (!resolved) {
        throw new AppError("This document cannot be exported to DOCX", { status: 415, code: "unsupportedType" });
      }
      upstream = await fetch(exportDownloadUrl(effectiveFileId, resolved.mimeType), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } else if (mimeType === MIME.docx) {
      upstream = await fetch(mediaDownloadUrl(effectiveFileId), {
        headers: { Authorization: `Bearer ${accessToken}`, "Accept-Encoding": "identity" },
        cache: "no-store",
      });
    } else {
      throw new AppError("This file is not a Word document", { status: 415, code: "unsupportedType" });
    }

    if (!upstream.ok) {
      throw new AppError("Could not read the document", { status: 502, code: "download" });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) });
    const html = sanitizeHtml(result.value, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        "img",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "td",
        "th",
        "colgroup",
        "col",
        "s",
        "sub",
        "sup",
      ],
      allowedAttributes: {
        img: ["src", "alt", "width", "height"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan"],
        col: ["span", "width"],
        a: ["href", "name", "target"],
      },
      allowedSchemes: ["data", "http", "https"],
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      },
    });

    return NextResponse.json({
      html,
      messages: result.messages.slice(0, 20).map((message) => message.message),
    });
  } catch (error) {
    return jsonError(error);
  }
}
