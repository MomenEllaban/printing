export type FileCategory = "pdf" | "excel" | "word" | "image" | "other";

export type Locale = "ar" | "en";
export type ThemeMode = "light" | "dark" | "system";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  extension: string | null;
  modifiedTime: string | null;
  createdTime: string | null;
  webViewLink: string | null;
  thumbnailLink: string | null;
  iconLink: string | null;
  isFolder: boolean;
  category: FileCategory | "folder";
  parentId?: string | null;
  parentName?: string | null;
  isFavorite?: boolean;
  isDemo?: boolean;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface DriveListResult {
  items: DriveItem[];
  nextPageToken: string | null;
  currentFolder: Breadcrumb | null;
  breadcrumbs: Breadcrumb[];
  demo?: boolean;
  notice?: string;
}

export interface DriveStats {
  totalFiles: number;
  totalFolders: number;
  pdfCount: number;
  excelCount: number;
  wordCount: number;
  imageCount: number;
  otherCount: number;
  storageUsed: number | null;
  storageLimit: number | null;
  rootFolderId: string | null;
  scope: "app-folder" | "demo";
  demo?: boolean;
}

export interface UploadSettings {
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  allowMultiple: boolean;
  defaultDestinationFolderId: string;
  duplicateBehavior: "rename" | "skip";
}

export interface GeneralSettings {
  appName: string;
  locale: Locale;
  theme: ThemeMode;
  defaultView: "grid" | "list";
  defaultSort: string;
  itemsPerPage: number;
}

export interface PreviewSettings {
  pdfDefaultZoom: number;
  pdfFitMode: "width" | "page" | "auto";
  excelDisplayMode: "compact" | "normal" | "comfortable";
  maxPreviewSizeMb: number;
}

export interface PrintingSettings {
  paperSize: "A4" | "A3" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  scale: number;
  margins: "default" | "none" | "minimum";
}

export interface StorageSettings {
  rootFolderId: string;
  organizeByType: boolean;
  createDefaultFolders: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  upload: UploadSettings;
  preview: PreviewSettings;
  printing: PrintingSettings;
  storage: StorageSettings;
}

export interface ConnectionInfo {
  connected: boolean;
  accountEmail: string | null;
  status: string;
  rootFolderId: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  configured: boolean;
  verification: "ok" | "error" | "unverified";
  verificationMessage?: string;
}
