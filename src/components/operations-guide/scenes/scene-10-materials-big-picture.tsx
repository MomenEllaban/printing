"use client";

import { useState } from "react";
import {
  FileText,
  Copy,
  Tag,
  CheckCircle2,
  Accessibility,
  Truck,
  Sparkles,
  ArrowRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene10MaterialsBigPicture() {
  const [selectedPillar, setSelectedPillar] = useState<number>(0);

  const pillars = [
    {
      id: 1,
      title: "Gray Examination Files",
      badge: "Core Container",
      icon: FileText,
      color: "text-slate-300 bg-slate-500/10 border-slate-500/30",
      description:
        "The primary physical protective envelope holding confidential test booklets and bubble answer sheets for every testing room.",
      keyPoints: [
        "Constructed from opaque, moisture-resistant gray polymer",
        "Holds student test booklets and bubble answer sheets",
        "Sealed with tamper-evident security tape at the printing facility",
      ],
    },
    {
      id: 2,
      title: "The Two-Copy Rule",
      badge: "Verification Protocol",
      icon: Copy,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
      description:
        "Strict operational standard where two identical sticker manifests are generated: Copy 1 on the Gray File, and Copy 2 in the Control Dossier.",
      keyPoints: [
        "Copy 1: Affixed directly to the external gray examination file",
        "Copy 2: Placed into the Control Room audit register",
        "Prevents unauthorized substitutions or unrecorded booklet handling",
      ],
    },
    {
      id: 3,
      title: "Subject-Based Printing",
      badge: "Session Logic",
      icon: Tag,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
      description:
        "Stickers and examination files are segregated strictly by subject (Math 1, Math 2, Biology, Physics, Chemistry, Literature) per session.",
      keyPoints: [
        "Color-coded headers for immediate subject recognition",
        "Subject code clearly displayed on room manifests",
        "Differentiates between EST 1 (General) and EST 2 (Subject Tests)",
      ],
    },
    {
      id: 4,
      title: "Student Count Verification",
      badge: "Zero-Discrepancy Rule",
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      description:
        "Automated cross-check ensuring registered students on the official roster exactly match the printed stickers and booklet quantity.",
      keyPoints: [
        "Real-time tally matching before packaging approval",
        "No packet is sealed with mismatched counts",
        "Discrepancies trigger instant supervisor notification",
      ],
    },
    {
      id: 5,
      title: "ASSN Special Room Stickers",
      badge: "Accommodations",
      icon: Accessibility,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      description:
        "Distinctive high-visibility labeling for special accommodation rooms, featuring time extensions (+25%, +50%) and reader indicators.",
      keyPoints: [
        "Purple security badge with accommodation codes",
        "Specifies reader, scribe, or large-font requirements",
        "Ensures proctors apply correct timing allowances",
      ],
    },
    {
      id: 6,
      title: "External Shipping Bags",
      badge: "Final Logistics",
      icon: Truck,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      description:
        "Heavy-duty security transit bags containing all floor packets and control materials, sealed with serial-numbered tags for courier dispatch.",
      keyPoints: [
        "Numbered security seals recorded in transit log",
        "Floor-level transit placards for rapid unloading",
        "Complete chain-of-custody tracking from print facility to center",
      ],
    },
  ];

  const active = pillars[selectedPillar];
  const IconComponent = active.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow2.badge)}>
              Workflow 02 — Overview
            </span>
            <span className={GUIDE_THEME.muted}>The 6 Core Pillars</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Examination Materials, Stickers &amp; External Logistics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Understanding the 6 core operational pillars that ensure confidential test papers reach examination centers with zero errors.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs font-mono font-bold text-blue-400 shrink-0">
          <Layers className="size-4 text-blue-400" />
          <span>6 Operational Pillars</span>
        </div>
      </div>

      {/* Main Grid: 6 Pillars Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map((p, idx) => {
          const isSelected = selectedPillar === idx;
          const PIcon = p.icon;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPillar(idx)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 transform-gpu will-change-transform",
                isSelected
                  ? "bg-[#0E1626] border-blue-400 shadow-xl ring-1 ring-blue-400/40 scale-102"
                  : "bg-[#0B101B]/80 border-slate-800/80 hover:border-blue-400/40 hover:bg-[#0F1626]",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border",
                    p.color,
                  )}
                >
                  {p.badge}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  0{p.id}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center border",
                      p.color,
                    )}
                  >
                    <PIcon className="size-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{p.title}</h4>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isSelected ? "text-blue-400 font-bold" : "text-slate-500",
                  )}
                >
                  {isSelected ? "Active Selection" : "Click to Explore"}
                </span>
                <ArrowRight
                  className={cn(
                    "size-3.5 transition-transform",
                    isSelected ? "translate-x-1 text-blue-400" : "text-slate-600",
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-Dive Inspector Panel for Selected Pillar */}
      <div className={cn(GUIDE_THEME.card, "p-5")}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-10 rounded-xl flex items-center justify-center border",
                active.color,
              )}
            >
              <IconComponent className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Pillar 0{active.id} Deep Dive
                </span>
                <span className="text-slate-700">•</span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {active.badge}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white">
                {active.title}
              </h4>
            </div>
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="size-3.5 text-blue-400" />
            <span>Explored in detail across Scenes 11 – 17</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5">
              Operational Purpose:
            </span>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#090D16]/60 p-3.5 rounded-xl border border-slate-800/80">
              {active.description}
            </p>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5">
              Key Quality Controls:
            </span>
            <ul className="space-y-2">
              {active.keyPoints.map((kp) => (
                <li
                  key={kp}
                  className="text-xs text-slate-300 flex items-start gap-2 bg-[#090D16]/60 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <span className="text-blue-400 font-bold shrink-0">•</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
