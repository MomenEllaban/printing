"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Unlock,
} from "lucide-react";

export function Scene13StudentCountVerification() {
  const [isMatched, setIsMatched] = useState<boolean>(true);

  const registerCount = 25;
  const stickerCount = isMatched ? 25 : 24;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Quality Assurance
            </span>
            <span className="text-xs text-muted">Zero-Discrepancy Protocol</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Student Count Verification System
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Automated mathematical cross-checking between the official student roster and printed examination file stickers.
          </p>
        </div>

        {/* Simulation Scenario Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-strong/60 border border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => setIsMatched(true)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              isMatched
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Simulate Matched Count (25 = 25)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMatched(false)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              !isMatched
                ? "bg-rose-600 text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <AlertCircle className="size-3.5" />
            <span>Simulate Mismatch (25 ≠ 24)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Side-by-Side Comparison Visual */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[420px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch my-auto">
            {/* Left Card: Student Register Count */}
            <div className="p-5 rounded-2xl bg-surface border-2 border-border shadow-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-muted flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-blue-500" />
                  <span>Student Register</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                  Source: Roster
                </span>
              </div>

              <div className="text-center py-2">
                <span className="text-4xl font-black text-foreground font-mono">
                  {registerCount}
                </span>
                <span className="text-xs text-muted block mt-1">
                  Enrolled Students in Room 101
                </span>
              </div>

              <div className="text-[11px] text-muted space-y-1 font-mono pt-2 border-t border-border">
                <div>• Seated Seat Numbers: 01 to 25</div>
                <div>• Verified by Registration Database</div>
              </div>
            </div>

            {/* Right Card: Printed Sticker Count */}
            <div
              className={`p-5 rounded-2xl border-2 shadow-md flex flex-col justify-between space-y-4 transition-all duration-300 ${
                isMatched
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-rose-500/10 border-rose-500/50 animate-shake"
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-muted flex items-center gap-1.5">
                  <Tag
                    className={`size-4 ${
                      isMatched ? "text-emerald-500" : "text-rose-500"
                    }`}
                  />
                  <span>Printed Sticker Tag</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isMatched
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  Source: Sticker
                </span>
              </div>

              <div className="text-center py-2">
                <span
                  className={`text-4xl font-black font-mono ${
                    isMatched ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {stickerCount}
                </span>
                <span className="text-xs text-muted block mt-1">
                  Sticker Manifest Quantity
                </span>
              </div>

              <div className="text-[11px] text-muted space-y-1 font-mono pt-2 border-t border-border">
                <div>• Booklet Pack Count: {stickerCount} Booklets</div>
                <div>• Bubble Sheets: {stickerCount} Sheets</div>
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between mt-4 transition-all ${
              isMatched
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
                : "bg-rose-500/20 border-rose-500/40 text-rose-950 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {isMatched ? (
                <ShieldCheck className="size-6 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-6 text-rose-500" />
              )}
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {isMatched
                    ? "STATUS: VERIFIED & SEAL APPROVED (ZERO DISCREPANCY)"
                    : "STATUS: DISCREPANCY DETECTED — PACKAGING LOCKED"}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {isMatched
                    ? "Roster headcount equals sticker headcount exactly (25 = 25). Package may be sealed."
                    : "Difference of 1 booklet detected. Investigation required before sealing."}
                </div>
              </div>
            </div>

            <div className="shrink-0 font-bold text-xs flex items-center gap-1.5">
              {isMatched ? (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-mono text-[11px]">
                  <Unlock className="size-3.5" />
                  <span>PASS</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-mono text-[11px]">
                  <Lock className="size-3.5" />
                  <span>BLOCK</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Operating Rules & Discrepancy Flow */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Zero-Discrepancy Standard
            </h4>

            {/* Rule 1 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Single Source of Truth</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                The database student roster is the single source of truth. Stickers cannot be generated until the roster lock timestamp is recorded.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Scale className="size-3.5 text-blue-500" />
                <span>Two-Way Electronic Handshake</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                During sticker printing, barcode totals are accumulated electronically. If the sum of room stickers deviates from the building total by even one digit, the print batch aborts.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-amber-500" />
                <span>Mismatch Resolution Protocol</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                In the event of a simulated mismatch, the QC Supervisor must verify late registrations or cancellations before regenerating the sticker batch.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200">
            <span className="font-bold block mb-1">Quality Assurance Guarantee:</span>
            <p className="text-[11px] text-muted leading-relaxed">
              No examination envelope leaves the printing facility with mismatched student counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

