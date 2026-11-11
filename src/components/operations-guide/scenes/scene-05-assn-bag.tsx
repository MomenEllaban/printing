"use client";

import { useState } from "react";
import {
  Accessibility,
  Clock,
  FileCheck2,
  HelpCircle,
  Info,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Eye,
  Sparkles,
} from "lucide-react";
import { DocumentModal } from "../shared/document-modal";
import { ASSN_DOCUMENT } from "../guide-data";

export function Scene05AssnBag() {
  const [hasSpecialCases, setHasSpecialCases] = useState<boolean>(true);
  const [inspectDoc, setInspectDoc] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Header Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Conditional Enclosure
            </span>
            <span className="text-xs text-muted">Building Enclosure Rule #3</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            ASSN Special Needs & Accommodations Bag
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Dedicated secure package prepared exclusively for centers with registered accommodated candidates.
          </p>
        </div>

        {/* Live Simulation Switch */}
        <div className="flex items-center gap-3 bg-surface-strong/60 p-2 rounded-xl border border-border">
          <span className="text-xs font-semibold text-muted">Simulation Scenario:</span>
          <button
            type="button"
            onClick={() => setHasSpecialCases(!hasSpecialCases)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hasSpecialCases
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {hasSpecialCases ? (
              <>
                <ToggleRight className="size-4" />
                <span>With Special Cases (Active)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="size-4" />
                <span>Without Special Cases (Standard)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 3D Bag Rendering or Omission Notice */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[380px] relative overflow-hidden">
          {hasSpecialCases ? (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              {/* 3D-styled Security Bag */}
              <div className="relative group cursor-pointer" onClick={() => setInspectDoc(true)}>
                <div className="w-64 h-80 rounded-2xl bg-gradient-to-br from-purple-900/90 via-indigo-950 to-slate-900 border-2 border-purple-500/50 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group-hover:scale-102 group-hover:border-purple-400">
                  {/* Neon Glow Rim */}
                  <div className="absolute inset-0 bg-radial from-purple-500/20 via-transparent to-transparent pointer-events-none" />

                  {/* Security Zipper / Seal Line */}
                  <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-purple-400" />
                      <span className="text-[11px] font-mono font-bold tracking-widest text-purple-300 uppercase">
                        TAMPER-EVIDENT
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      SEC-ASSN-9021
                    </span>
                  </div>

                  {/* Bag Placard */}
                  <div className="my-auto text-center space-y-2 py-4">
                    <div className="size-16 rounded-2xl mx-auto flex items-center justify-center bg-purple-500/20 border border-purple-500/40 shadow-inner">
                      <Accessibility className="size-8 text-purple-300" />
                    </div>
                    <div>
                      <div className="text-base font-black tracking-wide text-white">
                        ASSN SPECIAL CASES BAG
                      </div>
                      <div className="text-[11px] font-semibold text-purple-300">
                        Al Ryada University • Building A
                      </div>
                      <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">
                        Accommodated Candidates: 03 Registered
                      </div>
                    </div>
                  </div>

                  {/* Badges / Accommodations Footer */}
                  <div className="pt-3 border-t border-purple-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-semibold flex items-center gap-1">
                      <Sparkles className="size-3 text-purple-400" />
                      <span>Inspect Dossier</span>
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md bg-purple-500/30 hover:bg-purple-500/50 text-white font-bold text-[10px] transition-colors flex items-center gap-1"
                    >
                      <Eye className="size-3" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="size-3.5" />
                  Click bag to inspect ASSN Special Needs Register & Protocols
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-md animate-in fade-in duration-300">
              <div className="size-16 rounded-2xl mx-auto flex items-center justify-center bg-muted/10 border border-muted/20 text-muted mb-3">
                <Info className="size-8" />
              </div>
              <h4 className="text-sm font-bold text-foreground">
                No Special Cases Registered for this Building
              </h4>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Under EST operational protocol, the ASSN Bag is omitted from carton packaging when the building registration confirms 0 accommodated students.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-surface text-left border border-border text-xs text-muted space-y-1.5">
                <div className="font-semibold text-foreground">Carton Configuration:</div>
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Floor Transit Bags (Floors 01 – 04)</span>
                </div>
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Head of Center / Control Bag</span>
                </div>
                <div className="text-[11px] flex items-center gap-2 text-muted/60">
                  <span>✕</span>
                  <span>ASSN Bag: NOT INCLUDED (Not Required)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Key Operational Rules & Details */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              ASSN Packaging Specifications
            </h4>

            {/* Feature 1 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                <Clock className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Time Extension Accommodations</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Contains dedicated color-coded student rosters for +25% and +50% time allowances, complete with custom clock timing sheets.
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <UserCheck className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Dedicated Reader & Scribe Forms</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Official oath forms and identification logs for authorized readers, proctors, and specialized shadow personnel.
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <FileCheck2 className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Enlarged Print Verification</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Verification barcodes cross-matched against A3/enlarged font examination booklets delivered via security transport.
                </div>
              </div>
            </div>
          </div>

          {/* Operational Advisory */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-950 dark:text-purple-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <HelpCircle className="size-3.5 text-purple-500" />
              <span>Chain of Custody Notice</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              The ASSN bag may only be unsealed in the presence of the Senior Proctor and the Designated Accommodation Officer 15 minutes before test commencement.
            </p>
          </div>
        </div>
      </div>

      {/* Document Inspection Modal */}
      <DocumentModal
        isOpen={inspectDoc}
        onClose={() => setInspectDoc(false)}
        document={ASSN_DOCUMENT}
      />
    </div>
  );
}
