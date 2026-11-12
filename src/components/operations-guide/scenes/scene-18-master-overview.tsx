"use client";

import { useState } from "react";
import {
  Package,
  Layers,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

interface Scene18Props {
  onNavigateToScene?: (sceneIndex: number) => void;
}

export function Scene18MasterOverview({ onNavigateToScene }: Scene18Props) {
  const [selectedBranch, setSelectedBranch] = useState<"both" | "branchA" | "branchB">("both");

  return (
    <div className="space-y-6">
      {/* Master Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1424] via-[#0E1B33] to-[#0A111F] border border-blue-500/30 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Master System Blueprint
            </span>
            <span className="text-xs text-slate-400 font-mono">Complete Operational Architecture</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            EST Operations Master Architectural Schematic
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Bird&apos;s-eye architectural view unifying Center &amp; Building Box Preparation (Branch A) with Examination Materials, Stickers &amp; Logistics (Branch B).
          </p>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl bg-[#090D16]/90 border border-slate-800 text-center">
            <div className="text-base font-extrabold text-amber-400 font-mono">18</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Centers / Schools</div>
          </div>
          <div className="p-3 rounded-xl bg-[#090D16]/90 border border-slate-800 text-center">
            <div className="text-base font-extrabold text-blue-400 font-mono">09</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Governorates</div>
          </div>
          <div className="p-3 rounded-xl bg-[#090D16]/90 border border-slate-800 text-center">
            <div className="text-base font-extrabold text-emerald-400 font-mono">202</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Testing Rooms</div>
          </div>
          <div className="p-3 rounded-xl bg-[#090D16]/90 border border-slate-800 text-center">
            <div className="text-base font-extrabold text-indigo-400 font-mono">100%</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Audit Accuracy</div>
          </div>
        </div>
      </div>

      {/* Branch View Selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          Dual Operational Architecture
        </h4>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setSelectedBranch("both")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              selectedBranch === "both"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Show Both Branches
          </button>
          <button
            type="button"
            onClick={() => setSelectedBranch("branchA")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              selectedBranch === "branchA"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Branch A (Boxes &amp; Buildings)
          </button>
          <button
            type="button"
            onClick={() => setSelectedBranch("branchB")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer transform-gpu will-change-transform",
              selectedBranch === "branchB"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Branch B (Materials &amp; Shipping)
          </button>
        </div>
      </div>

      {/* Interactive Dual-Branch Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* BRANCH A: Center & Building Box Preparation */}
        {(selectedBranch === "both" || selectedBranch === "branchA") && (
          <div className={cn(GUIDE_THEME.card, "p-5 border-amber-500/20 flex flex-col justify-between space-y-4")}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs font-mono">
                  A
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Workflow 01: Center &amp; Building Boxes
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Scenes 01 – 09</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                Packaging Hierarchy
              </span>
            </div>

            {/* Stages Sequence */}
            <div className="space-y-2">
              {[
                { scene: 0, title: "01. The Big Picture", desc: "EST > Date > Gov > Center > Building > Floors > Rooms" },
                { scene: 1, title: "02. Master Box Placard", desc: "Center, Day, Session & Governorate ID Placard" },
                { scene: 2, title: "03. Box Enclosures", desc: "Floor Bags + Head/Control Bag + ASSN Bag" },
                { scene: 3, title: "04. Head / Control Bag", desc: "Command dossier, building master registers" },
                { scene: 4, title: "05. ASSN Special Bag", desc: "Conditional package for accommodated candidates" },
                { scene: 5, title: "06. Floor Bag Breakdown", desc: "1 Senior Proctor Folder + Assigned Room Folders" },
                { scene: 6, title: "07. Senior Folder Docs", desc: "Proctor attendance, Senior report, mobile pouches" },
                { scene: 7, title: "08. Room Folder Docs", desc: "Student register, room report, seating charts" },
              ].map((step) => (
                <div
                  key={step.title}
                  onClick={() => onNavigateToScene?.(step.scene)}
                  className="p-2.5 rounded-xl bg-[#090D16]/60 hover:bg-amber-500/10 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between group transform-gpu will-change-transform"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 group-hover:text-amber-400">
                    Jump →
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              <span className="font-bold text-amber-300">Summary:</span> Each building carton is completely self-contained with zero external dependencies once on site.
            </div>
          </div>
        )}

        {/* BRANCH B: Examination Materials, Stickers & Logistics */}
        {(selectedBranch === "both" || selectedBranch === "branchB") && (
          <div className={cn(GUIDE_THEME.card, "p-5 border-blue-500/20 flex flex-col justify-between space-y-4")}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs font-mono">
                  B
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Workflow 02: Materials &amp; Shipping
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Scenes 10 – 17</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                Logistics &amp; Verification
              </span>
            </div>

            {/* Stages Sequence */}
            <div className="space-y-2">
              {[
                { scene: 9, title: "10. Materials Big Picture", desc: "The 6 core pillars of confidential print operations" },
                { scene: 10, title: "11. The Two-Copy Rule", desc: "Copy 1 on Gray File, Copy 2 in Control Master Log" },
                { scene: 11, title: "12. Subject-Based Stickers", desc: "Dynamic color-coding: Math, Bio, Phys, Chem, Lit" },
                { scene: 12, title: "13. Student Count Verification", desc: "Zero-discrepancy handshake: Roster count = Sticker count" },
                { scene: 13, title: "14. ASSN Room Stickers", desc: "Special purple badges, +25%/+50% time markers" },
                { scene: 14, title: "15. Floor Bag Stickers", desc: "A4 large transit placards vs room envelope stickers" },
                { scene: 15, title: "16. External Shipping Bags", desc: "Master bag loading checklist with serial sealing" },
                { scene: 16, title: "17. Dispatch to Cairo", desc: "7-stage pipeline culminating in courier fleet transit" },
              ].map((step) => (
                <div
                  key={step.title}
                  onClick={() => onNavigateToScene?.(step.scene)}
                  className="p-2.5 rounded-xl bg-[#090D16]/60 hover:bg-blue-500/10 border border-slate-800/80 hover:border-blue-500/40 transition-all cursor-pointer flex items-center justify-between group transform-gpu will-change-transform"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 group-hover:text-blue-400">
                    Jump →
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200">
              <span className="font-bold text-blue-300">Summary:</span> Zero-discrepancy verification ensures 100% confidential integrity from printing to exam desk.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
