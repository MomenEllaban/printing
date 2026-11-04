"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  FolderSearch,
  KeyRound,
  Link2,
  Loader2,
  Plug,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Unplug,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Field, Input, Select, Switch, Spinner } from "./ui";
import { FolderPicker } from "./folder-picker";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export type SettingsTab = "general" | "drive" | "upload" | "preview" | "printing" | "storage" | "security";

export interface SettingsConnection {
  connected: boolean;
  accountEmail: string | null;
  status: string;
  rootFolderId: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
}

export interface SettingsEnvironment {
  database: boolean;
  googleConfigured: boolean;
  sessionSecret: boolean;
  encryptionKey: boolean;
  demoMode: boolean;
  appUrl: string | null;
}

interface SettingsFormProps {
  initialValues: Record<string, unknown>;
  connection: SettingsConnection | null;
  environment: SettingsEnvironment;
  initialTab: SettingsTab;
  demo: boolean;
}

const TABS: { key: SettingsTab; labelKey: TranslationKey }[] = [
  { key: "general", labelKey: "settings.tab.general" },
  { key: "drive", labelKey: "settings.tab.drive" },
  { key: "upload", labelKey: "settings.tab.upload" },
  { key: "preview", labelKey: "settings.tab.preview" },
  { key: "printing", labelKey: "settings.tab.printing" },
  { key: "storage", labelKey: "settings.tab.storage" },
  { key: "security", labelKey: "settings.tab.security" },
];

const GENERAL_KEYS = [
  "general.appName",
  "general.locale",
  "general.theme",
  "general.defaultView",
  "general.defaultSort",
  "general.itemsPerPage",
];
const UPLOAD_KEYS = [
  "upload.maxUploadSizeMb",
  "upload.allowedExtensions",
  "upload.allowMultiple",
  "upload.defaultDestinationFolderId",
  "upload.duplicateBehavior",
];
const PREVIEW_KEYS = [
  "preview.pdfDefaultZoom",
  "preview.pdfFitMode",
  "preview.excelDisplayMode",
  "preview.maxPreviewSizeMb",
];
const PRINT_KEYS = ["printing.paperSize", "printing.orientation", "printing.scale", "printing.margins"];
const STORAGE_KEYS = ["storage.rootFolderId", "storage.organizeByType", "storage.createDefaultFolders"];

const TAB_KEYS: Record<SettingsTab, string[]> = {
  general: GENERAL_KEYS,
  drive: [],
  upload: UPLOAD_KEYS,
  preview: PREVIEW_KEYS,
  printing: PRINT_KEYS,
  storage: STORAGE_KEYS,
  security: [],
};

function flatten(values: Record<string, unknown>, prefix = "", target: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries(values)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value as Record<string, unknown>, full, target);
    else target[full] = value;
  }
  return target;
}

