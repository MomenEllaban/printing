import { z } from "zod";
import { prisma } from "./prisma";
import { DEFAULT_ALLOWED_EXTENSIONS } from "./file-utils";
import type { AppSettings } from "./types";

export const SETTINGS_DEFINITIONS = [
  { key: "general.appName", category: "general", schema: z.string().trim().min(1).max(60), defaultValue: "File Manager" },
  { key: "general.locale", category: "general", schema: z.enum(["ar", "en"]), defaultValue: "en" },
  { key: "general.theme", category: "general", schema: z.enum(["light", "dark", "system"]), defaultValue: "system" },
  { key: "general.defaultView", category: "general", schema: z.enum(["grid", "list"]), defaultValue: "list" },
  {
    key: "general.defaultSort",
    category: "general",
    schema: z.enum(["custom", "modified_desc", "modified_asc", "name_asc", "name_desc", "size_desc", "size_asc"]),
    defaultValue: "modified_desc",
  },
  { key: "general.itemsPerPage", category: "general", schema: z.number().int().min(6).max(100), defaultValue: 24 },

  { key: "upload.maxUploadSizeMb", category: "upload", schema: z.number().min(1).max(5120), defaultValue: 100 },
  {
    key: "upload.allowedExtensions",
    category: "upload",
    schema: z.array(z.string().regex(/^[a-z0-9]{1,12}$/i)).min(1).max(60),
    defaultValue: DEFAULT_ALLOWED_EXTENSIONS,
  },
  { key: "upload.allowMultiple", category: "upload", schema: z.boolean(), defaultValue: true },
  { key: "upload.defaultDestinationFolderId", category: "upload", schema: z.string().max(200), defaultValue: "" },
  { key: "upload.duplicateBehavior", category: "upload", schema: z.enum(["rename", "skip"]), defaultValue: "rename" },

  { key: "preview.pdfDefaultZoom", category: "preview", schema: z.number().min(0.5).max(3), defaultValue: 1 },
  { key: "preview.pdfFitMode", category: "preview", schema: z.enum(["width", "page", "auto"]), defaultValue: "width" },
  {
    key: "preview.excelDisplayMode",
    category: "preview",
    schema: z.enum(["compact", "normal", "comfortable"]),
    defaultValue: "normal",
  },
  { key: "preview.maxPreviewSizeMb", category: "preview", schema: z.number().min(1).max(500), defaultValue: 60 },

  { key: "printing.paperSize", category: "printing", schema: z.enum(["A4", "A3", "Letter", "Legal"]), defaultValue: "A4" },
  { key: "printing.orientation", category: "printing", schema: z.enum(["portrait", "landscape"]), defaultValue: "portrait" },
  { key: "printing.scale", category: "printing", schema: z.number().int().min(50).max(100), defaultValue: 100 },
  { key: "printing.margins", category: "printing", schema: z.enum(["default", "none", "minimum"]), defaultValue: "default" },
  { key: "printing.stickerWidthMm", category: "printing", schema: z.number().min(30).max(300), defaultValue: 100 },
  { key: "printing.stickerHeightMm", category: "printing", schema: z.number().min(20).max(200), defaultValue: 50 },
  { key: "printing.stickerPaperMode", category: "printing", schema: z.enum(["custom", "a4"]), defaultValue: "a4" },
  { key: "printing.stickerOrientation", category: "printing", schema: z.enum(["landscape", "portrait"]), defaultValue: "landscape" },

  { key: "storage.rootFolderId", category: "storage", schema: z.string().max(200), defaultValue: "" },
  { key: "storage.organizeByType", category: "storage", schema: z.boolean(), defaultValue: false },
  { key: "storage.createDefaultFolders", category: "storage", schema: z.boolean(), defaultValue: false },
] satisfies { key: string; category: string; schema: z.ZodTypeAny; defaultValue: unknown }[];

const definitionMap = new Map(SETTINGS_DEFINITIONS.map((definition) => [definition.key, definition]));

export const SETTINGS_KEYS = SETTINGS_DEFINITIONS.map((definition) => definition.key);

