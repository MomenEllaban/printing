"use client";

import { useState } from "react";
import {
  FileText,
  Copy,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Barcode,
  Layers,
  Building2,
  DoorClosed,
  BookOpen,
} from "lucide-react";

export function Scene11GrayFile() {
  const [activeTab, setActiveTab] = useState<"both" | "copy1" | "copy2">("both");
  const [isFileOpen, setIsFileOpen] = useState<boolean>(true);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
              Chain of Custody Standard
            </span>
            <span className="text-xs text-muted">The Two-Copy Rule</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Gray Examination File & Dual Manifest Verification
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Every room packet is enclosed in an opaque gray examination file, authenticated with two identical printed stickers.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-strong/60 border border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("both")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "both" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Dual View (Both Copies)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("copy1")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "copy1" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Copy 1 (External File)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("copy2")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "copy2" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Copy 2 (Control Review)
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: 3D-styled Gray Examination File & Contents */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[440px]">
          <div className="w-full flex items-center justify-between text-xs text-muted mb-3">
            <span className="font-mono font-bold">PHYSICAL GRAY FOLDER SIMULATION</span>
            <button
              type="button"
              onClick={() => setIsFileOpen(!isFileOpen)}
              className="text-xs text-accent hover:underline font-bold cursor-pointer"
            >
              {isFileOpen ? "Show Sealed Envelope" : "Unseal & Reveal Contents"}
            </button>
          </div>

          {/* 3D Gray Envelope / File */}
          <div className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-500/40 shadow-2xl p-5 relative overflow-hidden transition-all duration-300">
            {/* Security Top Tape */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-600/60">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 uppercase">
                  CONFIDENTIAL EXAM ENVELOPE
                </span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SEALED BY PRINT FACILITY
              </span>
            </div>

            {/* Sticker Manifest (Copy 1) Affixed to Front */}
            {(activeTab === "both" || activeTab === "copy1") && (
              <div className="my-4 p-4 rounded-xl bg-white text-slate-900 shadow-md border-2 border-slate-300 relative group animate-in fade-in duration-200">
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
                    <span className="text-[9px] text-slate-500 block">Center & Location</span>
                    <span className="font-bold">Al Ryada University</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Building & Floor</span>
                    <span className="font-bold">Building A • Floor 01</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Room Number</span>
                    <span className="font-bold text-blue-700">Room 101</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Subject / Candidate Qty</span>
                    <span className="font-bold text-emerald-700">Math 1 • 25 Candidates</span>
                  </div>
                </div>

                {/* Barcode Graphic */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="font-mono text-[9px] text-slate-500">
                    ||||| ||| ||||||| || |||||| ||||
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-700">
                    EST-DAM-R101-M1-025
                  </span>
                </div>
              </div>
            )}

            {/* Revealed Inner Contents (When Unsealed) */}
            {isFileOpen && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-600/40 text-xs text-slate-300 space-y-2 animate-in fade-in duration-300">
                <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  <span>Enclosed Confidential Test Papers</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-border/40">
                    <div className="text-[10px] text-slate-400">Test Booklets</div>
                    <div className="text-xs font-bold text-white">25 Numbered Booklets</div>
                    <div className="text-[9px] text-slate-500 font-mono">EST-M1-B001 to B025</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-border/40">
                    <div className="text-[10px] text-slate-400">Bubble Answer Sheets</div>
                    <div className="text-xs font-bold text-white">25 Barcoded Sheets</div>
                    <div className="text-[9px] text-slate-500 font-mono">Scantron Optical Forms</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] text-muted">
              Standard: 1 Gray File per testing room per subject session.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: The Two-Copy Rule Comparative Logic */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              The Two-Copy Rule Explained
            </h4>

            {/* Copy 1 Explanatory Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "copy1" || activeTab === "both"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setActiveTab("copy1")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <Copy className="size-4" />
                  <span>Copy 01 — Affixed to Gray File</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                  External Label
                </span>
              </div>
              <p className="text-[11px] text-muted mt-2 leading-relaxed">
                Firmly affixed onto the front face of the gray envelope. Room Proctors inspect this sticker before entering the testing hall to confirm room, subject, and student count.
              </p>
            </div>

            {/* Copy 2 Explanatory Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "copy2" || activeTab === "both"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setActiveTab("copy2")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <FileText className="size-4" />
                  <span>Copy 02 — Control Room Master Log</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  Audit Manifest
                </span>
              </div>
              <p className="text-[11px] text-muted mt-2 leading-relaxed">
                Retained in the Head of Center / Control Room Master Review Dossier. During booklet return after test conclusion, Copy 2 is matched line-by-line against returned materials.
              </p>
            </div>
          </div>

          {/* Security Rule Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Sparkles className="size-4 text-amber-500" />
              <span>Zero-Substitution Security Principle</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              If any discrepancy is detected between Copy 1 (File) and Copy 2 (Control), the examination envelope cannot be opened without official sign-off from the Lead Control Officer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
