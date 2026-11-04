"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid3X3, Loader2, Search } from "lucide-react";
import { Button, Input, Spinner } from "@/components/ui";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

type Cell = string | number | boolean | null;
type Workbook = { sheets: string[]; data: Record<string, Cell[][]> };

const ROW_LIMIT = 300;

export function ExcelViewer({
  fileId,
  extension,
  density,
}: {
  fileId: string;
  extension: string | null;
  density: "compact" | "normal" | "comfortable";
}) {
  const { t, locale } = useI18n();
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [search, setSearch] = useState("");
  const [visibleRows, setVisibleRows] = useState(ROW_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/drive/files/${fileId}/content?format=xlsx`, { cache: "no-store" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || t("preview.loadFailed"));
        }
        const contentType = response.headers.get("content-type") ?? "";
        let source: ArrayBuffer | string;
        if (contentType.includes("text/csv") || extension === "csv") {
          source = await response.text();
        } else {
          source = await response.arrayBuffer();
        }
        const XLSX = await import("xlsx");
        const parsed =
          typeof source === "string"
            ? XLSX.read(source, { type: "string" })
            : XLSX.read(new Uint8Array(source), { type: "array" });
        const data: Record<string, Cell[][]> = {};
        for (const name of parsed.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<Cell[]>(parsed.Sheets[name], {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false,
          });
          data[name] = rows;
        }
        if (cancelled) return;
        setWorkbook({ sheets: parsed.SheetNames, data });
        setSheet(parsed.SheetNames[0] ?? "");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t("preview.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [extension, fileId, t]);

  const rows = useMemo(() => workbook?.data[sheet] ?? [], [workbook, sheet]);
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter((row) => row.some((cell) => String(cell ?? "").toLowerCase().includes(term)));
  }, [rows, search]);

  const columns = useMemo(
    () => filtered.reduce((max, row) => Math.max(max, row.length), 0),
    [filtered],
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="size-6 text-accent" />
        {t("common.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <a href={`/api/drive/files/${fileId}/content?download=1`} className="btn-secondary">
          {t("common.download")}
        </a>
      </div>
    );
  }

  if (!workbook || workbook.sheets.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">{t("common.noFiles")}</p>;
  }

  const padding = density === "compact" ? "px-1.5 py-0.5" : density === "comfortable" ? "px-3 py-2" : "px-2 py-1";

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="scrollbar-thin flex max-w-full flex-1 gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
          {workbook.sheets.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSheet(name);
                setVisibleRows(ROW_LIMIT);
              }}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                sheet === name ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("preview.searchInSheet")}
            className="h-9 ps-9"
          />
        </div>
      </div>

      <div className="scrollbar-thin max-h-[70vh] overflow-auto rounded-2xl border border-border bg-surface">
        <table className="sheet-table w-full">
          <thead>
            <tr>
              <th className={cn("sticky start-0 z-10 bg-surface-strong text-muted", padding)}>#</th>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className={padding}>
                  {columnName(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleRows).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={cn("sticky start-0 z-10 bg-surface text-center text-[11px] text-muted", padding)}>
                  {rowIndex + 1}
                </td>
                {Array.from({ length: columns }).map((_, columnIndex) => (
                  <td key={columnIndex} className={cn(padding, "text-start")}>
                    {formatCell(row[columnIndex])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Grid3X3 className="size-3.5" />
          {formatNumber(filtered.length, locale)} {t("preview.rows")} · {formatNumber(columns, locale)} {t("preview.columns")}
        </span>
        {filtered.length > visibleRows && (
          <Button variant="secondary" onClick={() => setVisibleRows((value) => value + ROW_LIMIT)}>
            <Loader2 className="size-4" />
            {t("common.loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function formatCell(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) return "";
  return String(cell);
}
