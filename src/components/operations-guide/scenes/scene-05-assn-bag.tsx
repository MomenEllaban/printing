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
import { cn } from "@/lib/cn";
import { DocumentModal } from "../shared/document-modal";
import { GUIDE_THEME } from "../shared/guide-theme";
import { ASSN_DOCUMENT } from "../guide-data";

export function Scene05AssnBag() {
  const [hasSpecialCases, setHasSpecialCases] = useState<boolean>(true);
  const [inspectDoc, setInspectDoc] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Header Bar with Mode Toggle */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-purple-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/25">
              Conditional Enclosure
            </span>
            <span className={GUIDE_THEME.muted}>Building Enclosure Protocol #3</span>
          </div>
          <h3 className="text-base font-bold text-white">
            ASSN Special Needs &amp; Accommodations Bag
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated secure package prepared exclusively for centers with registered accommodated candidates.
          </p>
        </div>

        {/* Live Simulation Switch */}
        <div className="flex items-center gap-2.5 bg-[#090D16]/80 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 px-2">Simulation Mode:</span>
          <button
            type="button"
            onClick={() => setHasSpecialCases(!hasSpecialCases)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer transform-gpu will-change-transform",
              hasSpecialCases
                ? "bg-purple-600/90 hover:bg-purple-600 text-white shadow-md shadow-purple-900/30"
                : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300",
            )}
          >
            {hasSpecialCases ? (
              <>
                <ToggleRight className="size-4" />
                <span>With Accommodations (Active)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="size-4" />
                <span>Standard Building (Omitted)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 3D Bag Rendering or Omission Notice */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[400px] relative overflow-hidden shadow-xl">
          {hasSpecialCases ? (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              {/* 3D-styled Security Bag */}
              <div
                className="relative group cursor-pointer transform-gpu will-change-transform"
                onClick={() => setInspectDoc(true)}
              >
                <div className="w-64 h-80 rounded-2xl bg-gradient-to-br from-[#1B1429] via-[#120F1D] to-[#0A0910] border-2 border-purple-500/50 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group-hover:scale-102 group-hover:border-purple-400">
                  {/* Subtle Ambient Glow */}
                  <div className="absolute inset-0 bg-radial from-purple-500/10 via-transparent to-transparent pointer-events-none" />

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
                    <div className="size-14 rounded-2xl mx-auto flex items-center justify-center bg-purple-500/20 border border-purple-500/40 shadow-inner">
                      <Accessibility className="size-7 text-purple-300" />
                    </div>
                    <div>
                      <div className="text-base font-extrabold tracking-wide text-white">
                        ASSN SPECIAL CASES BAG
                      </div>
                      <div className="text-[11px] font-semibold text-purple-300">
                        Al Ryada University • Building A
                      </div>
                      <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">
                        Accommodated Candidates: Dynamic Manifest Allocation
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
                      className="px-2 py-1 rounded-md bg-purple-500/30 hover:bg-purple-500/50 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="size-3" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                  <Sparkles className="size-3.5 text-purple-400" />
                  Click bag to inspect ASSN Special Needs Register &amp; Protocols
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-md animate-in fade-in duration-300">
              <div className="size-14 rounded-2xl mx-auto flex items-center justify-center bg-slate-800/60 border border-slate-700/60 text-slate-400 mb-3">
                <Info className="size-7" />
              </div>
              <h4 className="text-sm font-bold text-white">
                No Special Cases Registered for this Building
              </h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Under EST operational protocol, the ASSN Bag is omitted from carton packaging when the building registration confirms 0 accommodated students.
              </p>
              <div className="mt-4 p-3.5 rounded-xl bg-[#111827]/80 text-left border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white text-xs">Standard Carton Enclosure Composition:</div>
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Floor Transit Bags (Assigned Building Floors)</span>
                </div>
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Head of Center / Control Bag</span>
                </div>
                <div className="text-[11px] flex items-center gap-2 text-slate-500">
                  <span>✕</span>
                  <span>ASSN Bag: NOT INCLUDED (Not Required)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Key Operational Rules & Details */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              ASSN Packaging Specifications
            </h4>

            {/* Feature 1 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 border border-purple-500/20">
                <Clock className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Time Extension Accommodations</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Contains dedicated color-coded student rosters for +25% and +50% time allowances, complete with custom clock timing sheets.
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 border border-blue-500/20">
                <UserCheck className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Dedicated Reader &amp; Scribe Forms</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Official oath forms and identification logs for authorized readers, proctors, and specialized shadow personnel.
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
                <FileCheck2 className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Enlarged Print Verification</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Verification barcodes cross-matched against A3/enlarged font examination booklets delivered via security transport.
                </div>
              </div>
            </div>
          </div>

          {/* Operational Advisory */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-purple-300">
              <HelpCircle className="size-3.5" />
              <span>Chain of Custody Notice</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
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
