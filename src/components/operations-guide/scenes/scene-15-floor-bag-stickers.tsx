"use client";

import { useState } from "react";
import {
  Layers,
  FileText,
  Package,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Barcode,
  Scale,
} from "lucide-react";

export function Scene15FloorBagStickers() {
  const [selectedLevel, setSelectedLevel] = useState<"floor" | "room">("floor");

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Packaging Hierarchy
            </span>
            <span className="text-xs text-muted">Floor Placard vs Room Sticker</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Floor-Level Bag Placards vs Room File Stickers
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Distinguishing large floor transit bag placards from small gray-file room stickers across the physical logistics pipeline.
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-strong/60 border border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedLevel("floor")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedLevel === "floor"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Package className="size-3.5" />
            <span>Large Floor Placard (A4 Landscape)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedLevel("room")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedLevel === "room"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Small Gray File Sticker</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Visual Scale Comparison */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[420px]">
          {selectedLevel === "floor" ? (
            /* Large Floor Transit Bag Placard (A4 / Heavyweight) */
            <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-2xl border-4 border-blue-600 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                    EST
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
                      FLOOR TRANSIT PLACARD
                    </span>
                    <h4 className="text-lg font-black text-slate-950">
                      MATHEMATICS 1 • FLOOR 01
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-mono">
                    EST 1 SESSION
                  </span>
                </div>
              </div>

              {/* Master Details Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Center Name</span>
                  <span className="font-extrabold text-slate-900">Al Ryada University</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Governorate / Day</span>
                  <span className="font-extrabold text-slate-900">Damietta • Friday</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Building & Floor</span>
                  <span className="font-extrabold text-blue-800">Building A • Floor 01</span>
                </div>
              </div>

              {/* Contained Rooms Manifest */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Enclosed Room Packets (04 Total):
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {["Room 101 (25)", "Room 102 (25)", "Room 103 (25)", "Room 104 (25)"].map(
                    (rm) => (
                      <div
                        key={rm}
                        className="p-2 rounded-lg bg-blue-50 border border-blue-200 font-bold text-blue-950 text-[11px]"
                      >
                        {rm}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Summary Tally Bar */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-amber-400" />
                  <span className="font-bold">Total Candidates on Floor:</span>
                </div>
                <span className="text-base font-black text-amber-400 font-mono">
                  100 Enrolled Students
                </span>
              </div>
            </div>
          ) : (
            /* Small Gray Examination File Sticker */
            <div className="w-full max-w-sm rounded-xl bg-white text-slate-900 shadow-xl border-2 border-slate-400 p-4 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs">ROOM FILE STICKER</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  INDIVIDUAL PACKET
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 block">Room</span>
                  <span className="font-bold text-blue-700 text-sm">Room 101</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Headcount</span>
                  <span className="font-black text-emerald-700 text-sm">25 Students</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Floor</span>
                  <span className="font-medium">Floor 01</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Subject</span>
                  <span className="font-medium">Math 1</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="font-mono text-[9px] text-slate-500">|||| ||||| |||||</div>
                <span className="text-[9px] font-mono">SEC-R101-025</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 text-xs text-muted">
            <Scale className="size-4 text-blue-500" />
            <span>
              1 Large Floor Placard aggregates multiple small Room File Stickers into one transit unit.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Comparative Analysis */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Hierarchy & Operational Role
            </h4>

            {/* Floor Placard Role */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedLevel === "floor"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setSelectedLevel("floor")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <Package className="size-4" />
                  <span>Floor Transit Placard</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                  Bag Manifest
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-blue-500 shrink-0 mt-0.5" />
                  <span>Affixed directly to the outer surface of the large floor transit bag.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-blue-500 shrink-0 mt-0.5" />
                  <span>Provides instant visibility for logistics handlers during offloading.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-blue-500 shrink-0 mt-0.5" />
                  <span>Lists total candidate sum across all rooms on that floor.</span>
                </li>
              </ul>
            </div>

            {/* Room File Sticker Role */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedLevel === "room"
                  ? "bg-slate-500/10 border-slate-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setSelectedLevel("room")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="size-4" />
                  <span>Room File Sticker</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 font-bold">
                  File Manifest
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>Affixed directly to the individual gray examination envelope.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>Handed directly to room proctors for classroom distribution.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>Holds exactly 25 test booklets and 25 bubble answer sheets.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-950 dark:text-blue-200">
            <span className="font-bold block mb-1">Dual-Tier Verification Guarantee:</span>
            <p className="text-[11px] text-muted leading-relaxed">
              Floor placards guarantee rapid building distribution, while room stickers guarantee error-free desk-level administration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
