import type { Breadcrumb, DriveItem, DriveStats, FileCategory } from "./types";
import { MIME, categoryFor, extensionOf } from "./file-utils";
import { EST_REFERENCE_DATA } from "./stickers/est-reference-data";

interface DemoRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parentId: string;
  modifiedOffsetDays: number;
  content?: "pdf" | "xlsx" | "svg";
}

const DEMO_ROOT = "demo-root";

function buildEstDemoRecords(): DemoRecord[] {
  const records: DemoRecord[] = [
    {
      id: "demo-folder-december-2026",
      name: "December 2026",
      mimeType: MIME.folder,
      size: 0,
      parentId: DEMO_ROOT,
      modifiedOffsetDays: 1,
    },
    {
      id: "demo-folder-est-1",
      name: "EST 1",
      mimeType: MIME.folder,
      size: 0,
      parentId: "demo-folder-december-2026",
      modifiedOffsetDays: 1,
    },
  ];

  const addedIds = new Set<string>(["demo-folder-december-2026", "demo-folder-est-1"]);

  const makeId = (prefix: string, str: string) =>
    `${prefix}-${str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`;

  for (const row of EST_REFERENCE_DATA) {
    // Governorate
    const govId = makeId("demo-gov", row.governorate);
    if (!addedIds.has(govId)) {
      addedIds.add(govId);
      records.push({
        id: govId,
        name: row.governorate,
        mimeType: MIME.folder,
        size: 0,
        parentId: "demo-folder-est-1",
        modifiedOffsetDays: 2,
      });
    }

    // Test Center
    const centerId = makeId(govId, row.testCenter);
    if (!addedIds.has(centerId)) {
      addedIds.add(centerId);
      records.push({
        id: centerId,
        name: row.testCenter,
        mimeType: MIME.folder,
        size: 0,
        parentId: govId,
        modifiedOffsetDays: 2,
      });
    }

    // Building
    const bldId = makeId(centerId, row.building);
    if (!addedIds.has(bldId)) {
      addedIds.add(bldId);
      records.push({
        id: bldId,
        name: row.building,
        mimeType: MIME.folder,
        size: 0,
        parentId: centerId,
        modifiedOffsetDays: 2,
      });
    }

    // Floor
    const flrId = makeId(bldId, row.floor);
    if (!addedIds.has(flrId)) {
      addedIds.add(flrId);
      records.push({
        id: flrId,
        name: row.floor,
        mimeType: MIME.folder,
        size: 0,
        parentId: bldId,
        modifiedOffsetDays: 2,
      });
    }

    // Room
    const rmId = makeId(flrId, row.room);
    if (!addedIds.has(rmId)) {
      addedIds.add(rmId);
      records.push({
        id: rmId,
        name: row.room,
        mimeType: MIME.folder,
        size: 0,
        parentId: flrId,
        modifiedOffsetDays: 2,
      });

      // Sample exam PDFs inside each room
      records.push({
        id: `${rmId}-student-register`,
        name: `Student_Register_${row.room}.pdf`,
        mimeType: MIME.pdf,
        size: 154_200,
        parentId: rmId,
        modifiedOffsetDays: 1,
        content: "pdf",
      });
      records.push({
        id: `${rmId}-proctor-register`,
        name: `Proctor_Register_${row.room}.pdf`,
        mimeType: MIME.pdf,
        size: 98_400,
        parentId: rmId,
        modifiedOffsetDays: 1,
        content: "pdf",
      });
    }
  }

  return records;
}

const RECORDS: DemoRecord[] = [
  { id: "demo-folder-work", name: "مستندات العمل", mimeType: MIME.folder, size: 0, parentId: DEMO_ROOT, modifiedOffsetDays: 1 },
  { id: "demo-folder-design", name: "تصاميم", mimeType: MIME.folder, size: 0, parentId: DEMO_ROOT, modifiedOffsetDays: 3 },
  {
    id: "demo-pdf-invoice",
    name: "Invoice-2026-041.pdf",
    mimeType: MIME.pdf,
    size: 182_400,
    parentId: "demo-folder-work",
    modifiedOffsetDays: 2,
    content: "pdf",
  },
  {
    id: "demo-xlsx-sales",
    name: "Sales-Q4.xlsx",
    mimeType: MIME.xlsx,
    size: 74_752,
    parentId: "demo-folder-work",
    modifiedOffsetDays: 5,
    content: "xlsx",
  },
  {
    id: "demo-pdf-contract",
    name: "Contract-Template.pdf",
    mimeType: MIME.pdf,
    size: 1_248_576,
    parentId: DEMO_ROOT,
    modifiedOffsetDays: 9,
    content: "pdf",
  },
  {
    id: "demo-img-logo",
    name: "brand-logo.svg",
    mimeType: MIME.svg,
    size: 8_192,
    parentId: "demo-folder-design",
    modifiedOffsetDays: 4,
    content: "svg",
  },
  {
    id: "demo-docx-report",
    name: "Monthly-Report.docx",
    mimeType: MIME.docx,
    size: 345_088,
    parentId: DEMO_ROOT,
    modifiedOffsetDays: 12,
  },
  {
    id: "demo-pdf-guide",
    name: "User-Guide.pdf",
    mimeType: MIME.pdf,
    size: 2_936_832,
    parentId: "demo-folder-work",
    modifiedOffsetDays: 20,
    content: "pdf",
  },
  {
    id: "demo-csv-inventory",
    name: "Inventory.csv",
    mimeType: MIME.csv,
    size: 12_288,
    parentId: DEMO_ROOT,
    modifiedOffsetDays: 30,
  },
  ...buildEstDemoRecords(),
];

