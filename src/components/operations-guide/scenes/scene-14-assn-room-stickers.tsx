"use client";

import { useState } from "react";
import {
  Accessibility,
  Clock,
  UserCheck,
  Eye,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene14AssnRoomStickers() {
  const [selectedAccommodation, setSelectedAccommodation] = useState<string>("extra25");

  const accommodationTypes = [
    {
      id: "extra25",
      title: "+25% Extra Time",
      code: "ACC-TIME-25",
      description: "Standard time extension for eligible candidates with processing needs.",
      timing: "94 Minutes (Standard: 75 Min)",
      icon: Clock,
      color: "purple",
    },
    {
      id: "extra50",
      title: "+50% Extra Time",
      code: "ACC-TIME-50",
      description: "Extended time allowance with mandatory 10-minute rest breaks.",
      timing: "112 Minutes (Standard: 75 Min)",
      icon: Clock,
      color: "indigo",
    },
    {
      id: "reader",
      title: "Human Reader / Scribe",
      code: "ACC-READER-01",
      description: "Dedicated reader assistance in a private single-occupancy room.",
      timing: "Standard + Reader Protocols",
      icon: UserCheck,
      color: "blue",
    },
    {
      id: "largeprint",
      title: "Large-Print A3 Booklet",
      code: "ACC-PRINT-A3",
      description: "High-contrast 18pt font examination booklets and magnification tools.",
      timing: "Standard or +25% as registered",
      icon: Eye,
      color: "emerald",
    },
  ];

  const activeAcc =
    accommodationTypes.find((a) => a.id === selectedAccommodation) ||
    accommodationTypes[0];
  const AccIcon = activeAcc.icon;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-purple-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/25">
              Specialized Identification
            </span>
            <span className={GUIDE_THEME.muted}>ASSN Room Stickers</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Special Accommodation Room Stickers
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distinctive high-visibility labeling for special accommodation rooms, featuring time extensions (+25%, +50%) and reader indicators.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs font-mono font-bold text-purple-400 shrink-0">
          <Accessibility className="size-4" />
          <span>Accommodated Category</span>
        </div>
      </div>

      {/* Accommodation Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {accommodationTypes.map((acc) => {
          const isSelected = selectedAccommodation === acc.id;
          const AIcon = acc.icon;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccommodation(acc.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 transform-gpu will-change-transform",
                isSelected
                  ? "bg-[#181126] border-purple-400 text-white shadow-md ring-1 ring-purple-400/40"
                  : "bg-[#0B101B]/80 border-slate-800/80 text-slate-400 hover:text-white hover:border-purple-400/40 hover:bg-[#0F1626]",
              )}
            >
              <div
                className={cn(
                  "size-7 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400",
                )}
              >
                <AIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{acc.title}</div>
                <div className="text-[10px] text-slate-500 font-mono">{acc.code}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Specialized Sticker Rendering */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[400px] shadow-2xl relative">
          {/* ASSN Sticker Card */}
          <div className="w-full max-w-md rounded-2xl bg-[#F8FAFC] text-slate-900 shadow-2xl border-4 border-purple-400/80 p-5 space-y-3 relative overflow-hidden">
            {/* Top Purple High-Visibility Bar */}
            <div className="-mx-5 -mt-5 p-3 px-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Accessibility className="size-5 text-purple-200" />
                <span className="font-black text-sm tracking-wider uppercase">
                  EST 1 • SPECIAL ACCOMMODATION ROOM
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/30 text-purple-200">
                ASSN-SEC
              </span>
            </div>

            {/* Accommodation Highlight Badge */}
            <div className="p-2.5 rounded-xl bg-purple-50 border-2 border-purple-200 flex items-center justify-between text-xs font-bold text-purple-950">
              <div className="flex items-center gap-2">
                <AccIcon className="size-4 text-purple-600" />
                <span>{activeAcc.title}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-600 text-white font-bold">
                {activeAcc.code}
              </span>
            </div>

            {/* Room Location & Tally Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Examination Center</span>
                <span className="font-extrabold text-slate-900">Al Ryada University</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Building &amp; Floor</span>
                <span className="font-extrabold text-slate-900">Building A • Floor 01</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Assigned Classroom</span>
                <span className="font-extrabold text-purple-900 text-sm">Room 105 (ASSN Room)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Accommodated Students</span>
                <span className="font-black text-purple-700 text-sm">Verified Manifest Roster</span>
              </div>
            </div>

            {/* Special Instructions Box */}
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 space-y-1 text-[11px]">
              <div className="text-slate-500 text-[10px] font-semibold uppercase font-mono">Special Operational Instructions:</div>
              <div className="font-mono text-slate-800 text-[10px] leading-relaxed">
                • Allocated Timing: {activeAcc.timing}
                <br />
                • Proctors Assigned: 2 Specialized Accommodation Proctors
                <br />
                • Seating: Minimum 2.5m separation between candidates
              </div>
            </div>

            {/* Footer Barcode */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="font-mono text-[10px] tracking-widest text-slate-600">
                |||| ||||| |||||| ||||| ||| ||||
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-800">
                EST-ASSN-R105-ALLOC
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Operational Comparison */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              ASSN vs Standard Room Differences
            </h4>

            {/* Comparison Item 1 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-purple-400" />
                <span>High-Visibility Purple Header</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                While ordinary room stickers use standard blue headers, ASSN room stickers feature bright purple borders to ensure proctors immediately recognize accommodated testing conditions.
              </p>
            </div>

            {/* Comparison Item 2 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="size-3.5 text-purple-400" />
                <span>Explicit Extra Timing Manifest</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The exact calculated test end time is printed on the sticker, preventing any timing disputes between proctors and candidates during the session.
              </p>
            </div>

            {/* Comparison Item 3 */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-purple-400" />
                <span>Dedicated Envelope Security Seal</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ASSN examination booklets are stored in designated tamper-evident envelopes inside the ASSN bag, never combined with ordinary room files.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
            <span className="font-bold block mb-1 text-purple-300">Human Rights &amp; Equal Access Policy:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every accommodation is strictly audited and cross-checked against official medical documentation before sticker issuance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
