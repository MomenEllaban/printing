"use client";

import { useState } from "react";
import {
  Archive,
  Crown,
  DoorClosed,
  FolderOpen,
  Layers,
  Unlock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene06FloorBagBreakdown() {
  const [isBagOpened, setIsBagOpened] = useState<boolean>(true);
  const [selectedFolderType, setSelectedFolderType] = useState<"senior" | "rooms">("senior");

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow1.badge)}>
              Floor Material Architecture
            </span>
            <span className={GUIDE_THEME.muted}>Floor Package Breakdown</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Floor Bag Internal Structure &amp; Dual Custody Hierarchy
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every Floor Bag contains exactly 1 Senior Proctor Folder plus individual Room Folders for all rooms on that floor.
          </p>
        </div>

        {/* Action Toggle */}
        <button
          type="button"
          onClick={() => setIsBagOpened(!isBagOpened)}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md transform-gpu will-change-transform",
            isBagOpened ? GUIDE_THEME.btnSecondary : GUIDE_THEME.btnPrimary,
          )}
        >
          {isBagOpened ? (
            <>
              <Archive className="size-4" />
              <span>Zip Floor Bag (Pack View)</span>
            </>
          ) : (
            <>
              <Unlock className="size-4" />
              <span>Unzip Floor Bag (Explore Contents)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Visual Representation */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] relative overflow-hidden shadow-2xl">
          {!isBagOpened ? (
            /* Closed Floor Bag View */
            <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-72 h-88 mx-auto rounded-2xl bg-gradient-to-b from-[#151D30] to-[#0A0E18] border-2 border-blue-500/50 shadow-2xl p-5 flex flex-col justify-between relative">
                {/* Carry Handle */}
                <div className="w-24 h-6 rounded-t-xl border-2 border-b-0 border-blue-400/70 mx-auto -mt-10 bg-[#0F1626] shadow-md" />

                {/* Placard */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-400/30 text-center">
                  <span className="text-[10px] font-mono text-blue-300 uppercase tracking-widest block font-bold">
                    SEALED FLOOR TRANSIT PACKAGE
                  </span>
                  <div className="text-base font-extrabold text-white mt-1">FLOOR 01 BAG</div>
                  <div className="text-xs text-blue-200 mt-0.5">Building A • Al Ryada University</div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-mono font-bold border border-blue-500/30">
                    <span>Rooms 101 – 104 • Dynamic Allocation</span>
                  </div>
                </div>

                {/* Zipper Graphic */}
                <div className="w-full border-t-2 border-dashed border-blue-400/30 my-auto relative">
                  <div className="size-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold absolute left-1/2 -top-2.5 -translate-x-1/2 shadow-md">
                    ⚡
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsBagOpened(true)}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 transform-gpu will-change-transform"
                  >
                    <Unlock className="size-4" />
                    <span>Unzip to Inspect Contents</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Open Floor Bag Breakdown */
            <div className="w-full space-y-4 animate-in fade-in duration-300">
              <div className="text-center mb-1">
                <span className="text-xs font-mono text-slate-400">
                  Floor 01 Package Opened: Exactly 1 Senior Folder &amp; 4 Classroom Dossiers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-stretch">
                {/* 1. Senior Proctor Folder (Special Gold/Amber) */}
                <div
                  onClick={() => setSelectedFolderType("senior")}
                  className={cn(
                    "sm:col-span-2 p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group transform-gpu will-change-transform",
                    selectedFolderType === "senior"
                      ? "bg-[#14120E] border-amber-400 shadow-xl ring-1 ring-amber-400/40 scale-102"
                      : "bg-[#0B101B]/80 border-slate-800 hover:border-amber-400/50 hover:bg-[#0F1626]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                      <Crown className="size-3 text-amber-400" />
                      <span>Senior Folder</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">01 Per Floor</span>
                  </div>

                  <div className="my-4 text-center">
                    <div className="size-11 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                      <Crown className="size-5" />
                    </div>
                    <div className="text-sm font-extrabold text-white mt-2">
                      Senior Proctor Folder
                    </div>
                    <div className="text-[11px] text-amber-400 font-bold mt-0.5 font-mono">
                      Assigned Rooms: 04
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Holds floor governance, senior proctor report &amp; master rosters
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10px] font-semibold text-amber-400 flex items-center justify-center gap-1 font-mono">
                    <span>Inspect Contents in Scene 07 →</span>
                  </div>
                </div>

                {/* 2. Room Folders Stack (Blue / Cyan) */}
                <div
                  onClick={() => setSelectedFolderType("rooms")}
                  className={cn(
                    "sm:col-span-3 p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative transform-gpu will-change-transform",
                    selectedFolderType === "rooms"
                      ? "bg-[#0E1626] border-blue-400 shadow-xl ring-1 ring-blue-400/40 scale-102"
                      : "bg-[#0B101B]/80 border-slate-800 hover:border-blue-400/50 hover:bg-[#0F1626]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                      <DoorClosed className="size-3 text-blue-400" />
                      <span>Room Folders</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">04 Folders</span>
                  </div>

                  <div className="my-3 grid grid-cols-2 gap-2">
                    {[
                      { room: "Room 101", count: "From Manifest" },
                      { room: "Room 102", count: "From Manifest" },
                      { room: "Room 103", count: "From Manifest" },
                      { room: "Room 104", count: "From Manifest" },
                    ].map((rm, idx) => (
                      <div
                        key={rm.room}
                        className="p-2.5 rounded-lg bg-[#090D16]/80 border border-slate-800 text-center"
                      >
                        <div className="text-xs font-bold text-blue-300">{rm.room}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rm.count}</div>
                        <div className="text-[9px] text-blue-400/80 font-mono mt-0.5">
                          Packet #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10px] font-semibold text-blue-400 flex items-center justify-center gap-1 font-mono">
                    <span>Inspect Room Documents in Scene 08 →</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Comparative Analysis */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Package Separation Protocol
            </h4>

            {/* Senior Folder Card */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                selectedFolderType === "senior"
                  ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setSelectedFolderType("senior")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Crown className="size-4" />
                  <span>The Senior Proctor Folder</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  QTY: Exactly 1
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Color: Navy Blue cover with distinct Gold EST crest.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Outer placard specifies exact supervised room range.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Contains floor proctor register, senior report &amp; security pouches.</span>
                </li>
              </ul>
            </div>

            {/* Room Folders Card */}
            <div
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer transform-gpu will-change-transform",
                selectedFolderType === "rooms"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm"
                  : "bg-[#090D16]/60 border-slate-800/80 opacity-70 hover:opacity-100",
              )}
              onClick={() => setSelectedFolderType("rooms")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <FolderOpen className="size-4" />
                  <span>Individual Room Folders</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  QTY: 1 per Room
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>Distinct classroom identifier and subject code badge.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>Handed by Senior Proctor to Room Proctors at morning muster.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>Contains candidate attendance register, seating chart &amp; stickers.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Operational Rule */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-blue-300">
              <ShieldCheck className="size-3.5" />
              <span>Packaging Validation Rule</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Before sealing any Floor Bag in logistics, the dispatch officer must visually verify: Total Room Folders = Total Rooms on that floor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
