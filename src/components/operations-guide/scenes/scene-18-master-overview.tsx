"use client";

import { useState } from "react";
import {
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Crown,
  DoorClosed,
  FileSpreadsheet,
  FileText,
  Layers,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  Users,
} from "lucide-react";

interface Scene18Props {
  onNavigateToScene?: (sceneIndex: number) => void;
}

export function Scene18MasterOverview({ onNavigateToScene }: Scene18Props) {
  const [selectedBranch, setSelectedBranch] = useState<"both" | "branchA" | "branchB">("both");

  return (
    <div className="space-y-6">
      {/* Master Overview Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Master System Blueprint
            </span>
            <span className="text-xs text-slate-400">Complete Operational Workflow</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
            EST Operations Master Architectural Schematic
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Bird&apos;s-eye architectural view unifying Center & Building Box Preparation (Branch A) with Examination Materials, Stickers & Logistics (Branch B).
          </p>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-border/40 text-center">
            <div className="text-base font-black text-amber-400 font-mono">18</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Centers / Schools</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-border/40 text-center">
            <div className="text-base font-black text-blue-400 font-mono">09</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Governorates</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-border/40 text-center">
            <div className="text-base font-black text-emerald-400 font-mono">202</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Testing Rooms</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-border/40 text-center">
            <div className="text-base font-black text-indigo-400 font-mono">100%</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Audit Accuracy</div>
          </div>
        </div>
      </div>

      {/* Branch View Selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
          Dual Operational Architecture
        </h4>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-strong/60 border border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedBranch("both")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedBranch === "both" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Show Both Branches
          </button>
          <button
            type="button"
            onClick={() => setSelectedBranch("branchA")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedBranch === "branchA" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Branch A (Boxes & Buildings)
          </button>
          <button
            type="button"
            onClick={() => setSelectedBranch("branchB")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedBranch === "branchB" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Branch B (Materials & Shipping)
          </button>
        </div>
      </div>

      {/* Interactive Dual-Branch Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* BRANCH A: Center & Building Box Preparation */}
        {(selectedBranch === "both" || selectedBranch === "branchA") && (
          <div className="p-5 rounded-2xl bg-surface border-2 border-border shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center font-black text-xs">
                  A
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">
                    Workflow 01: Center & Building Boxes
                  </h4>
                  <span className="text-[10px] text-muted">Scenes 01 – 09</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                Packaging Hierarchy
              </span>
            </div>

            {/* Stages Sequence */}
            <div className="space-y-2.5">
              {[
                { scene: 0, title: "01. The Big Picture", desc: "EST > Date > Gov > Center > Building > Floors > Rooms" },
                { scene: 1, title: "02. Master Box Placard", desc: "Center, Day, Session & Governorate ID Placard" },
                { scene: 2, title: "03. Box Enclosures", desc: "Floor Bags + Head/Control Bag + ASSN Bag" },
                { scene: 3, title: "04. Head / Control Bag", desc: "Gold Crest dossier, building master registers" },
                { scene: 4, title: "05. ASSN Special Bag", desc: "Conditional package for accommodated candidates" },
                { scene: 5, title: "06. Floor Bag Breakdown", desc: "1 Senior Proctor Folder + 4 Room Folders" },
                { scene: 6, title: "07. Senior Folder Docs", desc: "Proctor attendance, Senior report, mobile pouches" },
                { scene: 7, title: "08. Room Folder Docs", desc: "Student register, room report, student misconduct" },
              ].map((step) => (
                <div
                  key={step.title}
                  onClick={() => onNavigateToScene?.(step.scene)}
                  className="p-2.5 rounded-xl bg-surface-strong/40 hover:bg-amber-500/10 border border-border/60 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-muted">{step.desc}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted group-hover:text-amber-500">
                    Jump →
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-950 dark:text-amber-200">
              <span className="font-bold">Summary:</span> Each building carton is completely self-contained with zero external dependencies once on site.
            </div>
          </div>
        )}

        {/* BRANCH B: Examination Materials, Stickers & Logistics */}
        {(selectedBranch === "both" || selectedBranch === "branchB") && (
          <div className="p-5 rounded-2xl bg-surface border-2 border-border shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                  B
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">
                    Workflow 02: Materials & Shipping
                  </h4>
                  <span className="text-[10px] text-muted">Scenes 10 – 17</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                Logistics & Verification
              </span>
            </div>

            {/* Stages Sequence */}
            <div className="space-y-2.5">
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
                  className="p-2.5 rounded-xl bg-surface-strong/40 hover:bg-blue-500/10 border border-border/60 hover:border-blue-500/40 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-muted">{step.desc}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted group-hover:text-blue-500">
                    Jump →
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-950 dark:text-blue-200">
              <span className="font-bold">Summary:</span> Zero-discrepancy verification ensures 100% confidential integrity from printing to exam desk.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
