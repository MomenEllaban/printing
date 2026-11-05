import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFileMeta, exportDownloadUrl, mediaDownloadUrl, resolveExportFormat } from "@/lib/drive";
import { demoContent, getDemoItem, isDemoEnabled } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, jsonError, requireSession } from "@/lib/api-utils";
import { contentDisposition, isGoogleWorkspaceFile, mimeForFileName } from "@/lib/file-utils";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "drive:content", 300, 60_000);
    const { fileId } = await context.params;
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const format = url.searchParams.get("format");
    const settings = await getSettings();
    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";

    if (isDemoEnabled() && !connected) {
      const content = demoContent(fileId);
      const item = getDemoItem(fileId);
      if (!content || !item) throw new AppError("File not found", { status: 404, code: "fileNotFound" });
      const fileName = /\.csv$/i.test(item.name) ? item.name.replace(/\.csv$/i, ".xlsx") : item.name;
      return new Response(new Uint8Array(content.buffer), {
        headers: {
          "Content-Type": content.mimeType,
          "Content-Length": String(content.buffer.length),
          "Content-Disposition": contentDisposition(fileName, download ? "attachment" : "inline"),
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    const { oauth, drive } = await getDriveContextWithRoot();
    const accessToken = oauth.credentials.access_token;
    if (!accessToken) {
      throw new AppError("Google authorization expired", { status: 401, code: "tokenRefresh" });
    }

    const meta = await getFileMeta(drive, fileId);
    if (meta.mimeType === "application/vnd.google-apps.folder") {
      throw new AppError("Folders cannot be downloaded", { code: "invalidRequest" });
    }

    const maxPreviewBytes = settings.preview.maxPreviewSizeMb * 1024 * 1024;
    const size = meta.size ? Number(meta.size) : 0;
    if (!download && size > 0 && size > maxPreviewBytes) {
      throw new AppError("File is too large to preview", { status: 413, code: "fileTooLarge" });
    }

    const isNative = isGoogleWorkspaceFile(meta.mimeType ?? "");
    let upstream: Response;
    let contentType: string;
    let outName: string;

    if (isNative) {
      const resolved = resolveExportFormat(meta.mimeType ?? "", format);
      if (!resolved) {
        throw new AppError("This Google Workspace file cannot be exported", {
          status: 415,
          code: "unsupportedType",
        });
      }
      contentType = resolved.mimeType;
      const baseName = (meta.name ?? "document").replace(/\.(pdf|docx|xlsx|pptx)$/i, "");
      outName = `${baseName}.${resolved.extension}`;
      upstream = await fetch(exportDownloadUrl(fileId, resolved.mimeType), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } else {
      const resolvedMime = meta.mimeType && meta.mimeType !== "application/octet-stream"
        ? meta.mimeType
        : mimeForFileName(meta.name ?? "", "application/octet-stream");
      contentType = resolvedMime;
      outName = meta.name ?? `file-${fileId}`;
      const range = request.headers.get("range");
      upstream = await fetch(mediaDownloadUrl(fileId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept-Encoding": "identity",
          ...(range ? { Range: range } : {}),
        },
        cache: "no-store",
      });
    }

    if (!upstream.ok) {
      const status = upstream.status === 404 ? 404 : upstream.status === 401 || upstream.status === 403 ? 403 : 502;
      throw new AppError(
        status === 404 ? "File not found" : status === 403 ? "Access denied" : "Could not read file content",
        { status, code: status === 404 ? "fileNotFound" : status === 403 ? "unauthorized" : "download" },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", contentDisposition(outName, download ? "attachment" : "inline"));
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    headers.set("X-Content-Type-Options", "nosniff");
    const length = upstream.headers.get("content-length");
    const rangeHeader = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (length) headers.set("Content-Length", length);
    if (rangeHeader) headers.set("Content-Range", rangeHeader);
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return jsonError(error);
  }
}
