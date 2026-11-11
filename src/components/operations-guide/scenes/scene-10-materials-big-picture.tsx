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

export function Scene10MaterialsBigPicture() {
  const [selectedPillar, setSelectedPillar] = useState<number>(0);

  const pillars = [
    {
      id: 1,
      title: "Gray Examination Files",
      badge: "Core Container",
      icon: FileText,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
      description:
        "The primary physical protective envelope holding the confidential exam test booklets and bubble answer sheets for every testing room.",
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
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
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
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
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
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
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
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
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
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      description:
        "Heavy-duty security transit bags containing all floor packets and control materials, sealed with serial-numbered tags for courier dispatch to Cairo.",
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Workflow 02 — Overview
            </span>
            <span className="text-xs text-muted">The 6 Pillars</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Examination Materials, Stickers & External Shipping Bags
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Understanding the 6 core operational pillars that ensure confidential test papers reach examination centers with zero errors.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-strong border border-border text-xs font-semibold text-muted">
          <Layers className="size-4 text-indigo-500" />
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
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "bg-slate-900 border-indigo-500 shadow-xl ring-2 ring-indigo-500/20 scale-102"
                  : "bg-surface border-border hover:border-indigo-400/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${p.color}`}
                >
                  {p.badge}
                </span>
                <span className="text-xs font-mono font-bold text-muted">
                  0{p.id}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center border ${p.color}`}
                  >
                    <PIcon className="size-4" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{p.title}</h4>
                </div>
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span
                  className={
                    isSelected ? "text-indigo-400 font-bold" : "text-muted"
                  }
                >
                  {isSelected ? "Active Selection" : "Click to Explore"}
                </span>
                <ArrowRight
                  className={`size-3.5 transition-transform ${
                    isSelected ? "translate-x-1 text-indigo-400" : "text-muted"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-Dive Inspector Panel for Selected Pillar */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-xl flex items-center justify-center border ${active.color}`}
            >
              <IconComponent className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-muted uppercase">
                  Pillar 0{active.id} Deep Dive
                </span>
                <span className="text-muted/40">•</span>
                <span className="text-xs font-bold text-indigo-500">
                  {active.badge}
                </span>
              </div>
              <h4 className="text-base font-black text-foreground">
                {active.title}
              </h4>
            </div>
          </div>

          <span className="text-xs text-muted flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-500" />
            <span>Explored in detail in Scenes 11 – 17</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-bold text-muted block mb-1.5">
              Operational Purpose:
            </span>
            <p className="text-xs text-foreground/80 leading-relaxed">
              {active.description}
            </p>
          </div>

          <div>
            <span className="text-xs font-bold text-muted block mb-1.5">
              Key Quality Controls:
            </span>
            <ul className="space-y-1">
              {active.keyPoints.map((kp) => (
                <li
                  key={kp}
                  className="text-xs text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-indigo-500 font-bold shrink-0">•</span>
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

