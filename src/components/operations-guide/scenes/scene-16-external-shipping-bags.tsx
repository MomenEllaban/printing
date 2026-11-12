"use client";

import { useState } from "react";
import {
  Archive,
  CheckCircle2,
  Lock,
  Package,
  ShieldCheck,
  Truck,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";
import { PACKAGING_CHECKLIST } from "../guide-data";
import type { ChecklistItem } from "../guide-types";

export function Scene16ExternalShippingBags() {
  const [checkedIds, setCheckedIds] = useState<string[]>(
    PACKAGING_CHECKLIST.map((item: ChecklistItem) => item.id),
  );

  const toggleCheck = (id: string) => {
    if (checkedIds.includes(id)) {
      setCheckedIds(checkedIds.filter((i) => i !== id));
    } else {
      setCheckedIds([...checkedIds, id]);
    }
  };

  const progressPct = Math.round(
    (checkedIds.length / PACKAGING_CHECKLIST.length) * 100,
  );
  const isFullyPacked = progressPct === 100;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-amber-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow1.badge)}>
              Final Packaging Stage
            </span>
            <span className={GUIDE_THEME.muted}>External Shipping Bags</span>
          </div>
          <h3 className="text-base font-bold text-white">
            External Shipping Bags &amp; Master Checklist Verification
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Heavy-duty, waterproof security bags consolidating all floor packages and control dossiers into one sealed transit unit.
          </p>
        </div>

        {/* Packing Progress Status */}
        <div className="flex items-center gap-3 bg-[#090D16]/80 p-2.5 px-4 rounded-xl border border-slate-800 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Verification Status</div>
            <div
              className={cn(
                "text-sm font-black font-mono",
                isFullyPacked ? "text-emerald-400" : "text-amber-400",
              )}
            >
              {progressPct}% COMPLETE
            </div>
          </div>

          <div className="size-10 rounded-xl bg-[#0F1626] border border-slate-700/80 flex items-center justify-center">
            {isFullyPacked ? (
              <ShieldCheck className="size-6 text-emerald-400" />
            ) : (
              <Archive className="size-6 text-amber-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: 3D Heavy-Duty Transit Bag Simulation */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] shadow-2xl relative">
          {/* Progress Bar Top */}
          <div className="w-full space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 font-mono">Master Bag Loading Progress:</span>
              <span className="font-mono text-white font-bold">
                {checkedIds.length} of {PACKAGING_CHECKLIST.length} Items Enclosed
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isFullyPacked ? "bg-emerald-500" : "bg-amber-500",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 3D-styled Heavy-Duty Shipping Bag */}
          <div className="w-full max-w-md mx-auto rounded-3xl bg-gradient-to-br from-[#181512] via-[#0E1017] to-[#0A0B10] border-2 border-amber-500/50 shadow-2xl p-6 relative overflow-hidden transition-all duration-300">
            {/* Top Seal Tag */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-amber-400" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                  EST HEAVY TRANSIT BAG
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SERIAL #EST-SHP-2026-9901
              </span>
            </div>

            {/* Bag Body Content */}
            <div className="my-6 text-center space-y-3">
              <div className="size-16 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner">
                <Package className="size-8" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">
                  AL RYADA UNIVERSITY • DAMIETTA
                </h4>
                <div className="text-xs text-amber-300 font-semibold mt-0.5">
                  Building A Master Examination Package
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  EST 1 Session • Friday Administration
                </div>
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono">
                {isFullyPacked ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <Lock className="size-3.5" />
                    <span>SEALED WITH TAMPER-EVIDENT SERIAL TAG</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Unlock className="size-3.5" />
                    <span>PACKING IN PROGRESS ({PACKAGING_CHECKLIST.length - checkedIds.length} REMAINING)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Bag Footer Note */}
            <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>WATERPROOF TARPAULIN</span>
              <span>GPS TRACKED TRANSIT</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-400 font-mono">
              Click checklist items on the right to toggle their inclusion in the master bag.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Interactive Packing Checklist */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-3")}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Packaging Manifest Checklist
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (isFullyPacked) {
                    setCheckedIds([]);
                  } else {
                    setCheckedIds(PACKAGING_CHECKLIST.map((i: ChecklistItem) => i.id));
                  }
                }}
                className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer font-mono"
              >
                {isFullyPacked ? "Reset Checklist" : "Check All"}
              </button>
            </div>

            {PACKAGING_CHECKLIST.map((item: ChecklistItem) => {
              const isChecked = checkedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between transform-gpu will-change-transform",
                    isChecked
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                      : "bg-[#090D16]/60 border-slate-800/80 hover:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-6 rounded-lg flex items-center justify-center transition-colors",
                        isChecked
                          ? "bg-emerald-600 text-white font-black"
                          : "border-2 border-slate-700 text-transparent",
                      )}
                    >
                      {isChecked && <CheckCircle2 className="size-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.detail}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#090D16] border border-slate-800 text-slate-400 shrink-0">
                    {item.code}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Security Advisory */}
          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-amber-400" />
              <span>Tamper-Evident Security Seal</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Once all items are verified, a heavy plastic zip-seal with a laser-engraved 8-digit serial number is locked through the bag zipper eyelets. The serial number is recorded in the Cairo dispatch log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
