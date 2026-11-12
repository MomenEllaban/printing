"use client";

import {
  CheckCircle2,
  Package,
  Layers,
  Crown,
  Accessibility,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

interface Scene09Props {
  onGoToWorkflow2?: () => void;
}

export function Scene09Workflow01Summary({ onGoToWorkflow2 }: Scene09Props) {
  return (
    <div className="space-y-6">
      {/* Header with Completion Banner */}
      <div className={cn(GUIDE_THEME.card, "p-5 border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4")}>
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="size-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Workflow 01 Complete
              </span>
              <span className={GUIDE_THEME.muted}>Preparation Phase Concluded</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Center &amp; Building Box Preparation Summary
            </h3>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/20 shrink-0">
          <ShieldCheck className="size-4" />
          <span>Building Box Ready for Transit</span>
        </div>
      </div>

      {/* Visual Architectural Tree Diagram */}
      <div className={cn(GUIDE_THEME.card, "p-6 space-y-6")}>
        <div className="text-center max-w-lg mx-auto">
          <h4 className="text-sm font-extrabold text-white">
            Complete Center &amp; Building Packaging Hierarchy
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Every building carton is systematically assembled with strict containment layers before shipping.
          </p>
        </div>

        {/* Tree Root */}
        <div className="flex flex-col items-center">
          {/* Level 1: Master Building Box */}
          <div className="px-6 py-3.5 rounded-2xl bg-[#090D16] border-2 border-amber-500/60 shadow-xl text-center space-y-0.5 min-w-[280px]">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs font-mono">
              <Package className="size-4" />
              <span>MASTER BUILDING CARTON</span>
            </div>
            <div className="text-sm font-extrabold text-white">Al Ryada University • Building A</div>
            <div className="text-[10px] font-mono text-slate-400">Damietta • Friday EST 1 Session</div>
          </div>

          {/* Connector Vertical Line */}
          <div className="w-0.5 h-6 bg-slate-800" />

          {/* Level 2: Three Branch Enclosures */}
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Horizontal Busbar for desktop */}
            <div className="hidden md:block absolute top-0 left-1/6 right-1/6 h-0.5 bg-slate-800 -mt-0.5" />

            {/* Enclosure 1: Head / Control Bag */}
            <div className="p-4 rounded-xl bg-[#090D16]/90 border border-amber-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Enclosure 01
                </span>
                <Crown className="size-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Head / Control Bag</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Delivered straight to the Control Room. Contains building master register, emergency reserve manifest, and chief proctor custody forms.
                </div>
              </div>
              <div className="text-[10px] font-mono text-amber-400 font-semibold pt-2 border-t border-amber-500/20">
                ★ 1 Bag per Center/Building
              </div>
            </div>

            {/* Enclosure 2: Floor Bags */}
            <div className="p-4 rounded-xl bg-[#090D16]/90 border border-blue-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  Enclosure 02 (Core)
                </span>
                <Layers className="size-4 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Floor Transit Bags (Floors)</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  1 Bag per building floor. Each contains exactly 1 Senior Proctor Folder and segregated Room Dossiers for all testing classrooms.
                </div>
              </div>
              <div className="text-[10px] font-mono text-blue-400 font-semibold pt-2 border-t border-blue-500/20">
                ★ 1 Bag per Supervised Floor
              </div>
            </div>

            {/* Enclosure 3: ASSN Bag */}
            <div className="p-4 rounded-xl bg-[#090D16]/90 border border-purple-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Enclosure 03 (Conditional)
                </span>
                <Accessibility className="size-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">ASSN Special Needs Bag</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Included when accommodated students are registered. Contains time extension rosters (+25%/+50%) and reader/scribe oaths.
                </div>
              </div>
              <div className="text-[10px] font-mono text-purple-400 font-semibold pt-2 border-t border-purple-500/20">
                ★ 1 Bag (When Applicable)
              </div>
            </div>
          </div>
        </div>

        {/* Transition Callout to Workflow 02 */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            <span className="font-bold text-white">Next Up in Workflow 02:</span> Gray Examination Files, Two-Copy Rule, Subject Stickers, Verification &amp; Shipping to External Centers.
          </div>

          {onGoToWorkflow2 && (
            <button
              type="button"
              onClick={onGoToWorkflow2}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer flex items-center gap-2 shrink-0 transform-gpu will-change-transform"
            >
              <span>Proceed to Workflow 02</span>
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
