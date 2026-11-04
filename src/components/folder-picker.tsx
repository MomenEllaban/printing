"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder, Loader2, Search } from "lucide-react";
import { Modal, Input, Button } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";

interface FolderOption {
  id: string;
  name: string;
}

export function FolderPicker({
  open,
  onClose,
  onSelect,
  title,
  excludeIds = [],
  allowClear = false,
  onClear,
  initialFolderId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  title?: string;
  excludeIds?: string[];
  allowClear?: boolean;
  onClear?: () => void;
  initialFolderId?: string | null;
}) {
  const { t } = useI18n();
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(initialFolderId ?? null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(initialFolderId ?? null);
      setQuery("");
    }
  }

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/drive/folders?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("common.error"));
      setFolders(data.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => void load(query), 250);
    return () => window.clearTimeout(handle);
  }, [query, open, load]);

  const visible = folders.filter((folder) => !excludeIds.includes(folder.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t("common.selectFolder")}
      size="md"
      footer={
        <>
          {allowClear && (
            <Button variant="ghost" onClick={() => { onClear?.(); onClose(); }}>
              {t("settings.clearSelection")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onClose();
              }
            }}
          >
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("settings.pickerSearch")}
            className="ps-9"
          />
        </div>
        <div className="scrollbar-thin max-h-[46vh] space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
          {loading && visible.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              {t("common.loading")}
            </div>
          )}
          {error && <p className="px-3 py-6 text-center text-sm text-danger">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">{t("settings.pickerEmpty")}</p>
          )}
          {visible.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelected(folder.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors",
                selected === folder.id ? "bg-accent-soft text-accent-strong" : "hover:bg-surface-soft",
              )}
            >
              <Folder className="size-4 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              {selected === folder.id && <span className="chip">{t("common.selected")}</span>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
