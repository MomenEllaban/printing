"use client";

import { useState } from "react";
import {
  PackageOpen,
  Layers,
  Crown,
  HeartPulse,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface EnclosureItem {
  id: "floors" | "head" | "assn";
  name: string;
  badge: string;
  badgeColor: string;
  recipient: string;
  summary: string;
  contents: string[];
  icon: typeof Layers;
}

const ENCLOSURES: EnclosureItem[] = [
  {
    id: "floors",
    name: "Floor Examination Bags",
    badge: "Mandatory Core",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    recipient: "Senior Proctors & Floor Monitors",
    summary:
      "One sealed heavy-duty bag per floor in the building. Contains the supervisory Senior Folder and all assigned room folders for that level.",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    recipient: "Chief Proctor & Building Control Team",
    summary:
      "The command center bag. Retained strictly in the building control room for operational supervision and official custody logs.",
    contents: [
      "Master Control Register (سجل الكنترول)",
      "Emergency Seal Log Sheet",
      "Building Proctor Sign-in Roster",
      "Chain of Custody Transmittal Form",
    ],
    icon: Crown,
  },
  {
    id: "assn",
    name: "ASSN Bag (Accommodations)",
    badge: "Conditional Inclusion",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    recipient: "Special Accommodations Staff",
    summary:
      "Prepared ONLY when the building hosts verified special needs candidates (e.g., visual accommodation, extra time, or medical cases).",
    contents: [
      "Special Case Student Registers",
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
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
            Internal Box Architecture
          </span>
          <p className="text-sm font-extrabold text-white">
            Unboxing the Master Carton: 3 Segregated Operational Packages
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md",
            isOpen
              ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25",
          )}
        >
          <PackageOpen className="size-4" />
          <span>{isOpen ? "Close Box Flaps" : "Open Box Flaps"}</span>
        </button>
      </div>

      {/* 3D Box Open Simulation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Box Top-Down Cutaway View */}
        <div className="lg:col-span-7 h-[360px] sm:h-[400px] rounded-3xl bg-slate-950 border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Box Outer Rim */}
          <div className="relative w-full h-full rounded-2xl border-4 border-amber-900/60 bg-amber-950/40 p-4 flex flex-col justify-between shadow-inner">
            {/* Box Flap Overlays when Closed */}
            {!isOpen && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-gradient-to-br from-amber-800 to-amber-950 flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in fade-in duration-300">
                <span className="size-14 rounded-full bg-amber-900/80 border border-amber-600/40 flex items-center justify-center text-amber-300 text-xl font-bold mb-2 shadow-lg">
                  📦
                </span>
                <h4 className="text-base font-black text-amber-100">SEALED MASTER CARTON</h4>
                <p className="text-xs text-amber-300/70 max-w-xs mt-1">
                  Sealed with tamper-evident security tape. Click "Open Box Flaps" above to inspect the interior enclosures.
                </p>
              </div>
            )}

            {/* Interior Header Tag */}
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400/80 border-b border-amber-800/40 pb-2">
              <span>INTERIOR COMPARTMENTS — BUILDING A</span>
              <span>EST 1 CUSTODY</span>
            </div>

            {/* Internal 3 Enclosure Objects */}
            <div className="grid grid-cols-3 gap-3 my-auto z-10">
              {/* 1. Floor Bags Enclosure */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("floors")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-40",
                  selectedEnclosureId === "floors"
                    ? "bg-blue-600/30 border-blue-400 shadow-xl shadow-blue-500/20 scale-105 ring-2 ring-blue-500/40"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700",
                )}
              >
                <div className="size-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Layers className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-blue-300 font-bold block">ENCLOSURE 1</span>
                  <span className="text-xs font-black text-white block mt-0.5">Floor Bags</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                  3 Bags
                </span>
              </button>

              {/* 2. Head / Control Bag */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("head")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-40",
                  selectedEnclosureId === "head"
                    ? "bg-amber-600/30 border-amber-400 shadow-xl shadow-amber-500/20 scale-105 ring-2 ring-amber-500/40"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700",
                )}
              >
                <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Crown className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-amber-300 font-bold block">ENCLOSURE 2</span>
                  <span className="text-xs font-black text-white block mt-0.5">Control Bag</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  Chief Custody
                </span>
              </button>

              {/* 3. ASSN Bag */}
              <button
                type="button"
                onClick={() => setSelectedEnclosureId("assn")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-40",
                  selectedEnclosureId === "assn"
                    ? "bg-purple-600/30 border-purple-400 shadow-xl shadow-purple-500/20 scale-105 ring-2 ring-purple-500/40"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700",
                )}
              >
                <div className="size-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-purple-300 font-bold block">ENCLOSURE 3</span>
                  <span className="text-xs font-black text-white block mt-0.5">ASSN Bag</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  Conditional
                </span>
              </button>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center pt-2 border-t border-amber-800/40">
              <span>STATUS: INSPECTED & PACKED</span>
              <span>VERIFIED BY CONTROL DEPUTY</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Enclosure Deep-Dive Inspector */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border",
                  activeEnclosure.badgeColor,
                )}
              >
                {activeEnclosure.badge}
              </span>
              <span className="text-xs text-slate-400 font-bold">Enclosure Details</span>
            </div>

            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <activeEnclosure.icon className="size-5 text-indigo-400" />
              <span>{activeEnclosure.name}</span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Recipient</span>
              <span className="font-bold text-white">{activeEnclosure.recipient}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeEnclosure.summary}
            </p>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Enclosed Items & Documents:
              </span>
              <ul className="space-y-1.5">
                {activeEnclosure.contents.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-slate-200 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40"
                  >
                    <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Next: Detailed breakdown of each bag</span>
            <ChevronRight className="size-4 text-indigo-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
