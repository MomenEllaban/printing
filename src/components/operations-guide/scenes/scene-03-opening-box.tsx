"use client";

import { useState } from "react";
import {
  PackageOpen,
  Layers,
  Crown,
  HeartPulse,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

interface EnclosureItem {
  id: "floors" | "head" | "assn";
  name: string;
  badge: string;
  badgeTone: "blue" | "amber" | "purple";
  recipient: string;
  summary: string;
  contents: string[];
  icon: typeof Layers;
}

const ENCLOSURES: EnclosureItem[] = [
  {
    id: "floors",
    name: "Floor Examination Bags",
    badge: "Core Operations",
    badgeTone: "blue",
    recipient: "Senior Proctors & Floor Monitors",
    summary:
      "One sealed heavy-duty transit bag per floor in the building. Houses the supervisory Senior Folder and all classroom-level dossiers for that specific level.",
    contents: [
      "Floor 1 Transit Bag (Senior Folder + Room 101–104 Folders)",
      "Floor 2 Transit Bag (Senior Folder + Room 201–204 Folders)",
      "Floor 3 Transit Bag (Senior Folder + Room 301–304 Folders)",
    ],
    icon: Layers,
  },
  {
    id: "head",
    name: "Head / Control Bag",
    badge: "Building HQ",
    badgeTone: "amber",
    recipient: "Chief Proctor & Building Control Team",
    summary:
      "The command center portfolio. Retained strictly in the building control headquarters for custody tracking, roll call, and incident resolution.",
    contents: [
      "Master Building Control Register",
      "Emergency Reserve Packet Manifest",
      "Building Proctor Sign-in Roster",
      "Chain of Custody Transmittal Form",
    ],
    icon: Crown,
  },
  {
    id: "assn",
    name: "ASSN Accommodations Bag",
    badge: "Conditional Inclusion",
    badgeTone: "purple",
    recipient: "Special Accommodations Staff",
    summary:
      "Prepared exclusively when the center hosts verified special accommodations (extended time, large print, readers, or specialized medical cases).",
    contents: [
      "Special Case Candidate Registers",
      "Enlarged Print Question Booklets",
      "Reader / Scribe Proctor Guidelines",
      "Accommodated Timing Protocol Sheets",
    ],
    icon: HeartPulse,
  },
];

export function Scene03OpeningBox() {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string>("floors");

  const activeEnclosure =
    ENCLOSURES.find((e) => e.id === selectedEnclosureId) || ENCLOSURES[0];

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow1.badge)}>
              Internal Box Architecture
            </span>
            <span className={GUIDE_THEME.muted}>Carton Packing Protocol</span>
          </div>
          <p className="text-sm font-bold text-white">
            Unboxing the Master Carton: 3 Segregated Operational Enclosures
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md transform-gpu will-change-transform",
            isOpen ? GUIDE_THEME.btnSecondary : GUIDE_THEME.btnPrimary,
          )}
        >
          <PackageOpen className="size-4" />
          <span>{isOpen ? "Close Box Flaps" : "Open Box Flaps"}</span>
        </button>
      </div>

      {/* 3D Box Open Simulation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Box Top-Down Cutaway View */}
        <div className="lg:col-span-7 h-[380px] sm:h-[420px] rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Spotlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />

          {/* Box Outer Kraft Rim */}
          <div className="relative w-full h-full rounded-xl border-2 border-amber-900/40 bg-[#14120E] p-4 flex flex-col justify-between shadow-inner">
            {/* Box Flap Overlays when Closed */}
            {!isOpen && (
              <div className="absolute inset-0 z-20 rounded-xl bg-gradient-to-br from-[#1C1711] via-[#16120D] to-[#0F0C08] border border-amber-800/30 flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in fade-in duration-300">
                <span className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold mb-3 shadow-lg">
                  📦
                </span>
                <h4 className="text-base font-extrabold text-white tracking-wide">SEALED MASTER CARTON</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                  Sealed with serialized tamper-evident security tape. Click &quot;Open Box Flaps&quot; above to inspect the interior enclosures.
                </p>
              </div>
            )}

            {/* Interior Header Tag */}
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400/90 border-b border-amber-900/30 pb-2.5">
              <span className="tracking-wider">INTERIOR COMPARTMENTS — BUILDING A</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                EST 1 CUSTODY
              </span>
            </div>

            {/* Internal 3 Enclosure Objects */}
            <div className="grid grid-cols-3 gap-3 my-auto z-10">
              {/* 1. Floor Bags Enclosure */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("floors")}
                className={cn(
                  "p-3.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-44 transform-gpu will-change-transform",
                  selectedEnclosureId === "floors"
                    ? "bg-blue-500/15 border-blue-400/80 shadow-lg shadow-blue-500/10 scale-102 ring-1 ring-blue-400/50"
                    : "bg-[#0B101B]/90 border-slate-800 hover:border-slate-700 hover:bg-[#0F1626]",
                )}
              >
                <div className="size-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
                  <Layers className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-blue-400 font-bold block uppercase tracking-wider">
                    Enclosure 01
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">Floor Bags</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 font-mono font-bold border border-blue-500/20">
                  3 Floor Bags
                </span>
              </button>

              {/* 2. Head / Control Bag */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("head")}
                className={cn(
                  "p-3.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-44 transform-gpu will-change-transform",
                  selectedEnclosureId === "head"
                    ? "bg-amber-500/15 border-amber-400/80 shadow-lg shadow-amber-500/10 scale-102 ring-1 ring-amber-400/50"
                    : "bg-[#0B101B]/90 border-slate-800 hover:border-slate-700 hover:bg-[#0F1626]",
                )}
              >
                <div className="size-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
                  <Crown className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase tracking-wider">
                    Enclosure 02
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">Control Bag</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono font-bold border border-amber-500/20">
                  Chief Custody
                </span>
              </button>

              {/* 3. ASSN Bag */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("assn")}
                className={cn(
                  "p-3.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-44 transform-gpu will-change-transform",
                  selectedEnclosureId === "assn"
                    ? "bg-purple-500/15 border-purple-400/80 shadow-lg shadow-purple-500/10 scale-102 ring-1 ring-purple-400/50"
                    : "bg-[#0B101B]/90 border-slate-800 hover:border-slate-700 hover:bg-[#0F1626]",
                )}
              >
                <div className="size-11 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-inner">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-purple-400 font-bold block uppercase tracking-wider">
                    Enclosure 03
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">ASSN Bag</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-mono font-bold border border-purple-500/20">
                  Conditional
                </span>
              </button>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center pt-2 border-t border-amber-900/30">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="size-3" /> VERIFIED CUSTODY
              </span>
              <span>PACKED BY AUDIT DEPUTY</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Enclosure Deep-Dive Inspector */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md border",
                  activeEnclosure.badgeTone === "blue" && "bg-blue-500/10 text-blue-400 border-blue-500/30",
                  activeEnclosure.badgeTone === "amber" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  activeEnclosure.badgeTone === "purple" && "bg-purple-500/10 text-purple-400 border-purple-500/30",
                )}
              >
                {activeEnclosure.badge}
              </span>
              <span className={GUIDE_THEME.muted}>Package Details</span>
            </div>

            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <activeEnclosure.icon className="size-5 text-amber-400" />
              <span>{activeEnclosure.name}</span>
            </h3>

            <div className={cn(GUIDE_THEME.cardInner, "p-3 space-y-1")}>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Target Recipient
              </span>
              <span className="font-bold text-slate-100 text-xs">{activeEnclosure.recipient}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeEnclosure.summary}
            </p>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Enclosed Items & Documents:
              </span>
              <ul className="space-y-2">
                {activeEnclosure.contents.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-200 p-2.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80"
                  >
                    <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Next: Head / Control Bag breakdown</span>
            <ChevronRight className="size-4 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