export function SettingsForm({ initialValues, connection, environment, initialTab, demo }: SettingsFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [extensionsText, setExtensionsText] = useState(
    Array.isArray(initialValues["upload.allowedExtensions"])
      ? (initialValues["upload.allowedExtensions"] as string[]).join(", ")
      : "",
  );
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootPickerOpen, setRootPickerOpen] = useState(false);
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const initialFlat = useMemo(() => initialValues, [initialValues]);
  const dirty = useMemo(() => {
    const current: Record<string, unknown> = {
      ...values,
      "upload.allowedExtensions": extensionsText
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    };
    return JSON.stringify(current) !== JSON.stringify(initialFlat);
  }, [extensionsText, initialFlat, values]);

  const setValue = (key: string, value: unknown) => setValues((current) => ({ ...current, [key]: value }));

  const save = async (keys: string[]) => {
    setSaving(true);
    setErrors({});
    const payload: Record<string, unknown> = {};
    for (const key of keys) {
      if (key === "upload.allowedExtensions") {
        payload[key] = extensionsText
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);
      } else {
        payload[key] = values[key];
      }
    }
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 422 && data.errors) {
        setErrors(data.errors);
        toast.error(t("settings.invalidValue"));
        return;
      }
      if (!response.ok) throw new Error(data.message || t("settings.saveFailed"));
      if (data.settings) {
        const flat = flatten(data.settings as Record<string, unknown>);
        setValues(flat);
        setExtensionsText(Array.isArray(flat["upload.allowedExtensions"]) ? (flat["upload.allowedExtensions"] as string[]).join(", ") : "");
      }
      toast.success(t("settings.saved"));
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      const response = await fetch("/api/settings/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("settings.saveFailed"));
      const flat = flatten((data.settings ?? {}) as Record<string, unknown>);
      setValues(flat);
      setExtensionsText(Array.isArray(flat["upload.allowedExtensions"]) ? (flat["upload.allowedExtensions"] as string[]).join(", ") : "");
      setErrors({});
      setConfirmReset(false);
      toast.success(t("settings.saved"));
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("settings.saveFailed"));
    } finally {
      setResetting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/drive/test", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("settings.verificationFailed"));
      setTestResult({ ok: true, message: data.email ? `${t("settings.verified")} — ${data.email}` : t("settings.verified") });
      toast.success(t("settings.verified"));
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("settings.verificationFailed");
      setTestResult({ ok: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/auth/google/disconnect", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      toast.success(t("common.disconnect"));
      setConfirmDisconnect(false);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setDisconnecting(false);
    }
  };

  const text = (key: string): string => (typeof values[key] === "string" ? (values[key] as string) : "");
  const num = (key: string): number => (typeof values[key] === "number" ? (values[key] as number) : 0);
  const bool = (key: string): boolean => Boolean(values[key]);

  const connectUrl = "/api/auth/google/connect?returnTo=%2Fsettings%3Ftab%3Ddrive";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("nav.settings")}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{t("settings.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{t("settings.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={resetting}>
            <RotateCcw className="size-4" />
            {t("settings.resetDefaults")}
          </Button>
          <Button onClick={() => void save(TAB_KEYS[tab])} loading={saving} disabled={!dirty || TAB_KEYS[tab].length === 0}>
            <Save className="size-4" />
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === entry.key ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft hover:text-foreground",
            )}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      {dirty && TAB_KEYS[tab].length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          {t("common.save")} — {t("settings.subtitle")}
        </div>
      )}

      {tab === "general" && (
        <section className="card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.appName")} htmlFor="app-name">
              <Input id="app-name" value={text("general.appName")} onChange={(event) => setValue("general.appName", event.target.value)} />
            </Field>
            <Field label={t("settings.language")} htmlFor="default-locale">
              <Select id="default-locale" value={text("general.locale")} onChange={(event) => setValue("general.locale", event.target.value)}>
                <option value="ar">{t("settings.languageAr")}</option>
                <option value="en">{t("settings.languageEn")}</option>
              </Select>
            </Field>
            <Field label={t("settings.theme")} htmlFor="default-theme">
              <Select id="default-theme" value={text("general.theme")} onChange={(event) => setValue("general.theme", event.target.value)}>
                <option value="system">{t("settings.themeSystem")}</option>
                <option value="light">{t("settings.themeLight")}</option>
                <option value="dark">{t("settings.themeDark")}</option>
              </Select>
            </Field>
            <Field label={t("settings.defaultView")} htmlFor="default-view">
              <Select id="default-view" value={text("general.defaultView")} onChange={(event) => setValue("general.defaultView", event.target.value)}>
                <option value="grid">{t("common.viewGrid")}</option>
                <option value="list">{t("common.viewList")}</option>
              </Select>
            </Field>
            <Field label={t("settings.defaultSort")} htmlFor="default-sort">
              <Select id="default-sort" value={text("general.defaultSort")} onChange={(event) => setValue("general.defaultSort", event.target.value)}>
                <option value="modified_desc">{t("common.sortModifiedDesc")}</option>
                <option value="modified_asc">{t("common.sortModifiedAsc")}</option>
                <option value="name_asc">{t("common.sortNameAsc")}</option>
                <option value="name_desc">{t("common.sortNameDesc")}</option>
                <option value="size_desc">{t("common.sortSizeDesc")}</option>
                <option value="size_asc">{t("common.sortSizeAsc")}</option>
              </Select>
            </Field>
            <Field label={t("settings.itemsPerPage")} htmlFor="items-per-page" error={errors["general.itemsPerPage"]}>
              <Input
                id="items-per-page"
                type="number"
                min={6}
                max={100}
                value={num("general.itemsPerPage")}
                onChange={(event) => setValue("general.itemsPerPage", Number(event.target.value))}
              />
            </Field>
          </div>
        </section>
      )}

      {tab === "upload" && (
        <section className="card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.maxUploadSize")} htmlFor="max-upload" error={errors["upload.maxUploadSizeMb"]}>
              <Input
                id="max-upload"
                type="number"
                min={1}
                max={5120}
                value={num("upload.maxUploadSizeMb")}
                onChange={(event) => setValue("upload.maxUploadSizeMb", Number(event.target.value))}
              />
            </Field>
            <Field label={t("settings.duplicateBehavior")} htmlFor="duplicate-behavior">
              <Select
                id="duplicate-behavior"
                value={text("upload.duplicateBehavior")}
                onChange={(event) => setValue("upload.duplicateBehavior", event.target.value)}
              >
                <option value="rename">{t("settings.duplicateRename")}</option>
                <option value="skip">{t("settings.duplicateSkip")}</option>
              </Select>
            </Field>
            <Field
              label={t("settings.allowedExtensions")}
              htmlFor="allowed-extensions"
              hint={t("settings.allowedExtensionsHint")}
              error={errors["upload.allowedExtensions"]}
            >
              <Input
                id="allowed-extensions"
                value={extensionsText}
                onChange={(event) => setExtensionsText(event.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label={t("settings.defaultDestination")} hint={text("upload.defaultDestinationFolderId") || undefined}>
              <div className="flex gap-2">
                <Input value={text("upload.defaultDestinationFolderId")} readOnly dir="ltr" placeholder="—" />
                <Button variant="secondary" type="button" onClick={() => setDestinationPickerOpen(true)}>
                  <FolderSearch className="size-4" />
                </Button>
              </div>
            </Field>
          </div>
          <Switch
            checked={bool("upload.allowMultiple")}
            onChange={(next) => setValue("upload.allowMultiple", next)}
            label={t("settings.allowMultiple")}
          />
        </section>
      )}

      {tab === "preview" && (
        <section className="card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.pdfZoom")} htmlFor="pdf-zoom" error={errors["preview.pdfDefaultZoom"]}>
              <Select id="pdf-zoom" value={String(num("preview.pdfDefaultZoom"))} onChange={(event) => setValue("preview.pdfDefaultZoom", Number(event.target.value))}>
                {[0.75, 1, 1.25, 1.5, 2].map((value) => (
                  <option key={value} value={value}>
                    {value * 100}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("settings.pdfFitMode")} htmlFor="pdf-fit">
              <Select id="pdf-fit" value={text("preview.pdfFitMode")} onChange={(event) => setValue("preview.pdfFitMode", event.target.value)}>
                <option value="width">{t("settings.fitWidth")}</option>
                <option value="page">{t("settings.fitPage")}</option>
                <option value="auto">{t("settings.fitAuto")}</option>
              </Select>
            </Field>
            <Field label={t("settings.excelMode")} htmlFor="excel-mode">
              <Select id="excel-mode" value={text("preview.excelDisplayMode")} onChange={(event) => setValue("preview.excelDisplayMode", event.target.value)}>
                <option value="compact">{t("settings.excelCompact")}</option>
                <option value="normal">{t("settings.excelNormal")}</option>
                <option value="comfortable">{t("settings.excelComfortable")}</option>
              </Select>
            </Field>
            <Field label={t("settings.maxPreviewSize")} htmlFor="max-preview" error={errors["preview.maxPreviewSizeMb"]}>
              <Input
                id="max-preview"
                type="number"
                min={1}
                max={500}
                value={num("preview.maxPreviewSizeMb")}
                onChange={(event) => setValue("preview.maxPreviewSizeMb", Number(event.target.value))}
              />
            </Field>
          </div>
        </section>
      )}

      {tab === "printing" && (
        <section className="card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.paperSize")} htmlFor="paper-size">
              <Select id="paper-size" value={text("printing.paperSize")} onChange={(event) => setValue("printing.paperSize", event.target.value)}>
                {["A4", "A3", "Letter", "Legal"].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("settings.orientation")} htmlFor="print-orientation">
              <Select id="print-orientation" value={text("printing.orientation")} onChange={(event) => setValue("printing.orientation", event.target.value)}>
                <option value="portrait">{t("settings.portrait")}</option>
                <option value="landscape">{t("settings.landscape")}</option>
              </Select>
            </Field>
            <Field label={t("settings.scale")} htmlFor="print-scale" error={errors["printing.scale"]}>
              <Input
                id="print-scale"
                type="number"
                min={50}
                max={100}
                value={num("printing.scale")}
                onChange={(event) => setValue("printing.scale", Number(event.target.value))}
              />
            </Field>
            <Field label={t("settings.margins")} htmlFor="print-margins">
              <Select id="print-margins" value={text("printing.margins")} onChange={(event) => setValue("printing.margins", event.target.value)}>
                <option value="default">{t("settings.marginDefault")}</option>
                <option value="minimum">{t("settings.marginMinimum")}</option>
                <option value="none">{t("settings.marginNone")}</option>
              </Select>
            </Field>
          </div>
        </section>
      )}

      {tab === "storage" && (
        <section className="card space-y-5 p-5">
          <Field label={t("settings.rootFolder")} hint={t("settings.rootFolderHint")} error={errors["storage.rootFolderId"]}>
            <div className="flex gap-2">
              <Input value={text("storage.rootFolderId")} readOnly dir="ltr" placeholder="File Manager App" />
              <Button variant="secondary" type="button" onClick={() => setRootPickerOpen(true)}>
                <FolderSearch className="size-4" />
              </Button>
            </div>
          </Field>
          <Switch
            checked={bool("storage.organizeByType")}
            onChange={(next) => setValue("storage.organizeByType", next)}
            label={t("settings.organizeByType")}
          />
          <p className="text-xs text-muted">{t("settings.organizeByTypeHint")}</p>
          <Switch
            checked={bool("storage.createDefaultFolders")}
            onChange={(next) => setValue("storage.createDefaultFolders", next)}
            label={t("settings.createDefaultFolders")}
          />
        </section>
      )}

      {tab === "drive" && (
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl",
                    connection?.connected
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {connection?.connected ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                </span>
                <div>
                  <h2 className="text-base font-bold">
                    {connection?.connected ? t("settings.connected") : t("settings.disconnected")}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted" dir="ltr">
                    {connection?.accountEmail || (demo ? "demo@drive.local" : t("common.notConnected"))}
                  </p>
                  {connection?.lastConnectedAt && (
                    <p className="mt-1 text-xs text-muted">
                      {t("settings.lastConnected")}: {formatDateTime(connection.lastConnectedAt, locale as Locale)}
                    </p>
                  )}
                  {connection?.lastError && <p className="mt-1 text-xs text-danger">{connection.lastError}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {connection?.connected ? (
                  <>
                    <Button variant="secondary" onClick={() => void testConnection()} loading={testing}>
                      <Plug className="size-4" />
                      {t("common.testConnection")}
                    </Button>
                    <Button variant="secondary" onClick={() => window.open(connectUrl, "_self")}>
                      <Link2 className="size-4" />
                      {t("common.reconnect")}
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmDisconnect(true)}>
                      <Unplug className="size-4" />
                      {t("common.disconnect")}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => window.open(connectUrl, "_self")} disabled={!environment.googleConfigured}>
                    <Link2 className="size-4" />
                    {t("common.connectGoogle")}
                  </Button>
                )}
              </div>
            </div>

            {!environment.googleConfigured && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                {t("settings.notConfigured")} — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
              </div>
            )}
            {demo && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-800 dark:text-sky-200">
                <Sparkles className="size-4" />
                {t("settings.demoActive")}
              </div>
            )}
            {testResult && (
              <div
                className={cn(
                  "mt-4 rounded-xl border px-3 py-2 text-xs",
                  testResult.ok
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-danger/25 bg-danger/10 text-danger",
                )}
              >
                {testResult.message}
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <KeyRound className="size-4 text-accent" />
                {t("settings.scopes")}
              </h3>
              <p className="mt-2 text-sm text-muted">{t("settings.scopesValue")}</p>
              <p className="mt-2 text-xs text-muted">{t("settings.scopesWhy")}</p>
            </div>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-4 text-accent" />
                {t("settings.rootFolder")}
              </h3>
              <p className="mt-2 text-sm text-muted" dir="ltr">
                {connection?.rootFolderId || environment.appUrl || "—"}
              </p>
              <Link2 className="mt-2 size-4 text-muted" />
              <p className="mt-2 text-xs text-muted">{t("settings.rootFolderHint")}</p>
            </div>
          </section>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="size-5 text-accent" />
              {t("settings.tab.security")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("settings.securityNote")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SecurityRow label={t("settings.secretDatabase")} ok={environment.database} />
              <SecurityRow label={t("settings.secretGoogle")} ok={environment.googleConfigured} />
              <SecurityRow label={t("settings.secretSession")} ok={environment.sessionSecret} />
              <SecurityRow label={t("settings.secretEncryption")} ok={environment.encryptionKey} />
            </div>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Database className="size-4 text-accent" />
                {t("settings.secretDatabase")}
              </h3>
              <p className="mt-2 text-sm text-muted">{t("settings.securityDatabase")}</p>
            </div>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <KeyRound className="size-4 text-accent" />
                {t("settings.secretTokens")}
              </h3>
              <p className="mt-2 text-sm text-muted">{t("settings.securitySecrets")}</p>
              <p className="mt-2 text-xs text-muted">{t("settings.securityEncryption")}</p>
            </div>
            <div className="card p-5 md:col-span-2">
              <h3 className="text-sm font-bold">{t("settings.demoMode")}</h3>
              <p className="mt-1 text-sm text-muted">
                {environment.demoMode ? t("settings.demoModeOn") : t("settings.demoModeOff")} — {t("settings.demoModeHint")}
              </p>
            </div>
          </section>
        </div>
      )}

      {TAB_KEYS[tab].length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => void save(TAB_KEYS[tab])} loading={saving} disabled={!dirty}>
            <Save className="size-4" />
            {t("common.save")}
          </Button>
        </div>
      )}

      <FolderPicker
        open={rootPickerOpen}
        onClose={() => setRootPickerOpen(false)}
        onSelect={(id) => setValue("storage.rootFolderId", id)}
        onClear={() => setValue("storage.rootFolderId", "")}
        allowClear
        title={t("settings.chooseRoot")}
        initialFolderId={text("storage.rootFolderId") || null}
      />
      <FolderPicker
        open={destinationPickerOpen}
        onClose={() => setDestinationPickerOpen(false)}
        onSelect={(id) => setValue("upload.defaultDestinationFolderId", id)}
        onClear={() => setValue("upload.defaultDestinationFolderId", "")}
        allowClear
        title={t("settings.defaultDestination")}
        initialFolderId={text("upload.defaultDestinationFolderId") || null}
      />

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => void disconnect()}
        title={t("common.disconnect")}
        description={t("settings.disconnectConfirm")}
        confirmLabel={t("common.disconnect")}
        loading={disconnecting}
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void reset()}
        title={t("settings.resetDefaults")}
        description={t("settings.resetConfirm")}
        confirmLabel={t("settings.resetDefaults")}
        loading={resetting}
      />

      {(saving || resetting) && (
        <div className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-lg">
          <Spinner className="size-4" />
          {t("common.saving")}
        </div>
      )}
      {testing && (
        <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-lg">
          <Loader2 className="size-4 animate-spin" />
          {t("common.testConnection")}
        </div>
      )}
      {!connection?.connected && demo && (
        <div className="fixed bottom-4 end-4 z-40 hidden items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs text-sky-800 dark:text-sky-200 md:flex">
          <ExternalLink className="size-3.5" />
          {t("common.demo")}
        </div>
      )}
    </div>
  );
}

function SecurityRow({ label, ok }: { label: string; ok: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm">
      <span className="font-medium">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          {t("settings.configured")}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <XCircle className="size-4" />
          {t("settings.missing")}
        </span>
      )}
    </div>
  );
}