export function isDemoEnabled(): boolean {
  return process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
}

function modifiedDate(offsetDays: number): string {
  return new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

function toItem(record: DemoRecord): DriveItem {
  const extension = extensionOf(record.name, record.mimeType);
  const isFolder = record.mimeType === MIME.folder && !extension;
  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
    extension,
    modifiedTime: modifiedDate(record.modifiedOffsetDays),
    createdTime: modifiedDate(record.modifiedOffsetDays + 2),
    webViewLink: null,
    thumbnailLink: null,
    iconLink: null,
    isFolder,
    category: isFolder ? "folder" : categoryFor(record.mimeType, record.name),
    parentId: record.parentId,
    isDemo: true,
  };
}

export function demoItems(): DriveItem[] {
  return RECORDS.map(toItem);
}

export function getDemoRecord(id: string): DemoRecord | undefined {
  return RECORDS.find((record) => record.id === id);
}

export function getDemoItem(id: string): DriveItem | null {
  const record = getDemoRecord(id);
  return record ? toItem(record) : null;
}

export function getDemoDescendants(folderIds: string[]): {
  files: DriveItem[];
  folders: DriveItem[];
  descendantIds: string[];
  folderTree: Record<string, DriveItem[]>;
} {
  const visitedFolderIds = new Set<string>(folderIds);
  const queue = [...folderIds];
  const files: DriveItem[] = [];
  const folders: DriveItem[] = [];
  const folderTree: Record<string, DriveItem[]> = {};

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = RECORDS.filter((r) => r.parentId === parentId).map(toItem);
    folderTree[parentId] = children;

    for (const child of children) {
      if (child.isFolder) {
        folders.push(child);
        if (!visitedFolderIds.has(child.id)) {
          visitedFolderIds.add(child.id);
          queue.push(child.id);
        }
      } else {
        files.push(child);
      }
    }
  }

  const descendantIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
  return { files, folders, descendantIds, folderTree };
}

export function getDemoBreadcrumbs(folderId: string | null): { currentFolder: Breadcrumb | null; breadcrumbs: Breadcrumb[] } {
  if (!folderId || folderId === DEMO_ROOT) {
    return { currentFolder: { id: DEMO_ROOT, name: "Demo Drive" }, breadcrumbs: [{ id: DEMO_ROOT, name: "Demo Drive" }] };
  }
  const chain: Breadcrumb[] = [];
  let cursor: string | null = folderId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const record = getDemoRecord(cursor);
    if (!record) break;
    chain.unshift({ id: record.id, name: record.name });
    if (record.id === DEMO_ROOT) break;
    cursor = record.parentId;
  }
  if (chain[0]?.id !== DEMO_ROOT) chain.unshift({ id: DEMO_ROOT, name: "Demo Drive" });
  return { currentFolder: chain[chain.length - 1] ?? null, breadcrumbs: chain };
}

export interface DemoListOptions {
  folderId?: string | null;
  category?: FileCategory | null;
  search?: string | null;
  sort?: string;
  pageSize?: number;
  pageToken?: string | null;
  foldersOnly?: boolean;
  includeFolders?: boolean;
  recent?: boolean;
  ids?: string[];
}

export function demoList(options: DemoListOptions): { items: DriveItem[]; nextPageToken: string | null } {
  let records = [...RECORDS];

  if (options.ids) {
    records = records.filter((record) => options.ids!.includes(record.id));
  } else if (options.search) {
    const term = options.search.toLowerCase();
    records = records.filter((record) => record.name.toLowerCase().includes(term));
  } else if (options.recent) {
    records = records.filter((record) => record.modifiedOffsetDays <= 30 && record.mimeType !== MIME.folder);
  } else if (options.category && !options.folderId) {
    records = records.filter((record) => record.mimeType !== MIME.folder);
  } else {
    const folderId = options.folderId || DEMO_ROOT;
    records = records.filter((record) => record.parentId === folderId);
  }

  if (options.category) records = records.filter((record) => categoryFor(record.mimeType, record.name) === options.category);
  if (options.foldersOnly) records = records.filter((record) => record.mimeType === MIME.folder);
  if (options.includeFolders === false) records = records.filter((record) => record.mimeType !== MIME.folder);

  records.sort((left, right) => {
    const leftFolder = left.mimeType === MIME.folder ? 0 : 1;
    const rightFolder = right.mimeType === MIME.folder ? 0 : 1;
    if (leftFolder !== rightFolder) return leftFolder - rightFolder;
    switch (options.sort) {
      case "name_asc":
        return left.name.localeCompare(right.name, "ar");
      case "name_desc":
        return right.name.localeCompare(left.name, "ar");
      case "size_asc":
        return left.size - right.size;
      case "size_desc":
        return right.size - left.size;
      case "modified_asc":
        return right.modifiedOffsetDays - left.modifiedOffsetDays;
      default:
        return left.modifiedOffsetDays - right.modifiedOffsetDays;
    }
  });

  const pageSize = options.pageSize ?? 24;
  const start = Number(options.pageToken ?? "0") || 0;
  const page = records.slice(start, start + pageSize);
  const next = start + pageSize < records.length ? String(start + pageSize) : null;
  return { items: page.map(toItem), nextPageToken: next };
}

