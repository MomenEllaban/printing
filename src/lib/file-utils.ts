import type { FileCategory } from "./types";

export const MIME = {
  folder: "application/vnd.google-apps.folder",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  googleDoc: "application/vnd.google-apps.document",
  googleSheet: "application/vnd.google-apps.spreadsheet",
  googleSlides: "application/vnd.google-apps.presentation",
  shortcut: "application/vnd.google-apps.shortcut",
} as const;

export const EXCEL_MIMES: string[] = [
  MIME.xlsx,
  MIME.xls,
  MIME.csv,
  MIME.googleSheet,
  "application/x-excel",
  "application/x-msexcel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  "text/comma-separated-values",
  "text/tab-separated-values",
  "application/csv",
];
export const WORD_MIMES: string[] = [
  MIME.docx,
  MIME.doc,
  MIME.googleDoc,
  "application/rtf",
  "text/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
];
export const IMAGE_MIMES: string[] = [
  MIME.jpeg,
  MIME.png,
  MIME.webp,
  MIME.gif,
  MIME.svg,
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/tiff",
];

export const CATEGORY_MIME_FILTERS: Record<Exclude<FileCategory, "other">, string> = {
  pdf: MIME.pdf,
  excel: EXCEL_MIMES.join(","),
  word: WORD_MIMES.join(","),
  image: IMAGE_MIMES.join(","),
};

export const DEFAULT_ALLOWED_EXTENSIONS = [
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "xlsm",
  "xlsb",
  "docx",
  "doc",
  "rtf",
  "pptx",
  "ppt",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "bmp",
];

export function extensionOf(name: string, mimeType?: string | null): string | null {
  if (mimeType === MIME.googleDoc) return "gdoc";
  if (mimeType === MIME.googleSheet) return "gsheet";
  if (mimeType === MIME.googleSlides) return "gslides";
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < name.length - 1) {
    return name.slice(lastDot + 1).toLowerCase();
  }
  const byMime: Record<string, string> = {
    [MIME.pdf]: "pdf",
    [MIME.xlsx]: "xlsx",
    [MIME.xls]: "xls",
    [MIME.csv]: "csv",
    [MIME.docx]: "docx",
    [MIME.doc]: "doc",
    [MIME.jpeg]: "jpg",
    [MIME.png]: "png",
    [MIME.webp]: "webp",
    [MIME.gif]: "gif",
    [MIME.svg]: "svg",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "image/tiff": "tiff",
    "application/rtf": "rtf",
    "text/rtf": "rtf",
    "application/vnd.ms-excel.sheet.macroEnabled.12": "xlsm",
    "application/vnd.ms-excel.sheet.binary.macroEnabled.12": "xlsb",
    "application/vnd.oasis.opendocument.spreadsheet": "ods",
    "application/vnd.oasis.opendocument.text": "odt",
  };
  return mimeType ? byMime[mimeType] ?? null : null;
}

export function mimeForFileName(name: string, fallbackMime = "application/octet-stream"): string {
  const ext = extensionOf(name);
  if (!ext) return fallbackMime;
  const map: Record<string, string> = {
    pdf: MIME.pdf,
    xlsx: MIME.xlsx,
    xls: MIME.xls,
    csv: MIME.csv,
    xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
    xlsb: "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
    xltx: "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    tsv: "text/tab-separated-values",
    docx: MIME.docx,
    doc: MIME.doc,
    dotx: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",
    jpg: MIME.jpeg,
    jpeg: MIME.jpeg,
    png: MIME.png,
    webp: MIME.webp,
    gif: MIME.gif,
    svg: MIME.svg,
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return map[ext] || fallbackMime;
}

export function categoryFor(mimeType: string, name = ""): FileCategory | "folder" {
  const ext = extensionOf(name, mimeType);
  if (ext === "pdf") return "pdf";
  if (ext && ["xlsx", "xls", "csv", "xlsm", "xlsb", "xltx", "ods", "tsv"].includes(ext)) return "excel";
  if (ext && ["docx", "doc", "dotx", "rtf", "odt"].includes(ext)) return "word";
  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "tiff", "tif"].includes(ext)) return "image";
  if (mimeType === MIME.folder && !ext) return "folder";
  if (mimeType === MIME.pdf) return "pdf";
  if (EXCEL_MIMES.includes(mimeType)) return "excel";
  if (WORD_MIMES.includes(mimeType)) return "word";
  if (IMAGE_MIMES.includes(mimeType)) return "image";
  return "other";
}

export function formatBytes(bytes: number | null | undefined, locale: "ar" | "en" = "ar"): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return `0 ${locale === "ar" ? "بايت" : "B"}`;
  const units = locale === "ar" ? ["بايت", "ك.ب", "م.ب", "ج.ب", "ت.ب"] : ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function isValidFileName(name: string): boolean {
  if (!name || name.trim() !== name) return false;
  if (name.length > 200) return false;
  if (name === "." || name === "..") return false;
  return !/[\u0000-\u001f\u007f/\\<>:"|?*]/.test(name);
}

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f/\\<>:"|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return cleaned || "untitled";
}

export function appendNumericSuffix(name: string, index: number): string {
  const dot = name.lastIndexOf(".");
  if (dot > 0) {
    return `${name.slice(0, dot)} (${index})${name.slice(dot)}`;
  }
  return `${name} (${index})`;
}

export function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function isAllowedUpload(
  name: string,
  mimeType: string,
  allowedExtensions: string[],
): { allowed: boolean; reason?: "extension" | "mime" | "name" } {
  if (!isValidFileName(name)) return { allowed: false, reason: "name" };
  const extension = extensionOf(name, mimeType);
  if (!extension || !allowedExtensions.map((item) => item.toLowerCase()).includes(extension)) {
    return { allowed: false, reason: "extension" };
  }
  return { allowed: true };
}

export function contentDisposition(fileName: string, mode: "inline" | "attachment"): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const EXPORT_FORMATS: Record<string, { mime: string; extension: string }[]> = {
  [MIME.googleDoc]: [
    { mime: MIME.pdf, extension: "pdf" },
    { mime: MIME.docx, extension: "docx" },
  ],
  [MIME.googleSheet]: [
    { mime: MIME.xlsx, extension: "xlsx" },
    { mime: MIME.pdf, extension: "pdf" },
  ],
  [MIME.googleSlides]: [
    { mime: MIME.pdf, extension: "pdf" },
    { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx" },
  ],
};

export function isGoogleWorkspaceFile(mimeType: string): boolean {
  return (
    mimeType.startsWith("application/vnd.google-apps.") &&
    mimeType !== MIME.folder &&
    mimeType !== MIME.shortcut
  );
}

export function previewKind(mimeType: string, name: string): "pdf" | "excel" | "word" | "image" | "unsupported" {
  const category = categoryFor(mimeType, name);
  if (category === "pdf") return "pdf";
  if (category === "excel") return "excel";
  if (category === "word") return "word";
  if (category === "image") return "image";
  return "unsupported";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
