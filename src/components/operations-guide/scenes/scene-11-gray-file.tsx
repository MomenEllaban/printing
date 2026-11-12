"use client";

import { useState } from "react";
import {
  FileText,
  Copy,
  ShieldCheck,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene11GrayFile() {
  const [activeTab, setActiveTab] = useState<"both" | "copy1" | "copy2">("both");
  const [isFileOpen, setIsFileOpen] = useState<boolean>(true);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow2.badge)}>
              Chain of Custody Protocol
            </span>
            <span className={GUIDE_THEME.muted}>The Two-Copy Standard</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Gray Examination File &amp; Dual Manifest Verification
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every room packet is enclosed in an opaque gray examination file, authenticated with two identical printed stickers.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("both")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              activeTab === "both"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Dual View (Both Copies)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("copy1")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              activeTab === "copy1"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Copy 1 (External File)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("copy2")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              activeTab === "copy2"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Copy 2 (Control Review)
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: 3D-styled Gray Examination File & Contents */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[440px] shadow-2xl relative">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
            <span className="font-bold">PHYSICAL GRAY FOLDER SIMULATION</span>
            <button
              type="button"
              onClick={() => setIsFileOpen(!isFileOpen)}
              className="text-xs text-blue-400 hover:underline font-bold cursor-pointer"
            >
              {isFileOpen ? "Show Sealed Envelope" : "Unseal & Reveal Contents"}
            </button>
          </div>

          {/* 3D Gray Envelope / File */}
          <div className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-br from-[#1C2433] via-[#141A26] to-[#0D121B] border-2 border-slate-600/50 shadow-2xl p-5 relative overflow-hidden transition-all duration-300">
            {/* Security Top Tape */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 uppercase">
                  CONFIDENTIAL EXAM ENVELOPE
                </span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                SEALED BY PRINT FACILITY
              </span>
            </div>

            {/* Sticker Manifest (Copy 1) Affixed to Front */}
            {(activeTab === "both" || activeTab === "copy1") && (
              <div className="my-4 p-4 rounded-xl bg-[#F8FAFC] text-slate-900 shadow-md border-2 border-slate-300 relative group animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="size-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                      EST
                    </div>
                    <span className="text-xs font-black tracking-wide">
                      EST 1 EXAMINATION FILE
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    COPY 01 — EXTERNAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Center &amp; School</span>
                    <span className="font-bold text-slate-900">Al Ryada University</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Building &amp; Floor</span>
                    <span className="font-bold text-slate-900">Building A • Floor 01</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Room Identifier</span>
                    <span className="font-bold text-blue-700">Room 101</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Subject &amp; Roster</span>
                    <span className="font-bold text-emerald-700">Math 1 • Dynamic Candidates</span>
                  </div>
                </div>

                {/* Barcode Graphic */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="font-mono text-[9px] text-slate-500 tracking-wider">
                    ||||| ||| ||||||| || |||||| ||||
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-700">
                    EST-DAM-R101-M1-ALLOC
                  </span>
                </div>
              </div>
            )}

            {/* Revealed Inner Contents (When Unsealed) */}
            {isFileOpen && (
              <div className="p-3.5 rounded-xl bg-[#090D16]/90 border border-slate-700/60 text-xs text-slate-300 space-y-2 animate-in fade-in duration-300">
                <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  <span>Enclosed Confidential Test Papers</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#0F1626] border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Test Booklets</div>
                    <div className="text-xs font-bold text-white">Serialized Test Booklets</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">Matched to Room Manifest</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0F1626] border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Bubble Answer Sheets</div>
                    <div className="text-xs font-bold text-white">Barcoded Bubble Sheets</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">Scantron Optical Forms</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] font-mono text-slate-400">
              Standard: 1 Gray File per testing room per subject session.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: The Two-Copy Rule Comparative Logic */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              The Two-Copy Rule Explained
            </h4>

            {/* Copy 1 Explanatory Card */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                activeTab === "copy1" || activeTab === "both"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setActiveTab("copy1")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Copy className="size-4" />
                  <span>Copy 01 — Affixed to Gray File</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  External Label
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Firmly affixed onto the front face of the gray envelope. Room Proctors inspect this sticker before entering the testing hall to confirm room, subject, and student count.
              </p>
            </div>

            {/* Copy 2 Explanatory Card */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                activeTab === "copy2" || activeTab === "both"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setActiveTab("copy2")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="size-4" />
                  <span>Copy 02 — Control Room Master Log</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Audit Manifest
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Retained in the Head of Center / Control Room Master Review Dossier. During booklet return after test conclusion, Copy 2 is matched line-by-line against returned materials.
              </p>
            </div>
          </div>

          {/* Security Rule Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-300">
              <Sparkles className="size-4" />
              <span>Zero-Substitution Security Principle</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If any discrepancy is detected between Copy 1 (File) and Copy 2 (Control), the examination envelope cannot be opened without official sign-off from the Lead Control Officer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
