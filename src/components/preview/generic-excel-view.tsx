"use client";

import { useMemo } from "react";
import type { SheetData } from "@/lib/stickers/building-excel";

export function GenericExcelView({
  sheets,
  activeTabIdx,
  setActiveTabIdx,
  isEditing,
  onCellChange,
  locale,
}: {
  sheets: SheetData[];
  activeTabIdx: number;
  setActiveTabIdx: (idx: number) => void;
  isEditing: boolean;
  onCellChange: (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => void;
  locale: string;
}) {
  const active = sheets[activeTabIdx];
  const colCount = useMemo(() => {
    if (!active) return 0;
    return Math.max(1, ...active.rows.map((r) => r?.length || 0));
  }, [active]);

  const headerRowIdx = useMemo(() => {
    if (!active) return -1;
    return active.rows.findIndex((row) => (row || []).some((cell) => String(cell ?? "").trim()));
  }, [active]);

  return (
    <div className="w-full space-y-3">
      {sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/70 p-2">
          <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            {locale === "ar" ? "الشيتات" : "Sheets"}
          </span>
          {sheets.map((s, idx) => (
            <button
              key={`${s.name}-${idx}`}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                idx === activeTabIdx
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
                  : "border-border bg-surface text-foreground hover:bg-surface-soft hover:border-emerald-500/30"
              }`}
            >
              {s.name || `${locale === "ar" ? "شيت" : "Sheet"} ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-xs font-bold text-foreground">
            {active?.name || (locale === "ar" ? "شيت" : "Sheet")}
          </div>
          <div className="text-[11px] text-muted">
            {(active?.rows?.length || 0).toLocaleString()} {locale === "ar" ? "صف" : "rows"}
          </div>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full border-collapse text-[13px]">
            <tbody>
              {(active?.rows || []).map((row, rIdx) => {
                const isHeader = rIdx === headerRowIdx;
                return (
                  <tr key={rIdx} className={isHeader ? "bg-surface-soft" : ""}>
                    {Array.from({ length: colCount }).map((_, cIdx) => {
                      const value = row?.[cIdx] ?? "";
                      const text = value === null || value === undefined ? "" : String(value);
                      return (
                        <td
                          key={cIdx}
                          className={`border border-border/70 p-0 align-top min-w-[140px] max-w-[460px] ${
                            isHeader ? "font-bold" : rIdx % 2 === 0 ? "bg-surface" : "bg-surface-soft/20"
                          }`}
                        >
                          {isEditing ? (
                            <input
                              value={text}
                              onChange={(e) => onCellChange(activeTabIdx, rIdx, cIdx, e.target.value)}
                              className="h-full w-full min-w-[140px] bg-transparent px-3 py-2 text-[13px] text-foreground outline-none focus:bg-emerald-500/5"
                            />
                          ) : (
                            <div className="whitespace-pre-wrap break-words px-3 py-2 leading-relaxed">
                              {text || "\u00A0"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {(!active || active.rows.length === 0) && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted">
                    {locale === "ar" ? "الشيت فارغ" : "Empty sheet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
