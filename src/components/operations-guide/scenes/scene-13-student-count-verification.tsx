"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene13StudentCountVerification() {
  const [isMatched, setIsMatched] = useState<boolean>(true);

  const registerCount = 24;
  const stickerCount = isMatched ? 24 : 23;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-emerald-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.master.badge)}>
              Quality Assurance
            </span>
            <span className={GUIDE_THEME.muted}>Zero-Discrepancy Protocol</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Student Count Verification System
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated mathematical cross-checking between the official student roster and printed examination file stickers.
          </p>
        </div>

        {/* Simulation Scenario Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setIsMatched(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
              isMatched
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Simulate Matched Count (24 = 24)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMatched(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
              !isMatched
                ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            <AlertCircle className="size-3.5" />
            <span>Simulate Mismatch (24 ≠ 23)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Side-by-Side Comparison Visual */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] shadow-2xl relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch my-auto">
            {/* Left Card: Student Register Count */}
            <div className="p-5 rounded-2xl bg-[#0F1626] border-2 border-slate-800 shadow-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-blue-400" />
                  <span>Student Register</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold border border-blue-500/25">
                  Source: Roster
                </span>
              </div>

              <div className="text-center py-2">
                <span className="text-4xl font-extrabold text-white font-mono">
                  {registerCount}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Enrolled Students in Room 101
                </span>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800/80">
                <div>• Allocated Seats: 01 to {registerCount}</div>
                <div>• Verified by Official Registration DB</div>
              </div>
            </div>

            {/* Right Card: Printed Sticker Count */}
            <div
              className={cn(
                "p-5 rounded-2xl border-2 shadow-md flex flex-col justify-between space-y-4 transition-all duration-300",
                isMatched
                  ? "bg-[#0A1616] border-emerald-500/50"
                  : "bg-[#1C0F14] border-rose-500/50",
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag
                    className={cn(
                      "size-4",
                      isMatched ? "text-emerald-400" : "text-rose-400",
                    )}
                  />
                  <span>Printed Sticker Tag</span>
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded font-bold border",
                    isMatched
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/30",
                  )}
                >
                  Source: Sticker
                </span>
              </div>

              <div className="text-center py-2">
                <span
                  className={cn(
                    "text-4xl font-extrabold font-mono",
                    isMatched ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {stickerCount}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Sticker Manifest Quantity
                </span>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800/80">
                <div>• Booklet Pack Count: {stickerCount} Booklets</div>
                <div>• Bubble Sheets: {stickerCount} Sheets</div>
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div
            className={cn(
              "p-4 rounded-xl border flex items-center justify-between mt-4 transition-all",
              isMatched
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-200",
            )}
          >
            <div className="flex items-center gap-3">
              {isMatched ? (
                <ShieldCheck className="size-6 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="size-6 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {isMatched
                    ? "STATUS: VERIFIED & SEAL APPROVED (ZERO DISCREPANCY)"
                    : "STATUS: DISCREPANCY DETECTED — PACKAGING LOCKED"}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {isMatched
                    ? "Roster headcount equals sticker headcount exactly (24 = 24). Package may be sealed."
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
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Zero-Discrepancy Standard
            </h4>

            {/* Rule 1 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>Single Source of Truth</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The database student roster is the single source of truth. Stickers cannot be generated until the roster lock timestamp is recorded.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Scale className="size-3.5 text-blue-400" />
                <span>Two-Way Electronic Handshake</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                During sticker printing, barcode totals are accumulated electronically. If the sum of room stickers deviates from the building total by even one digit, the print batch aborts.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-amber-400" />
                <span>Mismatch Resolution Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In the event of a simulated mismatch, the QC Supervisor must verify late registrations or cancellations before regenerating the sticker batch.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
            <span className="font-bold block mb-1 text-emerald-300">Quality Assurance Guarantee:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No examination envelope leaves the printing facility with mismatched student counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