export function demoStats(): DriveStats {
  const files = RECORDS.filter((record) => record.mimeType !== MIME.folder);
  const count = (category: FileCategory) =>
    files.filter((record) => categoryFor(record.mimeType, record.name) === category).length;
  return {
    totalFiles: files.length,
    totalFolders: RECORDS.filter((record) => record.mimeType === MIME.folder).length,
    pdfCount: count("pdf"),
    excelCount: count("excel"),
    wordCount: count("word"),
    imageCount: count("image"),
    otherCount: count("other"),
    storageUsed: files.reduce((sum, record) => sum + record.size, 0),
    storageLimit: 15 * 1024 * 1024 * 1024,
    rootFolderId: DEMO_ROOT,
    scope: "demo",
    demo: true,
  };
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildDemoPdf(): Buffer {
  const pages = [
    { title: "Demo Invoice - Page 1", lines: ["Invoice Number: INV-2026-041", "Client: Example Trading Co.", "Amount: 4,850.00 EGP", "Status: Paid"] },
    {
      title: "Demo Invoice - Page 2",
      lines: ["Item 1: Printing services - 2,000.00", "Item 2: Design retainer - 1,850.00", "Item 3: Delivery - 1,000.00", "Thank you for your business."],
    },
  ];

  const objects: string[] = [];
  const pageCount = pages.length;
  const fontObjectNumber = 3 + pageCount * 2;
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  pages.forEach((page, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const lines = [
      "BT",
      "/F1 22 Tf",
      "72 770 Td",
      `(${escapePdfText(page.title)}) Tj`,
      "/F1 12 Tf",
      "0 -40 Td",
      ...page.lines.map((line) => `(${escapePdfText(line)}) Tj 0 -24 Td`),
      "ET",
    ];
    const stream = lines.join("\n");
    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontObjectNumber] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  const chunks: Buffer[] = [];
  let offset = 0;
  const push = (text: string) => {
    const buffer = Buffer.from(text, "latin1");
    chunks.push(buffer);
    offset += buffer.length;
  };

  push("%PDF-1.4\n");
  const offsets: number[] = new Array(objects.length).fill(0);
  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) continue;
    offsets[index] = offset;
    push(`${index} 0 obj\n${objects[index]}\nendobj\n`);
  }
  const xrefOffset = offset;
  push(`xref\n0 ${objects.length}\n`);
  push("0000000000 65535 f \n");
  for (let index = 1; index < objects.length; index += 1) {
    push(`${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

export function buildDemoXlsx(): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["الفصل", "المبيعات", "التارجت", "نسبة التحقيق"],
    ["الربع الأول", 125000, 120000, "104%"],
    ["الربع الثاني", 148000, 140000, "106%"],
    ["الربع الثالث", 132500, 150000, "88%"],
    ["الربع الرابع", 176000, 160000, "110%"],
  ]);
  const details = XLSX.utils.aoa_to_sheet([
    ["التاريخ", "العميل", "المنتج", "الكمية", "الإجمالي"],
    ["2026-10-02", "شركة النور", "طباعة بروشور", 500, 12500],
    ["2026-10-14", "مؤسسة الأمل", "بنرات", 12, 8400],
    ["2026-11-01", "مكتب الرواد", "كروت شخصية", 2000, 6000],
    ["2026-11-18", "شركة المستقبل", "تغليف", 350, 15750],
  ]);
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");
  XLSX.utils.book_append_sheet(workbook, details, "Details");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildDemoSvg(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="900" height="560" fill="url(#bg)"/>
  <circle cx="740" cy="110" r="190" fill="#ffffff" opacity="0.08"/>
  <circle cx="120" cy="470" r="150" fill="#ffffff" opacity="0.07"/>
  <text x="70" y="250" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">DriveDesk</text>
  <text x="72" y="320" font-family="Arial, sans-serif" font-size="26" fill="#e0f2fe">Demo image preview · SVG</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

export function demoContent(id: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  const record = getDemoRecord(id);
  if (!record) return null;
  if (record.content === "pdf") {
    return { buffer: buildDemoPdf(), mimeType: MIME.pdf, extension: "pdf" };
  }
  if (record.content === "xlsx" || record.mimeType === MIME.csv) {
    return { buffer: buildDemoXlsx(), mimeType: MIME.xlsx, extension: "xlsx" };
  }
  if (record.content === "svg") {
    return { buffer: buildDemoSvg(), mimeType: MIME.svg, extension: "svg" };
  }
  return null;
}
