"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileCheck2,
  MapPin,
  Package,
  Printer,
  ShieldCheck,
  Tag,
  Truck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene17FinalShipping() {
  const [activeStep, setActiveStep] = useState<number>(6); // Default to last step (Dispatch)

  const pipelineSteps = [
    {
      id: 1,
      name: "Print Authorization",
      icon: FileCheck2,
      timing: "T-72 Hours",
      detail: "Official student roster locked; high-speed digital printing initiated with optical barcode watermarks.",
    },
    {
      id: 2,
      name: "Booklet Collation",
      icon: Printer,
      timing: "T-48 Hours",
      detail: "Test booklets and bubble answer sheets grouped strictly according to individual room candidate manifests.",
    },
    {
      id: 3,
      name: "Gray File Packaging",
      icon: Tag,
      timing: "T-36 Hours",
      detail: "Enclosed in opaque gray envelopes; Copy 1 sticker affixed to file, Copy 2 to control register.",
    },
    {
      id: 4,
      name: "Floor Bag Sorting",
      icon: Package,
      timing: "T-24 Hours",
      detail: "Room folders paired with the Senior Proctor Folder; sealed in floor transit bags with A4 placards.",
    },
    {
      id: 5,
      name: "Building Carton Assembly",
      icon: Building2,
      timing: "T-18 Hours",
      detail: "All floor bags, Head of Center bag, and ASSN bag loaded into the Master Building Carton.",
    },
    {
      id: 6,
      name: "Shipping Bag Sealing",
      icon: ShieldCheck,
      timing: "T-12 Hours",
      detail: "Enclosed in tarpaulin transit bag; laser-engraved serial seal locked and logged in database.",
    },
    {
      id: 7,
      name: "Dispatch to Cairo",
      icon: Truck,
      timing: "T-06 Hours",
      detail: "Handed over to secure armored couriers for nationwide transit to Cairo and governorate hubs.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Grand Dispatch Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0E1F29] to-[#0A1628] border border-emerald-500/30 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Ambient glow */}
        <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <div className="size-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
            <Truck className="size-8 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Final Logistics Milestone
              </span>
              <span className="text-xs text-slate-400 font-mono">Workflow 02 Concluded</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Examination Materials Ready for Dispatch to Cairo
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              All packaging validations, two-copy sticker audits, and building carton seals have been verified. Fleet departure authorized.
            </p>
          </div>
        </div>

        <div className="shrink-0 px-4 py-2.5 rounded-xl bg-[#090D16]/90 border border-slate-800 text-center font-mono space-y-0.5 shadow-xl">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            FLEET STATUS
          </div>
          <div className="text-sm font-extrabold text-white">READY FOR TRANSIT</div>
        </div>
      </div>

      {/* 7-Stage Assembly Line Horizontal Scrubber */}
      <div className={cn(GUIDE_THEME.card, "p-5 space-y-4")}>
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            The 7-Stage Examination Production Pipeline
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Click any phase to review operational parameters
          </span>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {pipelineSteps.map((st, idx) => {
            const isCurrent = activeStep === idx;
            const StepIcon = st.icon;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 transform-gpu will-change-transform",
                  isCurrent
                    ? "bg-[#0E1626] border-emerald-400 text-white shadow-lg ring-1 ring-emerald-400/40 scale-102"
                    : "bg-[#090D16]/60 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "size-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold",
                      isCurrent
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "bg-slate-800 text-slate-400",
                    )}
                  >
                    0{st.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{st.timing}</span>
                </div>

                <div>
                  <div
                    className={cn(
                      "text-xs font-bold leading-tight",
                      isCurrent ? "text-white" : "text-slate-300",
                    )}
                  >
                    {st.name}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <StepIcon
                    className={cn(
                      "size-3.5",
                      isCurrent ? "text-emerald-400" : "text-slate-500",
                    )}
                  />
                  {isCurrent && (
                    <span className="text-emerald-400 font-mono font-bold">Active</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Step Deep Dive Details */}
      <div className={cn(GUIDE_THEME.card, "p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center")}>
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Stage 0{pipelineSteps[activeStep].id} Breakdown
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Timeline: {pipelineSteps[activeStep].timing}
            </span>
          </div>

          <h4 className="text-lg font-extrabold text-white">
            {pipelineSteps[activeStep].name}
          </h4>

          <p className="text-xs text-slate-300 leading-relaxed bg-[#090D16]/60 p-3.5 rounded-xl border border-slate-800/80">
            {pipelineSteps[activeStep].detail}
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Full Audit Trail Stored in Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Supervisor Biometric Verification Recorded</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 p-4 rounded-xl bg-[#090D16] border border-slate-800 text-center space-y-2">
          <div className="text-[10px] font-mono text-slate-500 uppercase">
            Dispatched From
          </div>
          <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
            <MapPin className="size-3.5 text-rose-500" />
            <span>EST Central Secure Print Facility</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            Destination: Cairo Central Operations Hub &amp; 18 Exam Centers
          </div>
        </div>
      </div>
    </div>
  );
}