let cache: { value: AppSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5000;

export function defaultSettings(): AppSettings {
  const result: Record<string, unknown> = {};
  for (const definition of SETTINGS_DEFINITIONS) {
    setNested(result, definition.key, definition.defaultValue);
  }
  return result as unknown as AppSettings;
}

export function flattenSettings(settings: AppSettings): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  walk(settings as unknown as Record<string, unknown>, "", result);
  return result;
}

function walk(prefix: Record<string, unknown>, path: string, target: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(prefix)) {
    const fullKey = path ? `${path}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      walk(value as Record<string, unknown>, fullKey, target);
    } else {
      target[fullKey] = value;
    }
  }
}

function setNested(target: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split(".");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!cursor[parts[index]] || typeof cursor[parts[index]] !== "object") {
      cursor[parts[index]] = {};
    }
    cursor = cursor[parts[index]] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

export function getNested(settings: AppSettings, key: string): unknown {
  return key.split(".").reduce<unknown>((accumulator, part) => {
    if (accumulator && typeof accumulator === "object") {
      return (accumulator as Record<string, unknown>)[part];
    }
    return undefined;
  }, settings);
}

export async function getSettings(force = false): Promise<AppSettings> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.value;
  const settings = defaultSettings();
  try {
    const rows = await prisma.applicationSetting.findMany();
    for (const row of rows) {
      const definition = definitionMap.get(row.key);
      if (!definition) continue;
      const parsed = definition.schema.safeParse(row.value);
      if (parsed.success) setNested(settings as unknown as Record<string, unknown>, row.key, parsed.data);
    }
  } catch (error) {
    console.error("[settings] failed to load settings, using defaults", error);
  }
  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return settings;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export interface SettingsUpdateResult {
  settings: AppSettings;
  errors: Record<string, string>;
}

export async function updateSettings(input: Record<string, unknown>): Promise<SettingsUpdateResult> {
  const errors: Record<string, string> = {};
  const validEntries: { key: string; category: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(input)) {
    const definition = definitionMap.get(key);
    if (!definition) {
      errors[key] = "Unknown setting";
      continue;
    }
    const parsed = definition.schema.safeParse(value);
    if (!parsed.success) {
      errors[key] = parsed.error.issues[0]?.message ?? "Invalid value";
      continue;
    }
    validEntries.push({ key, category: definition.category, value: parsed.data });
  }

  if (Object.keys(errors).length > 0) {
    return { settings: await getSettings(true), errors };
  }

  if (validEntries.length > 0) {
    await prisma.$transaction(
      validEntries.map((entry) =>
        prisma.applicationSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value as never, category: entry.category },
          create: { key: entry.key, value: entry.value as never, category: entry.category },
        }),
      ),
    );
  }

  invalidateSettingsCache();
  return { settings: await getSettings(true), errors };
}

export async function ensureDefaultSettings(): Promise<void> {
  const existing = await prisma.applicationSetting.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = SETTINGS_DEFINITIONS.filter((definition) => !existingKeys.has(definition.key));
  if (missing.length === 0) return;
  await prisma.$transaction(
    missing.map((definition) =>
      prisma.applicationSetting.create({
        data: {
          key: definition.key,
          category: definition.category,
          value: definition.defaultValue as never,
        },
      }),
    ),
  );
  invalidateSettingsCache();
}

export async function resetSettings(keys?: string[]): Promise<AppSettings> {
  const selected = keys?.length
    ? SETTINGS_DEFINITIONS.filter((definition) => keys.includes(definition.key))
    : SETTINGS_DEFINITIONS;
  await prisma.$transaction(
    selected.map((definition) =>
      prisma.applicationSetting.upsert({
        where: { key: definition.key },
        update: { value: definition.defaultValue as never, category: definition.category },
        create: {
          key: definition.key,
          value: definition.defaultValue as never,
          category: definition.category,
        },
      }),
    ),
  );
  invalidateSettingsCache();
  return getSettings(true);
}

export function validateSettingsObject(settings: AppSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(flattenSettings(settings))) {
    const definition = definitionMap.get(key);
    const parsed = definition?.schema.safeParse(value);
    if (definition && !parsed?.success) errors[key] = "Invalid value";
  }
  return errors;
}
