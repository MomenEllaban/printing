"use client";

import {
  CheckCircle2,
  Package,
  Layers,
  Crown,
  DoorClosed,
  Accessibility,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";

interface Scene09Props {
  onGoToWorkflow2?: () => void;
}

export function Scene09Workflow01Summary({ onGoToWorkflow2 }: Scene09Props) {
  return (
    <div className="space-y-6">
      {/* Header with Completion Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="size-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Workflow 01 Complete
              </span>
              <span className="text-xs text-muted">Preparation Phase Concluded</span>
            </div>
            <h3 className="text-lg font-black text-foreground mt-0.5">
              Center & Building Box Preparation Summary
            </h3>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg">
          <ShieldCheck className="size-4" />
          <span>Building Box Ready for Transit</span>
        </div>
      </div>

      {/* Visual Architectural Tree Diagram */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-6">
        <div className="text-center max-w-lg mx-auto">
          <h4 className="text-sm font-bold text-foreground">
            Complete Center & Building Packaging Hierarchy
          </h4>
          <p className="text-xs text-muted mt-1">
            Every building carton is systematically assembled with strict containment layers before shipping.
          </p>
        </div>

        {/* Tree Root */}
        <div className="flex flex-col items-center">
          {/* Level 1: Master Building Box */}
          <div className="px-6 py-3.5 rounded-2xl bg-slate-900 border-2 border-amber-500/60 shadow-xl text-center space-y-0.5 min-w-[280px]">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
              <Package className="size-4" />
              <span>MASTER BUILDING CARTON</span>
            </div>
            <div className="text-sm font-black text-white">Al Ryada University • Building A</div>
            <div className="text-[10px] font-mono text-muted">Damietta • Friday EST 1 Session</div>
          </div>

          {/* Connector Vertical Line */}
          <div className="w-0.5 h-6 bg-border" />

          {/* Level 2: Three Branch Enclosures */}
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Horizontal Busbar for desktop */}
            <div className="hidden md:block absolute top-0 left-1/6 right-1/6 h-0.5 bg-border -mt-0.5" />

            {/* Enclosure 1: Head / Control Bag */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Enclosure 01
                </span>
                <Crown className="size-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Head / Control Bag</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Delivered straight to the Control Room. Contains building master register, safe key protocols, and exam director seal forms.
                </div>
              </div>
              <div className="text-[10px] font-mono text-amber-400 font-semibold pt-2 border-t border-amber-500/20">
                ★ 1 Bag per Center/Building
              </div>
            </div>

            {/* Enclosure 2: Floor Bags */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  Enclosure 02 (Core)
                </span>
                <Layers className="size-4 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Floor Transit Bags (01 – 04)</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  1 Bag per building floor. Each contains 1 Senior Proctor Folder and distinct Room Folders (Room 101, 102, 103, 104).
                </div>
              </div>
              <div className="text-[10px] font-mono text-blue-400 font-semibold pt-2 border-t border-blue-500/20">
                ★ 4 Bags (Floors 01 – 04)
              </div>
            </div>

            {/* Enclosure 3: ASSN Bag */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  Enclosure 03 (Conditional)
                </span>
                <Accessibility className="size-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">ASSN Special Needs Bag</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Included when accommodated students are registered. Contains time extension rosters (+25%/+50%) and reader oaths.
                </div>
              </div>
              <div className="text-[10px] font-mono text-purple-400 font-semibold pt-2 border-t border-purple-500/20">
                ★ 1 Bag (When Applicable)
              </div>
            </div>
          </div>
        </div>

        {/* Transition Callout to Workflow 02 */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted">
            <span className="font-bold text-foreground">Next Up in Workflow 02:</span> Gray Examination Files, Two-Copy Rule, Subject Stickers, Student Count Verification & Dispatch to Cairo.
          </div>

          {onGoToWorkflow2 && (
            <button
              type="button"
              onClick={onGoToWorkflow2}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
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
