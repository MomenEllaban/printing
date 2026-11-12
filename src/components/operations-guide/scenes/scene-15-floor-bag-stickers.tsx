"use client";

import { useState } from "react";
import {
  FileText,
  Package,
  Building2,
  CheckCircle2,
  Barcode,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene15FloorBagStickers() {
  const [selectedLevel, setSelectedLevel] = useState<"floor" | "room">("floor");

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow2.badge)}>
              Packaging Hierarchy
            </span>
            <span className={GUIDE_THEME.muted}>Floor Placard vs Room Sticker</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Floor-Level Bag Placards vs Room File Stickers
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distinguishing large floor transit bag placards from small gray-file room stickers across the physical logistics pipeline.
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setSelectedLevel("floor")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
              selectedLevel === "floor"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            <Package className="size-3.5" />
            <span>Large Floor Placard (A4 Landscape)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedLevel("room")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
              selectedLevel === "room"
                ? "bg-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            <FileText className="size-3.5" />
            <span>Small Gray File Sticker</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Visual Scale Comparison */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] shadow-2xl relative">
          {selectedLevel === "floor" ? (
            /* Large Floor Transit Bag Placard (A4 / Heavyweight) */
            <div className="w-full max-w-lg rounded-2xl bg-[#F8FAFC] text-slate-900 shadow-2xl border-4 border-blue-600 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
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
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-100 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Center Name</span>
                  <span className="font-extrabold text-slate-900">Al Ryada University</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Governorate &amp; Day</span>
                  <span className="font-extrabold text-slate-900">Damietta • Friday</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Building &amp; Floor</span>
                  <span className="font-extrabold text-blue-800">Building A • Floor 01</span>
                </div>
              </div>

              {/* Contained Rooms Manifest */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block uppercase font-mono">
                  Enclosed Room Packets (04 Total):
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[
                    "Room 101 (24)",
                    "Room 102 (20)",
                    "Room 103 (22)",
                    "Room 104 (18)",
                  ].map((rm) => (
                    <div
                      key={rm}
                      className="p-2 rounded-lg bg-blue-50 border border-blue-200 font-bold text-blue-950 text-[11px]"
                    >
                      {rm}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Tally Bar */}
              <div className="p-3 rounded-xl bg-[#090D16] text-white flex items-center justify-between text-xs border border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-amber-400" />
                  <span className="font-bold">Total Candidates on Floor:</span>
                </div>
                <span className="text-base font-black text-amber-400 font-mono">
                  84 Enrolled Candidates
                </span>
              </div>
            </div>
          ) : (
            /* Small Gray Examination File Sticker */
            <div className="w-full max-w-sm rounded-xl bg-[#F8FAFC] text-slate-900 shadow-xl border-2 border-slate-400 p-4 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs uppercase font-mono">ROOM FILE STICKER</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                  INDIVIDUAL PACKET
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Room</span>
                  <span className="font-bold text-blue-700 text-sm">Room 101</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Headcount</span>
                  <span className="font-black text-emerald-700 text-sm">24 Students</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Floor</span>
                  <span className="font-medium text-slate-800">Floor 01</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Subject</span>
                  <span className="font-medium text-slate-800">Math 1</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="font-mono text-[9px] text-slate-500">|||| ||||| |||||</div>
                <span className="text-[9px] font-mono font-bold text-slate-700">SEC-R101-024</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Scale className="size-4 text-blue-400" />
            <span>
              1 Large Floor Placard aggregates multiple small Room File Stickers into one transit unit.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Comparative Analysis */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Hierarchy &amp; Operational Role
            </h4>

            {/* Floor Placard Role */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                selectedLevel === "floor"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setSelectedLevel("floor")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Package className="size-4" />
                  <span>Floor Transit Bag Placard</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  A4 Heavy Placard
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Affixed to the transparent exterior pocket of the heavy-duty floor bag. Enables instant visual recognition by logistics handlers, security drivers, and floor supervisors upon arrival.
              </p>
            </div>

            {/* Room File Sticker Role */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                selectedLevel === "room"
                  ? "bg-slate-700/30 border-slate-500/50 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setSelectedLevel("room")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="size-4 text-blue-400" />
                  <span>Room File Sticker</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  Direct Envelope Label
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Affixed directly to each confidential gray examination file. Carried into the classroom by room proctors for physical barcode scanning and reconciliation against the student register.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
            <span className="font-bold block mb-1 text-blue-300">Logistics Efficiency Rule:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Floor placards eliminate the need to unbag or inspect individual room dossiers at transit checkpoints, maintaining chain-of-custody security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
