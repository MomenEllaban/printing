"use client";

import { useState } from "react";
import {
  Archive,
  Crown,
  DoorClosed,
  FolderOpen,
  Layers,
  Sparkles,
  Unlock,
  CheckCircle2,
} from "lucide-react";

export function Scene06FloorBagBreakdown() {
  const [isBagOpened, setIsBagOpened] = useState<boolean>(true);
  const [selectedFolderType, setSelectedFolderType] = useState<"senior" | "rooms">("senior");

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Floor Material Architecture
            </span>
            <span className="text-xs text-muted">Floor Package Breakdown</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Floor Bag Internal Structure & Hierarchy
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Every Floor Bag contains exactly 1 Senior Proctor Folder plus individual Room Folders for all rooms on that floor.
          </p>
        </div>

        {/* Action Toggle */}
        <button
          type="button"
          onClick={() => setIsBagOpened(!isBagOpened)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-white font-bold text-xs shadow-xs hover:bg-accent/90 transition-all cursor-pointer"
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
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[420px] relative overflow-hidden">
          {!isBagOpened ? (
            /* Closed Floor Bag View */
            <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-72 h-88 mx-auto rounded-3xl bg-gradient-to-b from-slate-800 to-slate-950 border-4 border-blue-500/60 shadow-2xl p-5 flex flex-col justify-between relative">
                {/* Carry Handle */}
                <div className="w-24 h-6 rounded-t-xl border-2 border-b-0 border-blue-400/80 mx-auto -mt-10 bg-slate-900 shadow-md" />

                {/* Placard */}
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/40 text-center">
                  <span className="text-[10px] font-mono text-blue-300 uppercase tracking-widest block">
                    SEALED FLOOR TRANSIT PACKAGE
                  </span>
                  <div className="text-lg font-black text-white mt-1">FLOOR 01 BAG</div>
                  <div className="text-xs text-blue-200 mt-0.5">Building A • Al Ryada University</div>
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold">
                    <span>Rooms 101 – 104 • 100 Candidates</span>
                  </div>
                </div>

                {/* Zipper Graphic */}
                <div className="w-full border-t-2 border-dashed border-blue-400/40 my-auto relative">
                  <div className="size-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold absolute left-1/2 -top-2.5 -translate-x-1/2 shadow-md">
                    ⚡
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsBagOpened(true)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
              <div className="text-center mb-2">
                <span className="text-xs font-semibold text-muted">
                  Floor 01 Package Opened: Showing 1 Senior Folder & 4 Room Folders
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-stretch">
                {/* 1. Senior Proctor Folder (Special Gold/Navy) */}
                <div
                  onClick={() => setSelectedFolderType("senior")}
                  className={`sm:col-span-2 p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                    selectedFolderType === "senior"
                      ? "bg-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/30 scale-102"
                      : "bg-surface border-border hover:border-amber-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Crown className="size-3 text-amber-400" />
                      <span>Senior Folder</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">01 Per Floor</span>
                  </div>

                  <div className="my-5 text-center">
                    <div className="size-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                      <Crown className="size-6" />
                    </div>
                    <div className="text-sm font-black text-foreground mt-2">
                      Senior Proctor Folder
                    </div>
                    <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                      Assigned Rooms: 04
                    </div>
                    <div className="text-[10px] text-muted mt-1">
                      Holds floor governance, senior proctor report & master rosters
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 text-[10px] font-semibold text-amber-400 flex items-center justify-center gap-1">
                    <span>Inspect Contents in Scene 07 →</span>
                  </div>
                </div>

                {/* 2. Room Folders Stack (Emerald / Cyan) */}
                <div
                  onClick={() => setSelectedFolderType("rooms")}
                  className={`sm:col-span-3 p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                    selectedFolderType === "rooms"
                      ? "bg-slate-900 border-emerald-400 shadow-xl ring-2 ring-emerald-400/30 scale-102"
                      : "bg-surface border-border hover:border-emerald-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <DoorClosed className="size-3 text-emerald-400" />
                      <span>Room Folders</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">04 Folders</span>
                  </div>

                  <div className="my-3 grid grid-cols-2 gap-2">
                    {["Room 101", "Room 102", "Room 103", "Room 104"].map((rm, idx) => (
                      <div
                        key={rm}
                        className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center"
                      >
                        <div className="text-xs font-bold text-emerald-300">{rm}</div>
                        <div className="text-[10px] text-muted">25 Candidates</div>
                        <div className="text-[9px] text-emerald-400 font-mono mt-0.5">
                          Packet #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border/40 text-[10px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
                    <span>Inspect Room Documents in Scene 08 →</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Comparative Analysis */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Package Separation Protocol
            </h4>

            {/* Senior Folder Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedFolderType === "senior"
                  ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setSelectedFolderType("senior")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Crown className="size-4" />
                  <span>The Senior Proctor Folder</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                  QTY: Exactly 1
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>Color: Navy Blue cover with distinct Gold EST crest.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>Clearly displays: &quot;Assigned Rooms: 04&quot; on outer placard.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>Contains floor proctor register, senior report & mobile pouches.</span>
                </li>
              </ul>
            </div>

            {/* Room Folders Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedFolderType === "rooms"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                  : "bg-surface border-border opacity-70"
              }`}
              onClick={() => setSelectedFolderType("rooms")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <FolderOpen className="size-4" />
                  <span>Individual Room Folders</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  QTY: 1 per Room
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Color: Emerald / Teal cover with high-contrast Room badge.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Handed directly by Senior Proctor to Room Proctors at 08:30 AM.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Contains student attendance register, test day report & stickers.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Operational Rule */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-950 dark:text-blue-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Sparkles className="size-3.5 text-blue-500" />
              <span>Packaging Validation Rule</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Before sealing any Floor Bag in logistics, the dispatch officer must visually verify: Total Room Folders = Total Rooms on that floor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

